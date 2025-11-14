import React, { useRef, useEffect, useState } from "react";
import axios from "@tools/axios.tool";
import { useToast } from "@components/Toast";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";

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
  const [livenessFailed, setLivenessFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [livenessDetails, setLivenessDetails] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ text: string; hint?: string }>
  >([]);
  const [detectionStatus, setDetectionStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  const [livenessStatus, setLivenessStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  // const toast = useToast();
  // refs for debouncing motion detection
  const motionCountRef = useRef(0);
  const noMotionCountRef = useRef(0);
  const stableMotionRef = useRef(false);
  const capturingRef = useRef(false);
  const lastAutoCheckRef = useRef(0);
  const MOTION_THRESHOLD = 3; // consecutive frames to consider motion
  const NO_MOTION_THRESHOLD = 6; // consecutive frames to consider motion ended
  const AUTO_CHECK_COOLDOWN_MS = 10000; // 10s cooldown between automatic checks

  // useEffect(() => {
  //   let mounted = true;
  //   const start = async () => {
  //     try {
  //       const stream = await navigator.mediaDevices.getUserMedia({
  //         video: true,
  //         audio: false,
  //       });
  //       if (videoRef.current) {
  //         videoRef.current.srcObject = stream;
  //         try {
  //           await (videoRef.current.play() as Promise<void>);
  //         } catch (e: any) {
  //           if (e && e.name !== "AbortError")
  //             console.error("video play error", e);
  //         }
  //       }
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };
  //   start();

  //   let rafId = 0;
  //   const detect = () => {
  //     try {
  //       if (!videoRef.current || !canvasRef.current) {
  //         rafId = requestAnimationFrame(detect);
  //         return;
  //       }

  //       const video = videoRef.current;
  //       const canvas = canvasRef.current;
  //       const ctx = canvas.getContext("2d", { willReadFrequently: true });
  //       if (!ctx) {
  //         rafId = requestAnimationFrame(detect);
  //         return;
  //       }

  //       canvas.width = video.videoWidth || 320;
  //       canvas.height = video.videoHeight || 240;
  //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  //       const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  //       const prev = (canvas as any)._prevData as Uint8ClampedArray | undefined;
  //       let diff = 0;
  //       if (prev && prev.length === data.length) {
  //         for (let i = 0; i < data.length; i += 4 * 10) {
  //           const d =
  //             Math.abs(data[i] - prev[i]) +
  //             Math.abs(data[i + 1] - prev[i + 1]) +
  //             Math.abs(data[i + 2] - prev[i + 2]);
  //           if (d > 30) diff++;
  //         }
  //       }
  //       (canvas as any)._prevData = new Uint8ClampedArray(data);
  //       const detected = diff > 20;

  //       // update hysteresis counters using refs to avoid excessive setState calls
  //       if (detected) {
  //         motionCountRef.current = motionCountRef.current + 1;
  //         noMotionCountRef.current = 0;
  //       } else {
  //         noMotionCountRef.current = noMotionCountRef.current + 1;
  //         motionCountRef.current = 0;
  //       }

  //       // determine stable motion state
  //       if (
  //         !stableMotionRef.current &&
  //         motionCountRef.current >= MOTION_THRESHOLD
  //       ) {
  //         stableMotionRef.current = true;
  //         if (mounted) setMotionDetected(true);

  //         // auto-trigger a capture/check if not already capturing and cooldown elapsed
  //         const now = Date.now();
  //         if (
  //           !capturingRef.current &&
  //           now - lastAutoCheckRef.current > AUTO_CHECK_COOLDOWN_MS
  //         ) {
  //           lastAutoCheckRef.current = now;
  //           // schedule capture in next event loop tick to avoid re-entrancy inside RAF
  //           setTimeout(() => {
  //             // double-check capturingRef to avoid race
  //             if (!capturingRef.current) captureAndSend().catch(() => {});
  //           }, 50);
  //         }
  //       } else if (
  //         stableMotionRef.current &&
  //         noMotionCountRef.current >= NO_MOTION_THRESHOLD
  //       ) {
  //         stableMotionRef.current = false;
  //         if (mounted) setMotionDetected(false);
  //       }
  //     } catch (e) {
  //       console.error(e);
  //     }
  //     rafId = requestAnimationFrame(detect);
  //   };
  //   rafId = requestAnimationFrame(detect);

  //   return () => {
  //     mounted = false;
  //     cancelAnimationFrame(rafId);
  //     if (videoRef.current && videoRef.current.srcObject) {
  //       const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
  //       tracks.forEach((t) => t.stop());
  //     }
  //   };
  // }, []);

  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    capturingRef.current = true;
    // reset phase UI
    setDetectionStatus("running");
    setLivenessStatus("idle");
    setLivenessFailed(false);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return setCapturing(false);

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const basePath = apiUrl ? `${apiUrl}` : "";
      const endpoint = basePath
        ? `${basePath}/api/class-session/${classSessionId}/attendance${
            userId ? "?userId=" + userId : ""
          }`
        : `/api/class-session/${classSessionId}/attendance${
            userId ? "?userId=" + userId : ""
          }`;

      // Step A: call face-service /analyze to show detection + liveness phases
      const faceServiceBase = "http://localhost:5001";
      // Normalize common dev host 0.0.0.0 -> localhost because browsers cannot connect to 0.0.0.0
      const normalizeHost = (u: string) => {
        if (!u) return u;
        try {
          // replace host 0.0.0.0 with localhost, preserve scheme and port
          return u.replace(/:\/\/0\.0\.0\.0(\:?\d*)/, "://localhost$1");
        } catch (e) {
          return u;
        }
      };
      const faceServiceBaseNormalized = normalizeHost(faceServiceBase);
      // prefer a dedicated face service path if configured, otherwise fall back to API server analyze proxy
      const analyzeEndpoint = faceServiceBaseNormalized
        ? `${faceServiceBaseNormalized}/analyze`
        : `/analyze`;

      setDetectionStatus("running");
      setLivenessStatus("running");

      let analyzeResp: any = null;
      try {
        const a = await axios.post(analyzeEndpoint, {
          imageBase64: dataUrl.split(",")[1],
          wantDescriptor: true,
        });
        analyzeResp = a?.data || null;
      } catch (e: any) {
        console.error("Analyze call failed", e);
        // if dev server returned 404 for /analyze (no proxy), try the face-service default host
        const isNotFound =
          e?.response?.status === 404 ||
          String(e?.message || "").includes("404");
        if (!faceServiceBase && isNotFound) {
          try {
            const fallback = "http://0.0.0.0:5001/analyze";
            const b = await axios.post(fallback, {
              imageBase64: dataUrl.split(",")[1],
              wantDescriptor: true,
            });
            analyzeResp = b?.data || null;
          } catch (ee) {
            console.error("Fallback analyze (localhost:5001) failed", ee);
            analyzeResp = null;
          }
        } else {
          analyzeResp = null;
        }
      }

      if (!analyzeResp) {
        const detailMsg =
          "Face Analysis Failed:\n" +
          "• Face detection failed (no valid face found)\n" +
          "• Liveness check failed (unable to verify real person)";
        console.log("detailMsg", detailMsg);
        setDetectionStatus("failed");
        setLivenessStatus("failed");
        setMessage(detailMsg);

        setCapturing(false);
        capturingRef.current = false;

        toast.error(detailMsg, {
          position: "top-right",
          autoClose: 4000,
        });

        return;
      }

      console.log("analyzeResp", analyzeResp);
      // update UI based on analyze response
      const det = analyzeResp.detection || {};
      const liv = analyzeResp.liveness || {};
      setDetectionStatus(det.ok ? "success" : "failed");
      setLivenessStatus(liv.ok ? "success" : "failed");

      // if either phase failed, show details and abort attendance record
      if (!det.ok || !liv.ok) {
        const msg = !det.ok
          ? "Face not detected. Please look at the camera."
          : "Liveness check failed. Please try again.";

        toast.error(msg, { autoClose: 3000, theme: "colored" });

        setMessage(msg);

        setCapturing(false);
        capturingRef.current = false;
        return;
      }

      // Step B: both phases passed -> proceed to record attendance via existing API endpoint
      const resp = await axios.post(endpoint, {
        imageBase64: dataUrl.split(",")[1],
        analyzeMetrics: analyzeResp,
      });
      const json = resp?.data;

      if (!json) {
        setDetectionStatus("failed");
        setLivenessStatus("failed");
        setMessage("No response data from server");
      } else if (json && json.data) {
        try {
          const info = json.data;
          console.log("info", info);
          // try to extract analysis metrics (backend may return object or note string)
          let analyzeMap: Record<string, any> = {};
          try {
            if (
              info.analyzeMetrics &&
              typeof info.analyzeMetrics === "object"
            ) {
              analyzeMap = info.analyzeMetrics;
            } else if (info.note && typeof info.note === "string") {
              // parse note into map (reuse existing parsing logic)
              const note = String(info.note || "");
              const normalized = note
                .replace(/[,|]/g, ";")
                .replace(/\s+/g, " ");
              const parts = normalized
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean);
              parts.forEach((p: string) => {
                const re = /([a-zA-Z0-9_]+)=([^;]+)/g;
                let m: RegExpExecArray | null;
                while ((m = re.exec(p)) !== null) {
                  const k = m[1];
                  let v: any = m[2] || "";
                  v = v.trim();
                  analyzeMap[k] = v;
                }
              });
            }
          } catch (e) {
            // ignore parse failures
          }
          console.log("analyzeMap", analyzeMap);
          // determine detection status
          const descLenRaw =
            analyzeMap["descriptor_len"] ??
            analyzeMap["descriptorLen"] ??
            info.descriptor_len ??
            info.descriptorLen;
          const descLen =
            typeof descLenRaw === "string" ? Number(descLenRaw) : descLenRaw;
          const detectionOk = descLen && Number(descLen) > 0;
          setDetectionStatus(detectionOk ? "success" : "failed");

          // determine liveness status
          const status = String(info.status || "").toUpperCase();
          const livenessFlag =
            analyzeMap["liveness"] ??
            analyzeMap["isLive"] ??
            analyzeMap["live"];
          const livenessFailedNow =
            status === "FAKE_DETECTED" ||
            livenessFlag === "false" ||
            livenessFlag === false;
          setLivenessStatus(livenessFailedNow ? "failed" : "success");

          // user-friendly messages
          if (info.isPassed || info.status === "PRESENT") {
            setLivenessFailed(false);
            setLivenessDetails(null);
            setMessage("Marked present — attendance recorded.");
            setDone(true);
            try {
              if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (
                  videoRef.current.srcObject as MediaStream
                ).getTracks();
                tracks.forEach((t) => t.stop());
                videoRef.current.srcObject = null;
              }
            } catch (e) {
              // ignore stop errors
            }
            if (typeof onSuccess === "function") onSuccess(info);
          } else {
            // parse note for helpful hints - make parser tolerant to missing semicolons or extra whitespace
            const note = String(info.note || "");
            const map: Record<string, string> = {};
            // Normalize separators: replace commas and pipes with semicolon, keep '=' as key/value
            const normalized = note.replace(/[,|]/g, ";").replace(/\s+/g, " ");
            // split by semicolon and also try to recover key=value pairs where possible
            const parts = normalized
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean);
            parts.forEach((p: string) => {
              // Sometimes the server may append multiple key=val pairs without semicolons
              // e.g. "descriptor_len=128;usedAI=true;minDistance=1.003...liveness=false"
              // Try to match all key=value occurrences in the fragment
              const re = /([a-zA-Z0-9_]+)=([^;]+)/g;
              let m: RegExpExecArray | null;
              while ((m = re.exec(p)) !== null) {
                const k = m[1];
                let v = m[2] || "";
                v = v.trim();
                map[k] = v;
              }
            });

            // detect liveness failure
            const status = String(info.status || "");
            if (status === "FAKE_DETECTED" || map["liveness"] === "false") {
              setLivenessFailed(true);
              const ld = `descriptor_len=${
                map["descriptor_len"] || "-"
              }; usedAI=${map["usedAI"] || "-"}; blinkProb=${
                map["blinkProb"] || "-"
              }; yawDelta=${map["yawDelta"] || "-"}; minDistance=${
                map["minDistance"] || "-"
              }`;
              setLivenessDetails(ld);
            } else {
              setLivenessFailed(false);
              setLivenessDetails(null);
            }

            if (map["descriptor_len"] === "0") {
              if (map["usedAI"] === "true") {
                setMessage(
                  "Face could not be extracted from the image. Please try again in a well-lit environment or contact support."
                );
              } else {
                setMessage(
                  "No face detected. Please turn on your camera, improve lighting, and try again."
                );
              }
            } else if (map["minDistance"] && map["minDistance"] !== "-") {
              setMessage(
                `Face does not match the registered data. Please align your face straight to the camera or re-enroll your face.`
              );
              toast.error(
                `Face does not match the registered data. Please align your face straight to the camera or re-enroll your face.`
              );
            } else {
              setMessage(
                "Unable to record attendance. Please try again or re-enroll your face."
              );

              // build targeted suggestions based on debug map
              const s: Array<{ text: string; hint?: string }> = [];
              // if liveness failed, suggest specific actions
              if (map["liveness"] === "false" || status === "FAKE_DETECTED") {
                // blinkProb might be 'true'/'false' or numeric
                const bp = map["blinkProb"];
                if (
                  bp === "false" ||
                  bp === undefined ||
                  bp === "-" ||
                  bp === null
                ) {
                  s.push({
                    text: "Nháy mắt chậm 1–2 lần khi thử lại.",
                    hint: "Nháy mắt hoàn toàn (đóng rồi mở), đừng chớp quá nhanh.",
                  });
                } else if (bp === "true" || Number(bp) > 0.5) {
                  // good blink prob — no need to suggest blink
                }
                const yd = map["yawDelta"];
                if (yd !== undefined && yd !== null) {
                  const ydNum = Number(yd);
                  if (!isNaN(ydNum) && Math.abs(ydNum) < 6) {
                    s.push({
                      text: "Quay nhẹ đầu trái/phải để hệ thống quan sát chuyển động mặt.",
                      hint: "Quay khoảng 10–20° sang trái hoặc phải và giữ trong ~0.5s.",
                    });
                  }
                }
              }

              // if no descriptor extracted
              if (map["descriptor_len"] === "0") {
                s.push({
                  text: "Không phát hiện khuôn mặt — tiến lại gần camera, đảm bảo ánh sáng tốt, và gỡ bỏ kính phản chiếu/ mũ nón.",
                  hint: "Đưa mặt vào giữa khung hình, khoảng cách ~30–60cm, đảm bảo mặt chiếm phần lớn khung.",
                });
              }

              // if distance exists but is '-' or large, suggest repositioning/re-enroll
              if (
                map["minDistance"] === "-" ||
                (map["minDistance"] && Number(map["minDistance"]) > 0.6)
              ) {
                s.push({
                  text: "Không khớp — hãy đưa mặt thẳng về phía camera hoặc đăng ký lại khuôn mặt trong trang Hồ sơ.",
                  hint: "Giữ mặt thẳng, tránh góc nghiêng, và nếu cần hãy đăng ký khuôn mặt mới trong Profile.",
                });
              }

              // remove duplicates and set
              // de-duplicate by text
              const uniqMap = new Map<
                string,
                { text: string; hint?: string }
              >();
              s.forEach((it) => uniqMap.set(it.text, it));
              const uniq = Array.from(uniqMap.values());
              setSuggestions(uniq);
              // show toasts for suggestions
              if (uniq.length > 0 && toast && toast.show) {
                uniq.forEach((sug, idx) => {
                  // stagger toasts slightly
                  setTimeout(() => toast.show(sug.text, "error"), idx * 600);
                });
              }
            }
            // also keep debug info available
            setMessage((prev) => prev + "\n\nDebug: " + note);
          }
        } catch (e) {
          setMessage("Failed to parse server response");
        }
      } else {
        setMessage("No response data");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to send");
    } finally {
      setCapturing(false);
      capturingRef.current = false;
    }
  };
  function onResults(results: any) {
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Debug: inspect detection payload shape (uncomment when needed)
    // console.log('onResults detections', results.detections);

    // Use the video's displayed size (clientWidth/Height) so the overlay matches
    // the CSS layout. Use devicePixelRatio to make the canvas crisp on high-DPI screens.
    const dpr = window.devicePixelRatio || 1;
    const displayW = Math.max(1, video.clientWidth || video.videoWidth || 640);
    const displayH = Math.max(
      1,
      video.clientHeight || video.videoHeight || 480
    );

    // Set canvas internal pixel size according to DPR, and set CSS size so it fills
    // the same area as the video element.
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);

    // Reset any existing transform and scale for DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Clear the drawing surface (use CSS size coords)
    ctx.clearRect(0, 0, displayW, displayH);

    if (!results || !results.detections || results.detections.length === 0)
      return;

    results.detections.forEach((detection: any) => {
      // Support multiple possible bbox shapes depending on mediapipe version:
      // - detection.locationData.relativeBoundingBox { xMin, yMin, width, height }
      // - detection.boundingBox { xCenter, yCenter, width, height }
      // - detection.boundingBox (normalized coordinates)
      let box: any = null;
      if (
        detection.locationData &&
        detection.locationData.relativeBoundingBox
      ) {
        box = detection.locationData.relativeBoundingBox;
        // xMin/yMin/width/height are normalized [0..1]
        const x = (box.xMin || 0) * displayW;
        const y = (box.yMin || 0) * displayH;
        const w = (box.width || 0) * displayW;
        const h = (box.height || 0) * displayH;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = Math.max(2, 3 * (displayW / 640));
        ctx.strokeRect(x, y, w, h);
      } else if (detection.boundingBox) {
        // some builds expose boundingBox with center coords
        const b = detection.boundingBox;
        // if boundingBox contains xCenter/yCenter/width/height in normalized coords
        if (b.xCenter !== undefined && b.yCenter !== undefined) {
          const w = (b.width || 0) * displayW;
          const h = (b.height || 0) * displayH;
          const x = (b.xCenter || 0) * displayW - w / 2;
          const y = (b.yCenter || 0) * displayH - h / 2;
          ctx.strokeStyle = "lime";
          ctx.lineWidth = Math.max(2, 3 * (displayW / 640));
          ctx.strokeRect(x, y, w, h);
        }
      } else {
        // fallback: try any numeric bbox-like keys
        const keys = ["xMin", "yMin", "width", "height"];
        const maybe = {} as any;
        keys.forEach((k) => {
          if (detection[k] !== undefined) maybe[k] = detection[k];
        });
        if (maybe.xMin !== undefined) {
          const x = (maybe.xMin || 0) * displayW;
          const y = (maybe.yMin || 0) * displayH;
          const w = (maybe.width || 0) * displayW;
          const h = (maybe.height || 0) * displayH;
          ctx.strokeStyle = "lime";
          ctx.lineWidth = Math.max(2, 3 * (displayW / 640));
          ctx.strokeRect(x, y, w, h);
        }
      }
    });
  }

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const setCanvasSize = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.addEventListener("loadedmetadata", setCanvasSize);
    return () => video.removeEventListener("loadedmetadata", setCanvasSize);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const faceDetection = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    faceDetection.setOptions({
      model: "short", // hoặc "full"
      minDetectionConfidence: 0.6,
    });
    faceDetection.onResults(onResults);

    const camera = new Camera(videoRef.current!, {
      onFrame: async () => {
        await faceDetection.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480,
    });

    camera.start();
  }, []);

  // if attendance done, hide the whole capture UI
  if (done) return null;

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm space-y-3 max-w-3xl mx-auto">
      <ToastContainer />
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`w-3 h-3 rounded-full ${
            motionDetected ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <span
          className={`font-medium ${
            motionDetected ? "text-green-600" : "text-gray-500"
          }`}
        >
          {motionDetected ? "Motion detected" : "No motion detected"}
        </span>
      </div>

      {/* Khung camera */}
      <div className="relative w-full max-w-[700px] mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-black">
        {/* <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        /> */}
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Phase badges: detection + liveness */}
        <div className="absolute top-3 left-3 flex gap-2 z-20">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                detectionStatus === "running"
                  ? "bg-yellow-400"
                  : detectionStatus === "success"
                  ? "bg-green-400"
                  : detectionStatus === "failed"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`}
            ></span>
            <span>Detection</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                livenessStatus === "running"
                  ? "bg-yellow-400"
                  : livenessStatus === "success"
                  ? "bg-green-400"
                  : livenessStatus === "failed"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`}
            ></span>
            <span>Anti-spoof</span>
          </div>
        </div>

        {/* <div className="absolute inset-0 flex items-center justify-center">
          <svg width="100%" height="100%">
            <defs>
              <mask id="mask">
                <rect width="100%" height="100%" fill="white" />
                <circle cx="50%" cy="50%" r="180" fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.45)"
              mask="url(#mask)"
            />
          </svg>
        </div>

        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border-[5px] transition-all duration-300 ${
            motionDetected
              ? "border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.7)]"
              : "border-gray-500"
          }`}
        ></div>

        <div className="absolute bottom-4 w-full text-center text-white text-sm font-medium drop-shadow-md">
          Keep your face inside the circle and ensure good lighting{" "}
        </div> */}
      </div>

      {/* <canvas ref={canvasRef} className="hidden" /> */}

      {/* Nút thao tác */}
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        <button
          onClick={captureAndSend}
          disabled={capturing}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {capturing ? "Sending..." : "Mark attendance"}
        </button>

        {livenessFailed && (
          <button
            onClick={captureAndSend}
            disabled={capturing}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-60"
          >
            {capturing ? "Đang thử lại..." : "Retry Anti-Spoof"}
          </button>
        )}
      </div>

      {/* Anti-spoof warning */}
      {livenessFailed && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-400 mt-2">
          <div className="font-semibold text-yellow-800">
            ❗ Anti-spoof check failed
          </div>
          <ul className="list-disc ml-5 mt-1 text-sm text-yellow-700 space-y-1">
            <li>Ensure good lighting and look directly at the camera.</li>
            <li>Blink slowly or gently turn your head left/right.</li>
            <li>Remove reflective glasses or hats.</li>
          </ul>
        </div>
      )}

      {/* Debug info */}
      {/* {message && (
        <details className="bg-gray-50 p-2 rounded text-xs text-gray-700 whitespace-pre-wrap">
          <summary className="cursor-pointer font-semibold text-gray-600">
            Debug Info
          </summary>
          {message}
        </details>
      )} */}

      {/* Gợi ý */}
      {/* {suggestions.length > 0 && (
        <div className="mt-2 bg-gray-50 p-3 rounded-lg">
          <div className="font-medium text-sm mb-1">💡 Gợi ý:</div>
          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
            {suggestions.map((s, i) => (
              <li key={i}>
                <div>{s.text}</div>
                {s.hint && (
                  <div className="text-xs text-gray-500">{s.hint}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )} */}
    </div>
  );
};

export default AttendanceCapture;
