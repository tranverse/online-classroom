import React, { useRef, useEffect, useState } from "react";
import axios from "@tools/axios.tool";
import { useToast } from "@components/Toast";

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
  const toast = useToast();
  // refs for debouncing motion detection
  const motionCountRef = useRef(0);
  const noMotionCountRef = useRef(0);
  const stableMotionRef = useRef(false);
  const capturingRef = useRef(false);
  const lastAutoCheckRef = useRef(0);
  const MOTION_THRESHOLD = 3; // consecutive frames to consider motion
  const NO_MOTION_THRESHOLD = 6; // consecutive frames to consider motion ended
  const AUTO_CHECK_COOLDOWN_MS = 10000; // 10s cooldown between automatic checks

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

        // update hysteresis counters using refs to avoid excessive setState calls
        if (detected) {
          motionCountRef.current = motionCountRef.current + 1;
          noMotionCountRef.current = 0;
        } else {
          noMotionCountRef.current = noMotionCountRef.current + 1;
          motionCountRef.current = 0;
        }

        // determine stable motion state
        if (
          !stableMotionRef.current &&
          motionCountRef.current >= MOTION_THRESHOLD
        ) {
          stableMotionRef.current = true;
          if (mounted) setMotionDetected(true);

          // auto-trigger a capture/check if not already capturing and cooldown elapsed
          const now = Date.now();
          if (
            !capturingRef.current &&
            now - lastAutoCheckRef.current > AUTO_CHECK_COOLDOWN_MS
          ) {
            lastAutoCheckRef.current = now;
            // schedule capture in next event loop tick to avoid re-entrancy inside RAF
            setTimeout(() => {
              // double-check capturingRef to avoid race
              if (!capturingRef.current) captureAndSend().catch(() => {});
            }, 50);
          }
        } else if (
          stableMotionRef.current &&
          noMotionCountRef.current >= NO_MOTION_THRESHOLD
        ) {
          stableMotionRef.current = false;
          if (mounted) setMotionDetected(false);
        }
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
        setDetectionStatus("failed");
        setLivenessStatus("failed");
        setMessage("Face analysis failed (no response)");
        setCapturing(false);
        capturingRef.current = false;
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
        setMessage(
          `Analysis: detection=${det.ok ? "ok" : "fail"}; liveness=${
            liv.ok ? "ok" : "fail"
          }`
        );
        // expose liveness debug
        setLivenessDetails(
          `score=${liv.score ?? "-"}; lbp=${liv.lbp ?? "-"}; blink=${
            liv.blink ?? "-"
          }`
        );
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
                  "Không thể trích xuất khuôn mặt từ ảnh. Vui lòng chụp lại ở nơi có ánh sáng tốt hơn hoặc liên hệ hỗ trợ."
                );
              } else {
                setMessage(
                  "Hệ thống không phát hiện khuôn mặt. Vui lòng bật camera, tăng ánh sáng, và thử lại."
                );
              }
            } else if (map["minDistance"] && map["minDistance"] !== "-") {
              setMessage(
                `Không khớp với dữ liệu đăng ký. Khoảng cách gần nhất: ${map["minDistance"]}. Hãy thử điều chỉnh vị trí mặt, chụp thẳng vào camera, hoặc đăng ký lại khuôn mặt.`
              );
            } else {
              setMessage(
                "Không thể đối sánh điểm danh. Vui lòng thử lại hoặc đăng ký khuôn mặt (Enroll)."
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

  // if attendance done, hide the whole capture UI
  if (done) return null;

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm space-y-3 max-w-3xl mx-auto">
      {/* Header: Trạng thái chuyển động */}
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
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />

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

        {/* Overlay mờ xung quanh, chừa giữa tròn vừa phải */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="100%" height="100%">
            <defs>
              <mask id="mask">
                <rect width="100%" height="100%" fill="white" />
                <circle cx="50%" cy="50%" r="180" fill="black" />
                {/* 👆 khung nhỏ hơn để vừa khung camera */}
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

        {/* Vòng tròn hướng dẫn */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border-[5px] transition-all duration-300 ${
            motionDetected
              ? "border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.7)]"
              : "border-gray-500"
          }`}
        ></div>

        {/* Hướng dẫn */}
        <div className="absolute bottom-4 w-full text-center text-white text-sm font-medium drop-shadow-md">
          Keep your face inside the circle and ensure good lighting{" "}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Nút thao tác */}
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        <button
          onClick={captureAndSend}
          disabled={capturing}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {capturing ? "Đang gửi..." : "Điểm danh"}
        </button>

        {livenessFailed && (
          <button
            onClick={captureAndSend}
            disabled={capturing}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-60"
          >
            {capturing ? "Đang thử lại..." : "Thử lại Anti-Spoof"}
          </button>
        )}

        <button
          onClick={() => {
            if (canvasRef.current) {
              const a = document.createElement("a");
              a.href = canvasRef.current.toDataURL();
              a.download = "capture.png";
              a.click();
            }
          }}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition"
        >
          Tải ảnh
        </button>
      </div>

      {/* Anti-spoof warning */}
      {livenessFailed && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-400 mt-2">
          <div className="font-semibold text-yellow-800">
            ❗ Anti-spoof check failed
          </div>
          <ul className="list-disc ml-5 mt-1 text-sm text-yellow-700 space-y-1">
            <li>Đảm bảo ánh sáng tốt và nhìn thẳng vào camera.</li>
            <li>Chớp mắt chậm hoặc xoay nhẹ đầu trái/phải.</li>
            <li>Tháo kính phản chiếu hoặc mũ.</li>
          </ul>
          {livenessDetails && (
            <div className="text-xs mt-2 text-gray-600">
              Debug: {livenessDetails}
            </div>
          )}
        </div>
      )}

      {/* Debug info */}
      {message && (
        <details className="bg-gray-50 p-2 rounded text-xs text-gray-700 whitespace-pre-wrap">
          <summary className="cursor-pointer font-semibold text-gray-600">
            Debug Info
          </summary>
          {message}
        </details>
      )}

      {/* Gợi ý */}
      {suggestions.length > 0 && (
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
      )}
    </div>
  );
};

export default AttendanceCapture;
