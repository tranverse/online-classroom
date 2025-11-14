declare module "face-api.js";

  // const captureAndSend = async () => {
  //   if (!videoRef.current || !canvasRef.current) return;
  //   setCapturing(true);
  //   capturingRef.current = true;
  //   // reset phase UI
  //   setDetectionStatus("running");
  //   setLivenessStatus("idle");
  //   setLivenessFailed(false);
  //   const video = videoRef.current;
  //   const canvas = canvasRef.current;
  //   const ctx = canvas.getContext("2d", { willReadFrequently: true });
  //   if (!ctx) return setCapturing(false);

  //   canvas.width = video.videoWidth || 640;
  //   canvas.height = video.videoHeight || 480;
  //   ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  //   const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

  //   try {
  //     const basePath = apiUrl ? `${apiUrl}` : "";
  //     const endpoint = basePath
  //       ? `${basePath}/api/class-session/${classSessionId}/attendance${
  //           userId ? "?userId=" + userId : ""
  //         }`
  //       : `/api/class-session/${classSessionId}/attendance${
  //           userId ? "?userId=" + userId : ""
  //         }`;

  //     // Step A: call face-service /analyze to show detection + liveness phases
  //     const faceServiceBase = "http://localhost:5001";
  //     // Normalize common dev host 0.0.0.0 -> localhost because browsers cannot connect to 0.0.0.0
  //     const normalizeHost = (u: string) => {
  //       if (!u) return u;
  //       try {
  //         // replace host 0.0.0.0 with localhost, preserve scheme and port
  //         return u.replace(/:\/\/0\.0\.0\.0(\:?\d*)/, "://localhost$1");
  //       } catch (e) {
  //         return u;
  //       }
  //     };
  //     const faceServiceBaseNormalized = normalizeHost(faceServiceBase);
  //     // prefer a dedicated face service path if configured, otherwise fall back to API server analyze proxy
  //     const analyzeEndpoint = faceServiceBaseNormalized
  //       ? `${faceServiceBaseNormalized}/analyze`
  //       : `/analyze`;

  //     setDetectionStatus("running");
  //     setLivenessStatus("running");

  //     let analyzeResp: any = null;
  //     try {
  //       const a = await axios.post(analyzeEndpoint, {
  //         imageBase64: dataUrl.split(",")[1],
  //         wantDescriptor: true,
  //       });
  //       analyzeResp = a?.data || null;
  //     } catch (e: any) {
  //       console.error("Analyze call failed", e);
  //       // if dev server returned 404 for /analyze (no proxy), try the face-service default host
  //       const isNotFound =
  //         e?.response?.status === 404 ||
  //         String(e?.message || "").includes("404");
  //       if (!faceServiceBase && isNotFound) {
  //         try {
  //           const fallback = "http://0.0.0.0:5001/analyze";
  //           const b = await axios.post(fallback, {
  //             imageBase64: dataUrl.split(",")[1],
  //             wantDescriptor: true,
  //           });
  //           analyzeResp = b?.data || null;
  //         } catch (ee) {
  //           console.error("Fallback analyze (localhost:5001) failed", ee);
  //           analyzeResp = null;
  //         }
  //       } else {
  //         analyzeResp = null;
  //       }
  //     }

  //     if (!analyzeResp) {
  //       setDetectionStatus("failed");
  //       setLivenessStatus("failed");
  //       setMessage("Face analysis failed (no response)");
  //       setCapturing(false);
  //       capturingRef.current = false;
  //       return;
  //     }
  //     console.log("analyzeResp", analyzeResp);
  //     // update UI based on analyze response
  //     const det = analyzeResp.detection || {};
  //     const liv = analyzeResp.liveness || {};
  //     setDetectionStatus(det.ok ? "success" : "failed");
  //     setLivenessStatus(liv.ok ? "success" : "failed");

  //     // if either phase failed, show details and abort attendance record
  //     if (!det.ok || !liv.ok) {
  //       setMessage(
  //         `Analysis: detection=${det.ok ? "ok" : "fail"}; liveness=${
  //           liv.ok ? "ok" : "fail"
  //         }`
  //       );
  //       // expose liveness debug
  //       setLivenessDetails(
  //         `score=${liv.score ?? "-"}; lbp=${liv.lbp ?? "-"}; blink=${
  //           liv.blink ?? "-"
  //         }`
  //       );
  //       setCapturing(false);
  //       capturingRef.current = false;
  //       return;
  //     }

  //     // Step B: both phases passed -> proceed to record attendance via existing API endpoint
  //     const resp = await axios.post(endpoint, {
  //       imageBase64: dataUrl.split(",")[1],
  //       analyzeMetrics: analyzeResp,
  //     });
  //     const json = resp?.data;

  //     if (!json) {
  //       setDetectionStatus("failed");
  //       setLivenessStatus("failed");
  //       setMessage("No response data from server");
  //     } else if (json && json.data) {
  //       try {
  //         const info = json.data;
  //         console.log("info", info);
  //         // try to extract analysis metrics (backend may return object or note string)
  //         let analyzeMap: Record<string, any> = {};
  //         try {
  //           if (
  //             info.analyzeMetrics &&
  //             typeof info.analyzeMetrics === "object"
  //           ) {
  //             analyzeMap = info.analyzeMetrics;
  //           } else if (info.note && typeof info.note === "string") {
  //             // parse note into map (reuse existing parsing logic)
  //             const note = String(info.note || "");
  //             const normalized = note
  //               .replace(/[,|]/g, ";")
  //               .replace(/\s+/g, " ");
  //             const parts = normalized
  //               .split(";")
  //               .map((s) => s.trim())
  //               .filter(Boolean);
  //             parts.forEach((p: string) => {
  //               const re = /([a-zA-Z0-9_]+)=([^;]+)/g;
  //               let m: RegExpExecArray | null;
  //               while ((m = re.exec(p)) !== null) {
  //                 const k = m[1];
  //                 let v: any = m[2] || "";
  //                 v = v.trim();
  //                 analyzeMap[k] = v;
  //               }
  //             });
  //           }
  //         } catch (e) {
  //           // ignore parse failures
  //         }
  //         console.log("analyzeMap", analyzeMap);
  //         // determine detection status
  //         const descLenRaw =
  //           analyzeMap["descriptor_len"] ??
  //           analyzeMap["descriptorLen"] ??
  //           info.descriptor_len ??
  //           info.descriptorLen;
  //         const descLen =
  //           typeof descLenRaw === "string" ? Number(descLenRaw) : descLenRaw;
  //         const detectionOk = descLen && Number(descLen) > 0;
  //         setDetectionStatus(detectionOk ? "success" : "failed");

  //         // determine liveness status
  //         const status = String(info.status || "").toUpperCase();
  //         const livenessFlag =
  //           analyzeMap["liveness"] ??
  //           analyzeMap["isLive"] ??
  //           analyzeMap["live"];
  //         const livenessFailedNow =
  //           status === "FAKE_DETECTED" ||
  //           livenessFlag === "false" ||
  //           livenessFlag === false;
  //         setLivenessStatus(livenessFailedNow ? "failed" : "success");

  //         // user-friendly messages
  //         if (info.isPassed || info.status === "PRESENT") {
  //           setLivenessFailed(false);
  //           setLivenessDetails(null);
  //           setMessage("Marked present — attendance recorded.");
  //           setDone(true);
  //           try {
  //             if (videoRef.current && videoRef.current.srcObject) {
  //               const tracks = (
  //                 videoRef.current.srcObject as MediaStream
  //               ).getTracks();
  //               tracks.forEach((t) => t.stop());
  //               videoRef.current.srcObject = null;
  //             }
  //           } catch (e) {
  //             // ignore stop errors
  //           }
  //           if (typeof onSuccess === "function") onSuccess(info);
  //         } else {
  //           // parse note for helpful hints - make parser tolerant to missing semicolons or extra whitespace
  //           const note = String(info.note || "");
  //           const map: Record<string, string> = {};
  //           // Normalize separators: replace commas and pipes with semicolon, keep '=' as key/value
  //           const normalized = note.replace(/[,|]/g, ";").replace(/\s+/g, " ");
  //           // split by semicolon and also try to recover key=value pairs where possible
  //           const parts = normalized
  //             .split(";")
  //             .map((s) => s.trim())
  //             .filter(Boolean);
  //           parts.forEach((p: string) => {
  //             // Sometimes the server may append multiple key=val pairs without semicolons
  //             // e.g. "descriptor_len=128;usedAI=true;minDistance=1.003...liveness=false"
  //             // Try to match all key=value occurrences in the fragment
  //             const re = /([a-zA-Z0-9_]+)=([^;]+)/g;
  //             let m: RegExpExecArray | null;
  //             while ((m = re.exec(p)) !== null) {
  //               const k = m[1];
  //               let v = m[2] || "";
  //               v = v.trim();
  //               map[k] = v;
  //             }
  //           });

  //           // detect liveness failure
  //           const status = String(info.status || "");
  //           if (status === "FAKE_DETECTED" || map["liveness"] === "false") {
  //             setLivenessFailed(true);
  //             const ld = `descriptor_len=${
  //               map["descriptor_len"] || "-"
  //             }; usedAI=${map["usedAI"] || "-"}; blinkProb=${
  //               map["blinkProb"] || "-"
  //             }; yawDelta=${map["yawDelta"] || "-"}; minDistance=${
  //               map["minDistance"] || "-"
  //             }`;
  //             setLivenessDetails(ld);
  //           } else {
  //             setLivenessFailed(false);
  //             setLivenessDetails(null);
  //           }

  //           if (map["descriptor_len"] === "0") {
  //             if (map["usedAI"] === "true") {
  //               setMessage(
  //                 "Không thể trích xuất khuôn mặt từ ảnh. Vui lòng chụp lại ở nơi có ánh sáng tốt hơn hoặc liên hệ hỗ trợ."
  //               );
  //             } else {
  //               setMessage(
  //                 "Hệ thống không phát hiện khuôn mặt. Vui lòng bật camera, tăng ánh sáng, và thử lại."
  //               );
  //             }
  //           } else if (map["minDistance"] && map["minDistance"] !== "-") {
  //             setMessage(
  //               `Không khớp với dữ liệu đăng ký. Khoảng cách gần nhất: ${map["minDistance"]}. Hãy thử điều chỉnh vị trí mặt, chụp thẳng vào camera, hoặc đăng ký lại khuôn mặt.`
  //             );
  //           } else {
  //             setMessage(
  //               "Không thể đối sánh điểm danh. Vui lòng thử lại hoặc đăng ký khuôn mặt (Enroll)."
  //             );

  //             // build targeted suggestions based on debug map
  //             const s: Array<{ text: string; hint?: string }> = [];
  //             // if liveness failed, suggest specific actions
  //             if (map["liveness"] === "false" || status === "FAKE_DETECTED") {
  //               // blinkProb might be 'true'/'false' or numeric
  //               const bp = map["blinkProb"];
  //               if (
  //                 bp === "false" ||
  //                 bp === undefined ||
  //                 bp === "-" ||
  //                 bp === null
  //               ) {
  //                 s.push({
  //                   text: "Nháy mắt chậm 1–2 lần khi thử lại.",
  //                   hint: "Nháy mắt hoàn toàn (đóng rồi mở), đừng chớp quá nhanh.",
  //                 });
  //               } else if (bp === "true" || Number(bp) > 0.5) {
  //                 // good blink prob — no need to suggest blink
  //               }
  //               const yd = map["yawDelta"];
  //               if (yd !== undefined && yd !== null) {
  //                 const ydNum = Number(yd);
  //                 if (!isNaN(ydNum) && Math.abs(ydNum) < 6) {
  //                   s.push({
  //                     text: "Quay nhẹ đầu trái/phải để hệ thống quan sát chuyển động mặt.",
  //                     hint: "Quay khoảng 10–20° sang trái hoặc phải và giữ trong ~0.5s.",
  //                   });
  //                 }
  //               }
  //             }

  //             // if no descriptor extracted
  //             if (map["descriptor_len"] === "0") {
  //               s.push({
  //                 text: "Không phát hiện khuôn mặt — tiến lại gần camera, đảm bảo ánh sáng tốt, và gỡ bỏ kính phản chiếu/ mũ nón.",
  //                 hint: "Đưa mặt vào giữa khung hình, khoảng cách ~30–60cm, đảm bảo mặt chiếm phần lớn khung.",
  //               });
  //             }

  //             // if distance exists but is '-' or large, suggest repositioning/re-enroll
  //             if (
  //               map["minDistance"] === "-" ||
  //               (map["minDistance"] && Number(map["minDistance"]) > 0.6)
  //             ) {
  //               s.push({
  //                 text: "Không khớp — hãy đưa mặt thẳng về phía camera hoặc đăng ký lại khuôn mặt trong trang Hồ sơ.",
  //                 hint: "Giữ mặt thẳng, tránh góc nghiêng, và nếu cần hãy đăng ký khuôn mặt mới trong Profile.",
  //               });
  //             }

  //             // remove duplicates and set
  //             // de-duplicate by text
  //             const uniqMap = new Map<
  //               string,
  //               { text: string; hint?: string }
  //             >();
  //             s.forEach((it) => uniqMap.set(it.text, it));
  //             const uniq = Array.from(uniqMap.values());
  //             setSuggestions(uniq);
  //             // show toasts for suggestions
  //             if (uniq.length > 0 && toast && toast.show) {
  //               uniq.forEach((sug, idx) => {
  //                 // stagger toasts slightly
  //                 setTimeout(() => toast.show(sug.text, "error"), idx * 600);
  //               });
  //             }
  //           }
  //           // also keep debug info available
  //           setMessage((prev) => prev + "\n\nDebug: " + note);
  //         }
  //       } catch (e) {
  //         setMessage("Failed to parse server response");
  //       }
  //     } else {
  //       setMessage("No response data");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     setMessage("Failed to send");
  //   } finally {
  //     setCapturing(false);
  //     capturingRef.current = false;
  //   }
  // };


  
  // const captureAndSend = async () => {
  //   if (!videoRef.current || !canvasRef.current) return;
  //   setCapturing(true);
  //   capturingRef.current = true;
  //   setDetectionStatus("running");
  //   setLivenessStatus("idle");
  //   setLivenessFailed(false);

  //   const video = videoRef.current;
  //   const canvas = canvasRef.current;
  //   const ctx = canvas.getContext("2d", { willReadFrequently: true });
  //   if (!ctx) return setCapturing(false);

  //   canvas.width = video.videoWidth || 640;
  //   canvas.height = video.videoHeight || 480;
  //   ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  //   const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

  //   try {
  //     // call analyze API như trước
  //     const analyzeResp = await axios
  //       .post("http://localhost:5001/analyze", {
  //         imageBase64: dataUrl.split(",")[1],
  //         wantDescriptor: true,
  //       })
  //       .then((r) => r.data);
  //     console.log("analyzeResp", analyzeResp);
  //     if (!analyzeResp || !analyzeResp.detection?.ok) {
  //       setDetectionStatus("failed");
  //       toast?.show
  //         ? toast.show(
  //             "No face detected. Please ensure your face is clearly visible.",
  //             "error"
  //           )
  //         : console.error("No face detected");
  //       setCapturing(false);
  //       capturingRef.current = false;
  //       return;
  //     }
  //     console.log("analyzeResp", analyzeResp);
  //     console.log("dataUrl", dataUrl);

  //     setDetectionStatus("success");
  //     setLivenessStatus("success");

  //     // send attendance
  //     const resp = await axios.post(
  //       `/api/class-session/${classSessionId}/attendance`,
  //       {
  //         imageBase64: dataUrl.split(",")[1],
  //         analyzeMetrics: analyzeResp,
  //       }
  //     );
  //     console.log("resp", resp);
  //     const info = resp.data?.data;

  //     if (info?.isPassed || info?.status === "PRESENT") {
  //       setDone(true);
  //       toast?.show?.("Attendance verified — marked present ✅", "success");

  //       // stop camera
  //       if (videoRef.current?.srcObject) {
  //         const tracks = (
  //           videoRef.current.srcObject as MediaStream
  //         ).getTracks();
  //         tracks.forEach((t) => t.stop());
  //         videoRef.current.srcObject = null;
  //       }

  //       // call callback nếu có
  //       if (typeof onSuccess === "function") onSuccess(info);
  //     } else {
  //       toast?.show?.(
  //         "Attendance failed: face not recognized or liveness failed ❌",
  //         "error"
  //       );

  //       // parse suggestions từ analyzeResp, nếu muốn
  //       const map: Record<string, any> = analyzeResp?.detection || {};
  //       if (map["minDistance"] || map["liveness"] === "false") {
  //         toast?.show?.(
  //           "Try adjusting your face position or lighting and capture again.",
  //           "error"
  //         );
  //       }
  //     }
  //   } catch (err: any) {
  //     console.error(err);
  //     toast?.show?.("Error during capture or verification ❌", "error");
  //   } finally {
  //     setCapturing(false);
  //     capturingRef.current = false;
  //   }
  // };
