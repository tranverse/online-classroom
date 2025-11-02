import React, { useRef, useEffect, useState } from "react";

interface Props {
  classSessionId: string;
  userId?: string;
  apiUrl?: string;
  onSuccess?: (attendance: any) => void;
}

const AttendanceCapture: React.FC<Props> = ({
  classSessionId,
  userId,
  apiUrl,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionDetected, setMotionDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await (videoRef.current.play() as Promise<void>);
          } catch (e: any) {
            if (e && e.name !== "AbortError")
              console.error("video play error", e);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    start();

    let rafId = 0;
    const detect = () => {
      try {
        if (!videoRef.current || !canvasRef.current) {
          rafId = requestAnimationFrame(detect);
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          rafId = requestAnimationFrame(detect);
          return;
        }

        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const prev = (canvas as any)._prevData as Uint8ClampedArray | undefined;
        let diff = 0;
        if (prev && prev.length === data.length) {
          for (let i = 0; i < data.length; i += 4 * 10) {
            const d =
              Math.abs(data[i] - prev[i]) +
              Math.abs(data[i + 1] - prev[i + 1]) +
              Math.abs(data[i + 2] - prev[i + 2]);
            if (d > 30) diff++;
          }
        }
        (canvas as any)._prevData = new Uint8ClampedArray(data);
        const detected = diff > 20;
        if (mounted) setMotionDetected(detected);
      } catch (e) {
        console.error(e);
      }
      rafId = requestAnimationFrame(detect);
    };
    rafId = requestAnimationFrame(detect);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return setCapturing(false);

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const token = localStorage.getItem("token");
      const basePath = apiUrl ? `${apiUrl}` : "";
      const endpoint = basePath
        ? `${basePath}/api/class-session/${classSessionId}/attendance${
            userId ? "?userId=" + userId : ""
          }`
        : `/api/class-session/${classSessionId}/attendance${
            userId ? "?userId=" + userId : ""
          }`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: dataUrl.split(",")[1] }),
      });

      if (!res.ok) {
        setMessage(`HTTP ${res.status} ${res.statusText}`);
      } else {
        let json: any = null;
        try {
          const text = await res.text();
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          console.error("Failed to parse JSON response", e);
        }

        if (json && json.data) {
          setMessage(JSON.stringify(json.data));
          try {
            const info = json.data;
            if (info.isPassed || info.status === "PRESENT")
              if (typeof onSuccess === "function") onSuccess(info);
          } catch (e) {
            // ignore
          }
        } else {
          setMessage("No response data");
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to send");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="p-2 border rounded">
      <div className="flex gap-2 items-center mb-2">
        <div
          className={`w-3 h-3 rounded-full ${
            motionDetected ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <span>{motionDetected ? "Motion detected" : "No motion"}</span>
      </div>

      <video ref={videoRef} className="w-full rounded bg-black" playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="flex gap-2 mt-2">
        <button
          onClick={captureAndSend}
          disabled={capturing}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          {capturing ? "Sending..." : "Mark Attendance"}
        </button>
        <button
          onClick={() => {
            if (canvasRef.current) {
              const a = document.createElement("a");
              a.href = canvasRef.current.toDataURL();
              a.download = "capture.png";
              a.click();
            }
          }}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Download
        </button>
      </div>

      {message && (
        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">{message}</pre>
      )}
    </div>
  );
};

export default AttendanceCapture;
