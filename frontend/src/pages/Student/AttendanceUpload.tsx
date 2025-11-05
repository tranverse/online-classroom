import React, { useEffect, useRef, useState } from "react";
import StudentService from "../../services/student.service";
import { useToast } from "../../components/Toast";
import { Camera, Upload } from "lucide-react";
// face-api.js is loaded dynamically from CDN to avoid requiring npm install
const MODEL_PATH = "/models"; // put face-api models under public/models

async function loadFaceApi(): Promise<any> {
  // If already loaded as global
  if ((window as any).faceapi) return (window as any).faceapi;

  // load from CDN
  const scriptUrl =
    "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load face-api.js from CDN"));
    document.head.appendChild(s);
  });

  if (!(window as any).faceapi)
    throw new Error("faceapi not available after loading script");
  return (window as any).faceapi;
}

const AttendanceUpload: React.FC = () => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const faceapi = await loadFaceApi();
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        ]);
        if (mounted) setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // start camera on demand
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      console.warn("Camera access denied", err);
      toast?.show ? toast.show("Camera access denied", "error") : null;
    }
  };

  const stopCamera = () => {
    const tracks = (videoRef.current?.srcObject as MediaStream)?.getTracks?.();
    tracks?.forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopCamera();
    };
  }, []);

  const captureFromVideo = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) throw new Error("No video/canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<string>((res) =>
      canvas.toBlob((b) => res(URL.createObjectURL(b!)))
    );
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  };

  const calcDescriptorFromImageEl = async (
    imgEl: HTMLImageElement | HTMLVideoElement
  ) => {
    // detectSingleFace and compute descriptor
    const faceapi = await loadFaceApi();
    const detection = await faceapi
      .detectSingleFace(imgEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) throw new Error("No face detected");
    return detection.descriptor; // Float32Array
  };

  const descriptorToArray = (d: Float32Array) =>
    Array.from(d as any) as number[];

  // primary verify flow: capture from camera (or use uploaded file), compute descriptor, send to backend verify
  const onVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!modelsLoaded) {
      toast?.show
        ? toast.show("Face models not loaded yet", "error")
        : console.warn("Toast provider missing: Face models not loaded yet");
      return;
    }

    try {
      setVerifying(true);
      let descriptor: Float32Array | null = null;

      if (photoPreview) {
        // use uploaded preview image
        const img = new Image();
        img.src = photoPreview;
        await new Promise((r) => (img.onload = r));
        descriptor = await calcDescriptorFromImageEl(img);
      } else if (videoRef.current) {
        // capture frame from video
        const blobUrl = await captureFromVideo();
        const img = new Image();
        img.src = blobUrl;
        await new Promise((r) => (img.onload = r));
        descriptor = await calcDescriptorFromImageEl(img);
      } else {
        return toast.show("No image or camera available", "error");
      }

      if (!descriptor) throw new Error("Failed to compute descriptor");

      // send descriptor array to backend via StudentService.verifyAttendance
      const arr = descriptorToArray(descriptor);
      const res = await StudentService.verifyAttendance(
        arr /* classSessionId? studentId? */
      );
      if (res?.matched) {
        toast?.show
          ? toast.show("Attendance verified", "success")
          : console.info("Attendance verified (no toast)");
        // optional: clear preview
        setPhotoPreview(null);
      } else {
        toast?.show
          ? toast.show(
              `Not matched (distance=${res?.distance ?? "?"})`,
              "error"
            )
          : console.warn(`Not matched (distance=${res?.distance ?? "?"})`);
      }
    } catch (err: any) {
      console.error(err);
      toast.show(err?.message || "Verification failed", "error");
    } finally {
      setVerifying(false);
    }
  };

  const onSubmitPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = document.getElementById("photo") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      toast?.show
        ? toast.show("Pick a photo first", "error")
        : console.warn("Pick a photo first");
      return;
    }

    try {
      setUploading(true);
      await StudentService.uploadAttendancePhoto(file);
      toast?.show
        ? toast.show("Attendance recorded (server fallback)", "success")
        : console.info("Attendance recorded (server fallback)");
      setPhotoPreview(null);
      if (input) input.value = "";
    } catch (err: any) {
      console.error("Upload failed", err);
      toast?.show
        ? toast.show("Upload failed", "error")
        : console.warn("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
          Attendance Upload
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold mb-6 text-green-700 flex items-center gap-2">
            <Camera size={22} />
            Attendance Check-in
          </h2>

          <div className="space-y-5">
            <label className="block text-gray-700 font-medium mb-1">
              Use camera to take a selfie (recommended)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">Camera</div>
                  <div className="flex gap-2">
                    {!cameraOn ? (
                      <button
                        onClick={startCamera}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Start Camera
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="px-3 py-1 bg-red-500 text-white rounded"
                      >
                        Stop Camera
                      </button>
                    )}
                  </div>
                </div>

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-56 object-cover rounded-xl border border-gray-200 ${
                    !cameraOn ? "opacity-50" : ""
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // snapshot preview from camera
                      captureFromVideo().then((url) => setPhotoPreview(url));
                    }}
                    disabled={!cameraOn}
                    className={`px-3 py-2 ${
                      !cameraOn
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 text-white"
                    } rounded`}
                  >
                    Capture
                  </button>
                  <button
                    onClick={onVerify}
                    disabled={!modelsLoaded || verifying || !cameraOn}
                    className={`px-3 py-2 rounded text-white ${
                      !modelsLoaded || verifying || !cameraOn
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {verifying ? "Verifying..." : "Verify from Camera"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-gray-700 font-medium mb-1">
                  Or upload a selfie image
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition-all duration-200"
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-56 object-cover rounded-xl shadow-md border border-gray-200"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={onVerify}
                    disabled={!modelsLoaded || verifying}
                    className={`px-3 py-2 rounded text-white ${
                      !modelsLoaded || verifying
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {verifying ? "Verifying..." : "Verify uploaded image"}
                  </button>
                  <form onSubmit={onSubmitPhoto} className="inline">
                    <button
                      type="submit"
                      disabled={uploading}
                      className={`px-3 py-2 rounded text-white ${
                        uploading
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {uploading ? "Uploading..." : "Upload (fallback)"}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {!modelsLoaded && (
              <div className="text-sm text-yellow-600">
                Loading face models...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceUpload;
