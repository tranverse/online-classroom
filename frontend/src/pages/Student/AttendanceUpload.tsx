import React, { useEffect, useRef, useState } from "react";
import StudentService from "../../services/student.service";
import { useToast } from "../../components/Toast";
import { Camera, Upload } from "lucide-react";
// face-api.js is loaded dynamically from CDN to avoid requiring npm install
// We'll try multiple model base URLs (local first, then known CDNs) so the app
// can fetch weights from the network if local hosting isn't available.
const MODEL_CANDIDATES = [
  "/models",
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights",
  "https://unpkg.com/face-api.js@0.22.2/weights",
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights",
];

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
    s.onload = () => {
      // give library a short tick to attach to window
      setTimeout(() => resolve(), 50);
    };
    s.onerror = () => reject(new Error("Failed to load face-api.js from CDN"));
    document.head.appendChild(s);
  });

  // Wait up to ~6s for the global to appear
  const start = Date.now();
  while (!(window as any).faceapi && Date.now() - start < 6000) {
    // small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!(window as any).faceapi)
    throw new Error("faceapi not available after loading script");
  return (window as any).faceapi;
}

const AttendanceUpload: React.FC = () => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lastVerifyDebug, setLastVerifyDebug] = useState<any | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const toast = useToast();
  const [verified, setVerified] = useState(false);

  // NOTE: do not automatically attach classSessionId to uploads here.
  // This upload UI is intended for uploading sample images / data only.
  // If you need to persist attendance for a specific session, call
  // StudentService.uploadAttendancePhoto(file, classSessionId) from the
  // session-specific UI instead.

  // quick check whether a model base actually serves JSON manifests (not an HTML 404)
  const checkModelBase = async (base: string) => {
    const manifest = "face_recognition_model-weights_manifest.json";
    const url = `${base.replace(/\/$/, "")}/${manifest}`;
    try {
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) return { ok: false, reason: `status=${r.status}` };
      const text = await r.text();
      if (text.trim().startsWith("<"))
        return { ok: false, reason: "html returned" };
      try {
        JSON.parse(text);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: "invalid json" };
      }
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  };
  useEffect(() => {
    setVerified(false);
  }, [photoPreview]);
  // validate that a File contains a detectable face (uses client models)
  const validateImageHasFace = async (f: File) => {
    if (!modelsLoaded) return { ok: false, reason: "models_not_loaded" };
    try {
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise((r) => (img.onload = r));
      // reuse calcDescriptorFromImageEl; it will throw if no face
      await calcDescriptorFromImageEl(img);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: String(err?.message || err) };
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setModelsError(null);
        const faceapi = await loadFaceApi();
        // try each candidate until one succeeds; pre-check manifest to avoid HTML/404
        let loaded = false;
        const tried: string[] = [];
        for (const base of MODEL_CANDIDATES) {
          const chk = await checkModelBase(base);
          if (!chk.ok) {
            tried.push(`${base} (${chk.reason})`);
            continue;
          }
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(base),
              faceapi.nets.ssdMobilenetv1.loadFromUri(base),
              faceapi.nets.faceLandmark68Net.loadFromUri(base),
              faceapi.nets.faceRecognitionNet.loadFromUri(base),
            ]);
            loaded = true;
            break;
          } catch (e) {
            console.warn("model load failed for", base, e);
            tried.push(`${base} (load error)`);
          }
        }
        if (!loaded) throw new Error(`models_load_failed: ${tried.join(", ")}`);
        if (mounted) {
          setModelsLoaded(true);
          setModelsError(null);
        }
      } catch (err) {
        console.error("Failed to load face-api models", err);
        const msg =
          err &&
          (err as any).message &&
          (err as any).message.includes("Unexpected token '<'")
            ? "Không tải được model face-api: server trả về trang HTML. Nếu bạn host /models locally, tải weights hoặc cho phép CDN."
            : "Failed to load face-api models. Ensure /models is available or allow CDN access.";
        if (mounted) {
          setModelsLoaded(false);
          setModelsError(msg as string);
        }
        if (toast && toast.show) {
          // show a shorter toast but keep detailed message in the UI
          toast.show(msg, "error");
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const retryLoadModels = async () => {
    setModelsError(null);
    setModelsLoaded(false);
    try {
      const faceapi = await loadFaceApi();
      let loaded = false;
      const tried: string[] = [];
      for (const base of MODEL_CANDIDATES) {
        const chk = await checkModelBase(base);
        if (!chk.ok) {
          tried.push(`${base} (${chk.reason})`);
          continue;
        }
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(base),
            faceapi.nets.ssdMobilenetv1.loadFromUri(base),
            faceapi.nets.faceLandmark68Net.loadFromUri(base),
            faceapi.nets.faceRecognitionNet.loadFromUri(base),
          ]);
          loaded = true;
          break;
        } catch (e) {
          console.warn("retry model load failed for", base, e);
          tried.push(`${base} (load error)`);
        }
      }
      if (!loaded) throw new Error(`models_load_failed: ${tried.join(", ")}`);
      setModelsLoaded(true);
      setModelsError(null);
      toast?.show ? toast.show("Models loaded", "success") : null;
    } catch (err) {
      console.error("Retry load failed", err);
      const msg =
        err &&
        (err as any).message &&
        (err as any).message.includes("Unexpected token '<'")
          ? "Không tải được model face-api: server trả về trang HTML. Nếu bạn host /models locally, tải weights hoặc cho phép CDN."
          : "Failed to load face-api models. Ensure /models is available or allow CDN access.";
      setModelsError(msg);
      toast?.show ? toast.show(msg, "error") : null;
    }
  };

  // start camera on demand
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
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

  // live detection: poll the video and set faceDetected flag so Verify is only enabled when a face is visible
  useEffect(() => {
    let mounted = true;
    let timer: any = null;
    const runDetection = async () => {
      if (!mounted) return;
      // Don't attempt detection until models are loaded
      if (!modelsLoaded) {
        setFaceDetected(false);
        // poll again later to see if models become ready
        timer = setTimeout(runDetection, 700);
        return;
      }
      if (!cameraOn || !videoRef.current) {
        setFaceDetected(false);
        timer = setTimeout(runDetection, 700);
        return;
      }
      try {
        const faceapi = await loadFaceApi();
        if (!faceapi || !faceapi.nets) return;
        const tinyOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 256,
          scoreThreshold: 0.3,
        });
        const det = await faceapi.detectSingleFace(
          videoRef.current as any,
          tinyOptions
        );
        if (mounted) setFaceDetected(!!det);
      } catch (e) {
        // ignore
      } finally {
        timer = setTimeout(runDetection, 700);
      }
    };
    runDetection();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [cameraOn]);

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
    const faceapi = await loadFaceApi();

    // Check models availability
    const tinyLoaded = faceapi.nets?.tinyFaceDetector?.params != null;
    const ssdLoaded = faceapi.nets?.ssdMobilenetv1?.params != null;
    const landmarkLoaded = faceapi.nets?.faceLandmark68Net?.params != null;
    const recNetLoaded = faceapi.nets?.faceRecognitionNet?.params != null;

    if (!tinyLoaded || !landmarkLoaded || !recNetLoaded) {
      throw new Error(
        "Face models not fully loaded yet. Please wait a moment."
      );
    }

    // Try TinyFaceDetector first
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.4,
    });

    let detection = await faceapi
      .detectSingleFace(imgEl, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // try a looser tiny detector
    if (!detection) {
      const tinyLoose = new faceapi.TinyFaceDetectorOptions({
        inputSize: 256,
        scoreThreshold: 0.25,
      });
      detection = await faceapi
        .detectSingleFace(imgEl, tinyLoose)
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    // fallback to SSD if available
    if (!detection && ssdLoaded) {
      try {
        detection = await faceapi
          .detectSingleFace(imgEl, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();
      } catch (err: unknown) {
        console.warn("SSD fallback failed:", (err as any)?.message ?? err);
      }
    }

    if (!detection) {
      const msg =
        "Không tìm thấy khuôn mặt. Vui lòng chụp rõ mặt, xoay đầu/dịch chuyển camera hoặc thử ảnh khác.";
      console.log(msg);
      throw new Error("No face detected");
    }

    return detection.descriptor;
  };

  const descriptorToArray = (d: Float32Array) =>
    Array.from(d as any) as number[];

const onVerify = async (e?: React.FormEvent) => {
  e?.preventDefault();

  if (!modelsLoaded) {
    toast?.show
      ? toast.show(
          "Face detection models are still loading. Please wait a moment.",
          "error"
        )
      : console.warn("Toast provider missing: Face models not loaded yet");
    return;
  }

  try {
    setVerifying(true);
    let descriptor: Float32Array | null = null;
    let imgEl: HTMLImageElement | null = null;

    // ----- CASE 1: Uploaded photo -----
    if (photoPreview) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = photoPreview;
      await new Promise((r) => (img.onload = r));
      imgEl = img;

      try {
        descriptor = await calcDescriptorFromImageEl(img);
      } catch {}
    }

    // ----- CASE 2: Capture from webcam -----
    else if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      // Capture full resolution from video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blobUrl = canvas.toDataURL("image/jpeg", 0.95);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = blobUrl;
      await new Promise((r) => (img.onload = r));

      imgEl = img;

      try {
        descriptor = await calcDescriptorFromImageEl(img);
      } catch {}
    }

    // No image source
    else {
      return toast.show("No image or camera source available.", "error");
    }

    // Debug info
    const debugInfo: any = {};
    debugInfo.descriptor_len = descriptor ? descriptor.length : 0;

    if (!imgEl) throw new Error("Failed to obtain image element");

    // ----- ALWAYS send full-size image -----
    const canvas = document.createElement("canvas");
    const w = imgEl.naturalWidth;
    const h = imgEl.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");

    ctx.drawImage(imgEl, 0, 0, w, h);

    // Higher quality image for API
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    setLastVerifyDebug(debugInfo);

    // Call API
    const res = await StudentService.verifyFaceQuality(dataUrl);

    setLastVerifyDebug((prev: any) => ({ ...prev, server: res }));

    if (res?.valid) {
      toast?.show
        ? toast.show(
            "Face detected successfully. This image is suitable for enrollment.",
            "success"
          )
        : console.info("Face verified (no toast)");

      setVerified(true);
    } else {
      const message =
        res?.message ||
        res?.humanMessageVi ||
        "The face could not be verified. Please try again with better lighting or clearer face.";

      toast?.show ? toast.show(message, "error") : console.warn(message);
      setVerified(false);
    }
  } catch (err: any) {
    console.error(err);
    const msg = err?.message || "Face quality check failed";

    if (
      msg.toLowerCase().includes("no face detected") ||
      msg.toLowerCase().includes("failed to compute descriptor")
    ) {
      setLastVerifyDebug({
        descriptor_len: 0,
        usedAI: false,
        minDistance: "-",
      });

      toast.show(
        "No face detected in the image. Make sure your face is clearly visible, with good lighting, and centered in the frame. Try again.",
        "error"
      );
    } else {
      toast.show(msg, "error");
    }
  } finally {
    setVerifying(false);
  }
};

  const onSubmitPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = document.getElementById("photo") as HTMLInputElement | null;
    let file = input?.files?.[0] ?? null;
    // fallback: if user captured a preview (camera snapshot) but didn't re-select a file
    if (!file && photoPreview) {
      try {
        const res = await fetch(photoPreview);
        const blob = await res.blob();
        // create a File so backend sees a filename/content-type
        file = new File([blob], "capture.jpg", {
          type: blob.type || "image/jpeg",
        });
      } catch (err) {
        console.error("Failed to fetch preview blob", err);
      }
    }

    if (!file) {
      toast?.show
        ? toast.show("Pick a photo first", "error")
        : console.warn("Pick a photo first");
      return;
    }

    if (modelsLoaded) {
      const check = await validateImageHasFace(file);
      if (!check.ok) {
        // do not auto-upload if no face found
        if (check.reason === "models_not_loaded") {
          toast?.show
            ? toast.show(
                "Models chưa sẵn sàng để kiểm tra ảnh. Bấm Retry models hoặc sử dụng Upload (fallback).",
                "error"
              )
            : null;
        } else {
          toast?.show
            ? toast.show(
                "Ảnh không chứa khuôn mặt hợp lệ. Vui lòng chọn/chụp lại ảnh rõ mặt.",
                "error"
              )
            : null;
        }
        return;
      }
    } else {
      // If models aren't loaded, inform user they can still upload as fallback
      toast?.show
        ? toast.show(
            "Models chưa tải xong - upload sẽ dùng server để phân tích (fallback).",
            "info"
          )
        : null;
    }
    try {
      setUploading(true);
      // compress/resize if large
      const toUpload = await (async () => {
        try {
          return await resizeImage(file, 1024, 0.8);
        } catch (e) {
          return file;
        }
      })();
      // if user opted to save as attendance, include the provided session id
      const shouldSaveAttendance = (
        document.getElementById("saveAttendance") as HTMLInputElement | null
      )?.checked;
      const sessionIdInput = (
        document.getElementById("sessionId") as HTMLInputElement | null
      )?.value;
      const resp = await StudentService.uploadAttendancePhoto(
        toUpload,
        shouldSaveAttendance && sessionIdInput ? sessionIdInput : undefined
      );
      const serverMsg =
        resp?.data?.humanMessageVi ||
        resp?.message ||
        resp?.data?.message ||
        "Attendance recorded (server fallback)";
      toast?.show ? toast.show(serverMsg, "success") : console.info(serverMsg);
      // record server response in debug box
      setLastVerifyDebug((p: any) => ({
        ...(p || {}),
        upload: {
          success: true,
          server: resp,
          analyzeMetrics:
            resp?.data?.analyzeMetrics ?? resp?.data?.attendance?.note ?? null,
        },
      }));
      setPhotoPreview(null);
      if (input) input.value = "";
    } catch (err: any) {
      console.error("Upload failed", err);
      const msg =
        err?.message || err?.response?.data?.message || "Upload failed";
      toast?.show
        ? toast.show(`Upload failed: ${msg}`, "error")
        : console.warn("Upload failed", msg);
      setLastVerifyDebug((p: any) => ({
        ...(p || {}),
        upload: { success: false, error: msg },
      }));
    } finally {
      setUploading(false);
    }
  };

  // resize/compress image File via canvas, returns a new File
  const resizeImage = async (file: File, maxDim = 1024, quality = 0.8) => {
    return new Promise<File>(async (resolve, reject) => {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((r) => (img.onload = r));
        const { width, height } = img;
        let targetW = width;
        let targetH = height;
        if (Math.max(width, height) > maxDim) {
          if (width > height) {
            targetW = maxDim;
            targetH = Math.round((height / width) * maxDim);
          } else {
            targetH = maxDim;
            targetW = Math.round((width / height) * maxDim);
          }
        }
        const c = document.createElement("canvas");
        c.width = targetW;
        c.height = targetH;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        c.toBlob(
          (b) => {
            if (!b) return reject(new Error("Failed to compress"));
            const newFile = new File([b], file.name, { type: "image/jpeg" });
            resolve(newFile);
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4 flex justify-center items-center">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* === LEFT: Camera Preview === */}
        <div className="bg-gray-900 text-white flex flex-col justify-center items-center p-6 relative">
          <h3 className="text-lg font-semibold mb-3 text-center">
            Live Camera
          </h3>

          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-700">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                !cameraOn ? "opacity-40 grayscale" : ""
              }`}
            />

            {/* Overlay hướng dẫn */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-48 h-48 md:w-56 md:h-56 rounded-full border-4 ${
                  faceDetected
                    ? "border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.8)]"
                    : "border-white/40"
                }`}
              />
            </div>
            <p className="absolute bottom-3 text-sm font-medium w-full text-center text-white/80">
              Align your face inside the circle
            </p>
          </div>

          {/* Camera control buttons */}
          <div className="flex gap-3 mt-6">
            {!cameraOn ? (
              <button
                onClick={startCamera}
                className="px-5 py-2 bg-blue-600 rounded-full hover:bg-blue-700 text-white font-medium"
              >
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="px-5 py-2 bg-red-500 rounded-full hover:bg-red-600 text-white font-medium"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => {
                captureFromVideo().then((url) => setPhotoPreview(url));
              }}
              disabled={!cameraOn}
              className={`px-5 py-2 rounded-full font-medium ${
                !cameraOn
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              Capture
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* === RIGHT: Upload & Actions === */}
        <div className="p-8 md:p-10 flex flex-col justify-center space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <Camera size={22} className="text-green-600" />
            Upload or Enroll Selfie
          </h2>

          <div className="space-y-4">
            <label className="block text-gray-700 font-medium">
              Upload a selfie image
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition"
            />

            {photoPreview && (
              <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden border shadow-md">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={onVerify}
              disabled={!modelsLoaded || verifying}
              className={`px-5 py-2 rounded-full text-white font-medium ${
                !modelsLoaded || verifying
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {verifying ? "Verifying..." : "Verify Image"}
            </button>

            <button
              onClick={async () => {
                if (!verified) return;

                // enroll captured preview or selected file
                let file =
                  (document.getElementById("photo") as HTMLInputElement | null)
                    ?.files?.[0] ?? null;
                if (!file && photoPreview) {
                  try {
                    const res = await fetch(photoPreview);
                    const blob = await res.blob();
                    file = new File([blob], "capture.jpg", {
                      type: blob.type || "image/jpeg",
                    });
                  } catch (e) {
                    console.error("Failed to fetch preview blob for enroll", e);
                  }
                }
                if (!file)
                  return toast?.show
                    ? toast.show("Không có ảnh để enroll", "error")
                    : null;
                let sendFile = file;
                try {
                  sendFile = await resizeImage(file, 1024, 0.8);
                } catch (e) {
                  // ignore and use original
                }
                const r = await StudentService.enrollSelf(sendFile);
                if (r) {
                  toast?.show
                    ? toast.show("Enroll thành công", "success")
                    : null;
                  // update debug info
                  setLastVerifyDebug((p: any) => ({
                    ...(p || {}),
                    enroll: r,
                  }));
                } else {
                  toast?.show ? toast.show("Enroll thất bại", "error") : null;
                }
              }}
              disabled={!verified}
              className={`px-3 py-2 rounded text-white ${
                !verified
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              Enroll face
            </button>
          </div>

          {!modelsLoaded && (
            <div className="text-sm text-yellow-600 text-center md:text-left">
              Loading face models...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceUpload;
