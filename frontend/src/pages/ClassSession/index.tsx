import React, { useState, createContext, useEffect, useRef } from "react";
import { pass } from "@config/api";
import { InfisicalSDK } from "@infisical/sdk";
import { FiUserPlus } from "react-icons/fi";
import { SlCamrecorder } from "react-icons/sl";
import { IoExitOutline } from "react-icons/io5";
import { TbScreenShare } from "react-icons/tb";
import Chatbox from "./components/Chatbox";
import ParticipantsGrid from "./components/ParticipantsGrid";
import { IoIosSend } from "react-icons/io";
import { BsEraserFill } from "react-icons/bs";
import { RxText } from "react-icons/rx";
import { FaPenClip } from "react-icons/fa6";
import { BsRecordCircle, BsStopCircle } from "react-icons/bs";
import { RiArrowGoBackFill } from "react-icons/ri";
import { RiArrowGoForwardFill } from "react-icons/ri";
import { MdDashboard } from "react-icons/md";
import { PiProjectorScreenLight } from "react-icons/pi";
import { RiArrowLeftSLine } from "react-icons/ri";
import { RiArrowRightSLine } from "react-icons/ri";
import SelfView from "./components/SelfView";
import GridView from "./components/GridView";
import AttendanceCapture from "./components/AttendanceCapture";
import Whiteboard from "./Whiteboard";
import { io, Socket } from "socket.io-client";
import ClassSessionService from "@services/classSession.service";
import FilesService from "@services/files.service";
import ScreenShareBroadcaster from "./ScreenShareBroadcaster";
import ScreenShareManager from "./ScreenShareManager";

export const SocketContext = createContext<Socket | null>(null);
import { GiAerialSignal } from "react-icons/gi";
import { HiOutlineUsers } from "react-icons/hi2";
import { BsChatLeftText } from "react-icons/bs";
import { MdCallEnd } from "react-icons/md";
import { RiArrowRightDoubleFill } from "react-icons/ri";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { set } from "react-hook-form";
import authMemory from "@services/authMemory";
const ClassSession = () => {
  const [showUsers, setShowUsers] = useState(false);
  const [showChatbox, setShowChatbox] = useState(true);
  const [wbPage, setWbPage] = useState({ current: 1, total: 1 });
  const [pendingShareRequests, setPendingShareRequests] = useState<
    { id: string; name: string }[]
  >([]);
  const [sharingBy, setSharingBy] = useState<string | null>(null);
  const [sharingStream, setSharingStream] = useState<MediaStream | null>(null);
  const [approvedToShare, setApprovedToShare] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [debugMsgs, setDebugMsgs] = useState<string[]>([]);
  const [shareAudioEnabled, setShareAudioEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUploading, setRecordingUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [classroomResourceId, setClassroomResourceId] = useState<string | null>(
    null
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const pushDebug = (m: string) =>
    setDebugMsgs((p) =>
      [new Date().toLocaleTimeString() + " - " + m, ...p].slice(0, 40)
    );

  const storedUserTop = authMemory.getUser() || {};
  const isTeacherTop = storedUserTop?.role === "TEACHER";

  // startShare: 'screen' uses getDisplayMedia, 'camera' uses getUserMedia
  const startShare = async (kind: "screen" | "camera") => {
    try {
      const s = socketState || socketRef.current;
      const user = authMemory.getUser() || {};
      const isTeacher = user?.role === "TEACHER";
      // Allow students to share immediately. For audit/UX we still emit a
      // `screen:request` so teachers can see a request, but do not block
      // sharing on approval.
      if (!isTeacher && !approvedToShare) {
        try {
          if (s && s.connected) {
            s.emit("screen:request", {
              from: s.id,
              userName: user?.name || "Student",
            });
          }
        } catch (e) {}
        // continue to start sharing without waiting for approval
      }

      let disp: MediaStream | null = null;
      try {
        if (kind === "screen") {
          disp = await (navigator.mediaDevices as any).getDisplayMedia({
            video: true,
            audio: true,
          });
        } else {
          disp = await (navigator.mediaDevices as any).getUserMedia({
            video: true,
            audio: true,
          });
        }
      } catch (e) {
        console.log("startShare failed to get media", e);
        return;
      }

      if (!disp) return;
      setSharingStream(disp);
      // ensure sharingBy is set so UI switches from whiteboard to shared screen
      // even if socket is not connected yet — use a local sentinel id.
      const myId = s?.id || (socketRef.current && socketRef.current.id) || null;
      const shareId = myId || "local";
      setSharingBy(shareId);
      // hide whiteboard/sidebar so shared screen occupies main area
      setShowUsers(false);
      setShowChatbox(false);
      window.dispatchEvent(
        new CustomEvent("screen:share:local-stream", {
          detail: { stream: disp },
        } as any)
      );
      console.log("index.tsx: started local share", {
        kind,
        tracks: disp.getTracks().map((t: any) => t.kind),
      });
      setApprovedToShare(false);
      // reset ACK bookkeeping for this share attempt
      try {
        (window as any).__screenShareAcked = {};
        (window as any).__lastShareAnnounceWarned = false;
      } catch (e) {}

      if (s && s.connected) {
        setTimeout(() => {
          try {
            s.emit("screen:share:announce", { by: s.id });
            // retry loop
            const maxRetries = 6;
            let attempt = 0;
            const retryInterval = 800;
            (window as any).__screenShareAcked =
              (window as any).__screenShareAcked || {};
            const tid = setInterval(() => {
              try {
                attempt += 1;
                const ackSeen =
                  Object.keys((window as any).__screenShareAcked || {}).length >
                  0;
                if (ackSeen) {
                  clearInterval(tid);
                  return;
                }
                if (attempt >= maxRetries) {
                  if (!(window as any).__lastShareAnnounceWarned) {
                    try {
                      pushDebug(
                        "Không client nào xác nhận nhận được màn hình. Kiểm tra TURN/ICE."
                      );
                    } catch (e) {}
                    console.warn(
                      "screen:share:announce retries exhausted without ACK; viewers likely blocked by ICE"
                    );
                    (window as any).__lastShareAnnounceWarned = true;
                  }
                  clearInterval(tid);
                  return;
                }
                console.debug(
                  "retrying screen:share:announce attempt",
                  attempt
                );
                s.emit("screen:share:announce", { by: s.id, retry: attempt });
              } catch (e) {
                clearInterval(tid);
              }
            }, retryInterval);
          } catch (e) {}
        }, 250);
      }
    } catch (e) {}
  };
  const socketRef = useRef<Socket | null>(null);
  const shareVideoRef = useRef<HTMLVideoElement | null>(null);
  const [socketState, setSocketState] = React.useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const currentSessionId = (window as any).__CURRENT_CLASSSESSION_ID || null;
  const formatRecordingDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cleanupRecordingResources = (stopTracks = true) => {
    clearRecordingTimer();
    if (stopTracks && recordingStreamRef.current) {
      try {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }
    recordingStreamRef.current = null;
    recorderRef.current = null;
    recordingChunksRef.current = [];
  };

  const RECORDING_CLASSROOM_ERROR = "recording:missing-classroom";

  const getClassroomResourceIdForRecording = React.useCallback(async () => {
    if (!isTeacherTop) return null;
    if (classroomResourceId) return classroomResourceId;
    if (!currentSessionId) return null;
    try {
      const resp = await ClassSessionService.getClassSession(currentSessionId);
      const sessionData = resp?.data ?? resp;
      const derivedId = sessionData?.classroom?.id || null;
      setClassroomResourceId(derivedId);
      return derivedId;
    } catch (error) {
      console.warn(
        "ClassSession: failed to load classroom info for recording",
        error
      );
      return null;
    }
  }, [isTeacherTop, classroomResourceId, currentSessionId]);

  const finalizeRecordingUpload = async () => {
    const chunks = recordingChunksRef.current;
    if (!chunks.length) {
      cleanupRecordingResources();
      setRecordingDuration(0);
      return;
    }
    const blob = new Blob(chunks, { type: "video/webm" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `session-recording-${timestamp}.webm`;
    const file = new File([blob], filename, {
      type: blob.type || "video/webm",
    });
    setRecordingUploading(true);
    try {
      let classroomId: string | undefined;
      if (isTeacherTop) {
        const resolvedId = await getClassroomResourceIdForRecording();
        if (!resolvedId) {
          throw new Error(RECORDING_CLASSROOM_ERROR);
        }
        classroomId = resolvedId;
      }
      await FilesService.uploadFile(file, undefined, classroomId);
      setRecordingError(null);
      pushDebug(
        classroomId
          ? `Đã lưu bản ghi vào tài nguyên lớp học (${classroomId})`
          : "Đã lưu bản ghi vào tài nguyên cá nhân"
      );
    } catch (err: any) {
      if (err?.message === RECORDING_CLASSROOM_ERROR) {
        setRecordingError("Không xác định được lớp học để lưu bản ghi.");
        pushDebug("Thiếu classroomId khi tải bản ghi. Hãy thử tải lại trang.");
      } else {
        console.error("Recording upload failed", err);
        setRecordingError("Không thể tải bản ghi lên. Vui lòng thử lại.");
        pushDebug("Upload bản ghi thất bại.");
      }
    } finally {
      setRecordingUploading(false);
      setRecordingDuration(0);
      cleanupRecordingResources();
    }
  };

  const stopRecording = React.useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        setIsRecording(false);
      }
    } catch (err) {
      console.warn("stopRecording failed", err);
    } finally {
      clearRecordingTimer();
    }
  }, []);

  const startRecording = async () => {
    if (isRecording || recordingUploading) return;
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      setRecordingError(
        "Trình duyệt hiện tại không hỗ trợ chức năng ghi hình/màn hình."
      );
      return;
    }
    try {
      setRecordingError(null);
      const capture = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      recordingStreamRef.current = capture;
      const preferredTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let recorder: MediaRecorder | null = null;
      for (const mimeType of preferredTypes) {
        if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
          try {
            recorder = mimeType
              ? new MediaRecorder(capture, { mimeType })
              : new MediaRecorder(capture);
            break;
          } catch (err) {}
        }
      }
      if (!recorder) {
        recorder = new MediaRecorder(capture);
      }
      recordingChunksRef.current = [];
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          recordingChunksRef.current.push(ev.data);
        }
      };
      recorder.onerror = (ev) => {
        console.warn("MediaRecorder error", ev);
        setRecordingError("Có lỗi xảy ra khi ghi hình.");
        stopRecording();
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        await finalizeRecordingUpload();
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      clearRecordingTimer();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      capture.getVideoTracks().forEach((track: MediaStreamTrack) => {
        track.addEventListener(
          "ended",
          () => {
            stopRecording();
          },
          { once: true }
        );
      });
      pushDebug("Bắt đầu ghi hình nội dung buổi học.");
    } catch (err: any) {
      console.error("startRecording failed", err);
      if (err?.name === "NotAllowedError") {
        setRecordingError("Bạn đã từ chối quyền ghi màn hình.");
      } else {
        setRecordingError("Không thể bắt đầu ghi hình.");
      }
      cleanupRecordingResources();
    }
  };
  // Debug: current sharingBy id
  console.log("sharingBy", sharingBy);
  console.log("sharingStream", sharingStream);

  useEffect(() => {
    // reset audio toggle whenever sharing state changes
    setShareAudioEnabled(false);
    if (!sharingStream && shareVideoRef.current) {
      try {
        shareVideoRef.current.pause();
        (shareVideoRef.current as HTMLVideoElement).srcObject = null;
      } catch (e) {}
    }
  }, [sharingBy, sharingStream]);

  useEffect(() => {
    const el = shareVideoRef.current;
    if (!el || !sharingStream) return;
    try {
      if (el.srcObject !== sharingStream) {
        el.srcObject = sharingStream;
      }
    } catch (e) {}
    const me = socketRef.current?.id || null;
    const shouldMute = sharingBy === me || !shareAudioEnabled;
    try {
      el.muted = shouldMute;
    } catch (e) {}
    el.play().catch((err) => {
      console.warn("shared video autoplay failed", err);
      try {
        el.muted = true;
        el.play().catch(() => {});
      } catch (e2) {}
    });
  }, [sharingStream, shareAudioEnabled, sharingBy]);

  useEffect(() => {
    if (!isTeacherTop) return;
    if (!currentSessionId) return;
    getClassroomResourceIdForRecording();
  }, [isTeacherTop, currentSessionId, getClassroomResourceIdForRecording]);

  const toggleSharedAudio = async () => {
    const el = shareVideoRef.current;
    if (!el || !sharingStream) return;
    if (shareAudioEnabled) {
      try {
        el.muted = true;
      } catch (e) {}
      setShareAudioEnabled(false);
      return;
    }
    try {
      el.muted = false;
      await el.play();
      setShareAudioEnabled(true);
    } catch (err) {
      try {
        pushDebug(
          "Không thể bật âm thanh màn hình nếu trình duyệt chưa cho phép."
        );
      } catch (e) {}
      try {
        el.muted = true;
        await el.play().catch(() => {});
      } catch (e2) {}
      setShareAudioEnabled(false);
    }
  };
  const viewerCanToggleSharedAudio = React.useMemo(() => {
    if (!sharingStream) return false;
    const audioTracks = sharingStream.getAudioTracks() || [];
    if (audioTracks.length === 0) return false;
    const me = socketRef.current?.id || null;
    return !!sharingBy && sharingBy !== me;
  }, [sharingStream, sharingBy]);

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.onstop = null;
          recorderRef.current.stop();
        }
      } catch (e) {}
      cleanupRecordingResources();
    };
  }, []);

  useEffect(() => {
    // connect to socket server; server URL can be injected via env
    const base = (window as any).__env?.VITE_SOCKET_URL || undefined;
    // default to a local socket server during development to avoid connecting to Vite websocket
    const devDefault = "http://localhost:3001";
    const url =
      base ||
      (window.location.hostname === "localhost"
        ? devDefault
        : window.location.origin);
    // allow default transports (polling + websocket) so connection can succeed behind proxies
    const socket = io(url);
    socketRef.current = socket;

    // helpful debug logging for socket lifecycle
    socket.on("connect", () => {
      console.log("socket connected (client)", socket.id);
      setSocketConnected(true);
      setSocketId(socket.id || null);
    });
    socket.on("connect_error", (err: any) => {
      console.error("socket connect_error", err);
    });
    socket.on("reconnect_attempt", (n: any) => {
      console.log("socket reconnect_attempt", n);
    });

    // update state so children receive the socket via context
    setSocketState(socket);

    const room = (window as any).__CURRENT_CLASSSESSION_ID || null;
    // fallback: try to parse id from url (support classroom/online/:id and class-session/:id)
    if (!room) {
      let m = window.location.pathname.match(/classroom\/online\/([^\/]+)/);
      if (m && m[1]) {
        (window as any).__CURRENT_CLASSSESSION_ID = m[1];
      } else {
        m = window.location.pathname.match(/class-session\/([^\/]+)/);
        if (m && m[1]) (window as any).__CURRENT_CLASSSESSION_ID = m[1];
      }
    }

    const sessionId = (window as any).__CURRENT_CLASSSESSION_ID || null;
    socket.on("connect", () => {
      console.log("socket connected (client)", socket.id, "url=", url);
      const sid =
        sessionId || (window as any).__CURRENT_CLASSSESSION_ID || null;
      if (sid) {
        console.log("emitting join for room", sid);
        console.log(
          "JOIN debug: pathname=",
          window.location.pathname,
          "computed sid=",
          sid
        );
        const user = authMemory.getUser() || {};
        console.log("user", user);

        if (!user?.id) {
          console.log(
            "⚠️ Không tìm thấy user.id trong localStorage, dùng guest id tạm thời"
          );
        }

        socket.emit("join", {
          room: sid,
          userId:
            user?.id || "guest-" + Math.random().toString(36).substring(2, 7),
          userName: user?.name || "Khách",
        });
      }
    });

    socket.on("connect_error", (err: any) => {
      console.error("socket connect_error", err);
    });

    socket.on("reconnect_attempt", (attempt: any) => {
      console.log("socket reconnect attempt", attempt);
    });

    socket.on("disconnect", (reason: any) => {
      console.log("socket disconnected (client)", socket.id, reason);
      setSocketConnected(false);
      setSocketId(null);
    });

    return () => {
      try {
        if (sessionId) socket.emit("leave", { room: sessionId });
      } catch (e) {}
      socket.disconnect();
      setSocketState(null);
    };
  }, []);

  // screen share socket handlers (requests/approvals/announce)
  useEffect(() => {
    const s = socketState || socketRef.current;
    if (!s) return;
    const storedUser = authMemory.getUser() || {};
    const isTeacher = storedUser?.role === "TEACHER";

    const onRequest = (payload: any) => {
      try {
        if (!isTeacher) return;
        const id = payload?.from || payload?.socketId || payload?.id;
        const name = payload?.userName || payload?.user || payload?.name || "";
        if (!id) return;
        setPendingShareRequests((p) => {
          if (p.find((x) => x.id === id)) return p;
          return [...p, { id, name }];
        });
        pushDebug(
          `screen:request from ${
            payload?.from || payload?.socketId || payload?.id
          }`
        );
      } catch (e) {}
    };

    const onApproved = (payload: any) => {
      try {
        const to = payload?.to;
        if (!to) return;
        const me = s.id;
        if (to === me) {
          // we were approved to start screen share; require user gesture to actually call getDisplayMedia
          setApprovedToShare(true);
          pushDebug(`screen:request:approved to me`);
        }
      } catch (e) {}
    };

    const onAnnounce = (payload: any) => {
      try {
        const by = payload?.by || payload?.from || payload?.id || null;
        setSharingBy(by || null);
        pushDebug(`screen:share:announce by ${by}`);
        try {
          const room = (window as any).__CURRENT_CLASSSESSION_ID || null;
          const s = socketState || socketRef.current;
          console.debug(
            "index.tsx: received screen:share:announce, refreshing participants",
            { by, room }
          );
          if (s && room) s.emit("participants:get", { room });
          // If no remote stream arrives within 2s, tell ParticipantsGrid to retry offer
          setTimeout(() => {
            try {
              // only trigger if we still have a sharer but no sharingStream
              if (by && !sharingStream) {
                // avoid forcing viewers to offer if the announcer repeatedly
                // announces but reports no stream; track negative announces
                (window as any).__webrtcAnnFailures =
                  (window as any).__webrtcAnnFailures || {};
                const failures =
                  ((window as any).__webrtcAnnFailures[by] || 0) + 1;
                (window as any).__webrtcAnnFailures[by] = failures;
                if (failures <= 3) {
                  window.dispatchEvent(
                    new CustomEvent("screen:ensure-offer", {
                      detail: { sharer: by },
                    } as any)
                  );
                } else {
                  console.debug(
                    "skipping ensure-offer due to repeated no-stream",
                    {
                      sharer: by,
                      failures,
                    }
                  );
                  try {
                    pushDebug(
                      `Không thể lấy luồng từ ${by}. Bật TURN server để vượt qua NAT.`
                    );
                  } catch (e) {}
                  try {
                    window.dispatchEvent(
                      new CustomEvent("screen:force-reconnect", {
                        detail: { sharer: by },
                      } as any)
                    );
                  } catch (e) {}
                }
              }
            } catch (e) {}
          }, 2000);
        } catch (e) {}
      } catch (e) {}
    };

    const onStop = (payload: any) => {
      try {
        try {
          if (sharingStream) {
            try {
              sharingStream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
          }
        } catch (e) {}
        setSharingBy(null);
        setSharingStream(null);
        try {
          if (payload?.from) {
            (window as any).__webrtcAnnFailures =
              (window as any).__webrtcAnnFailures || {};
            delete (window as any).__webrtcAnnFailures[payload.from];
          }
        } catch (e) {}
        pushDebug(
          `screen:share:stop from ${payload?.from || payload?.by || ""}`
        );
      } catch (e) {}
    };
    const onSessionEnd = (payload: any) => {
      try {
        console.debug("index.tsx: received session:end", payload);
        // clear any active sharing UI
        try {
          if (sharingStream) {
            try {
              sharingStream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
          }
        } catch (e) {}
        setSharingBy(null);
        setSharingStream(null);
        setSessionEnded(true);
        // redirect each participant to their dashboard after a short pause
        try {
          const user = authMemory.getUser() || {};
          const role = (user && user.role) || null;
          setTimeout(() => {
            try {
              if (role === "TEACHER") window.location.assign("/teacher");
              else if (role === "STUDENT") window.location.assign("/student");
              else window.location.assign("/");
            } catch (e) {}
          }, 700);
        } catch (e) {}
      } catch (e) {}
    };

    s.on("screen:request", onRequest);
    s.on("screen:request:approved", onApproved);
    s.on("screen:share:announce", onAnnounce);
    s.on("session:end", onSessionEnd);
    // ACK from viewers when they receive a stream — stop retrying announces
    const onStreamReceived = (payload: any) => {
      try {
        const from = payload?.from;
        console.debug(
          "index.tsx: received ACK screen:stream:received from",
          from
        );
        // if we were retrying announce, stop
        (window as any).__screenShareAcked =
          (window as any).__screenShareAcked || {};
        (window as any).__screenShareAcked[from] = true;
        pushDebug(`screen:stream:received ACK from ${from}`);
      } catch (e) {}
    };
    s.on("screen:stream:received", onStreamReceived);
    const onWebrtcAnn = (payload: any) => {
      try {
        // payload: { id, hasStream }
        const id = payload?.id || payload?.from || null;
        const hasStream = !!payload?.hasStream;
        console.debug("index.tsx: webrtc:announce", { id, hasStream });
        if (hasStream && id) setSharingBy(id);
        if (!hasStream && id && sharingBy === id) setSharingBy(null);
        pushDebug(`webrtc:announce ${id} hasStream=${hasStream}`);
      } catch (e) {}
    };
    s.on("webrtc:announce", onWebrtcAnn);
    s.on("screen:share:stop", onStop);

    const onWSDbg = (ev: any) => {
      try {
        const d = ev?.detail;
        if (d) pushDebug(String(d));
      } catch (e) {}
    };
    window.addEventListener("webrtc:debug", onWSDbg as any);

    return () => {
      s.off("screen:request", onRequest);
      s.off("screen:request:approved", onApproved);
      s.off("screen:share:announce", onAnnounce);
      s.off("session:end", onSessionEnd);
      s.off("webrtc:announce", onWebrtcAnn);
      s.off("screen:share:stop", onStop);
      s.off("screen:stream:received", onStreamReceived);
      window.removeEventListener("webrtc:debug", onWSDbg as any);
    };
  }, [socketState]);

  // listen for remote shared screen streams from ParticipantsGrid
  useEffect(() => {
    const onRemote = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        const id = ev?.detail?.id;
        console.debug("index.tsx: screen:participant-remote-stream", {
          id,
          hasStream: !!stream,
        });
        if (!stream) return;
        // Heuristic: detect display-like streams via settings or label
        let isDisplay = false;
        try {
          const vtracks = stream.getVideoTracks() || [];
          for (const t of vtracks) {
            try {
              const s = (t as any).getSettings
                ? (t as any).getSettings()
                : null;
              if (s && (s.displaySurface || s.mediaSource)) {
                isDisplay = true;
                break;
              }
              const label = (t as any).label || "";
              if (/screen|display|monitor|window/i.test(label)) {
                isDisplay = true;
                break;
              }
            } catch (e) {}
          }
        } catch (e) {}

        // Relax heuristic: if id matches current sharingBy we accept even if indicators missing.
        if (!isDisplay) {
          try {
            if (sharingBy && id === sharingBy) {
              console.log(
                "index.tsx: accepting remote stream (id matches sharingBy despite no display indicators)",
                { id }
              );
              isDisplay = true;
            }
          } catch (e) {}
        }

        if (!isDisplay) {
          console.log(
            "index.tsx: ignoring remote stream (failed display heuristics and id != sharingBy)",
            { id }
          );
          return;
        }

        setSharingStream(stream);
        if (id) setSharingBy(id);
        try {
          (window as any).__webrtcAnnFailures =
            (window as any).__webrtcAnnFailures || {};
          if (id && (window as any).__webrtcAnnFailures[id]) {
            delete (window as any).__webrtcAnnFailures[id];
          }
        } catch (e) {}

        // ACK the sharer so they stop retrying announces
        try {
          const s = socketState || socketRef.current;
          if (s && s.connected) s.emit("screen:stream:received", { to: id });
        } catch (e) {}
      } catch (e) {}
    };

    window.addEventListener(
      "screen:participant-remote-stream",
      onRemote as any
    );
    return () =>
      window.removeEventListener(
        "screen:participant-remote-stream",
        onRemote as any
      );
  }, [socketState, sharingBy]);

  // local stream (sharer) — set sharingStream so sharer sees their own shared screen
  useEffect(() => {
    const onLocal = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        console.log("index.tsx: screen:share:local-stream", {
          hasStream: !!stream,
        });
        if (stream) setSharingStream(stream);
      } catch (e) {}
    };
    window.addEventListener("screen:share:local-stream", onLocal as any);
    return () =>
      window.removeEventListener("screen:share:local-stream", onLocal as any);
  }, []);

  // ensure local UI stop events propagate to server and clear local state
  useEffect(() => {
    const onLocalStop = (ev: any) => {
      try {
        const s = socketState || socketRef.current;
        if (s && s.connected) {
          s.emit("screen:share:stop", { by: s.id });
        }
      } catch (e) {}
      try {
        setSharingStream(null);
        setSharingBy(null);
      } catch (e) {}
    };
    window.addEventListener("screen:share:stop-local", onLocalStop as any);
    return () =>
      window.removeEventListener("screen:share:stop-local", onLocalStop as any);
  }, [socketState]);

  // if the active sharing stream's tracks end (user stopped sharing via browser UI),
  // emit a stop to other participants and clear local state so viewers update in real-time.
  useEffect(() => {
    if (!sharingStream) return;
    const tracks = sharingStream.getTracks();
    const onTrackEnded = () => {
      try {
        const s = socketState || socketRef.current;
        // Only tell the server to stop if we are the known sharer
        if (s && s.connected && sharingBy === (s.id || null)) {
          s.emit("screen:share:stop", { by: s.id });
        }
      } catch (e) {}
      try {
        setSharingStream(null);
        setSharingBy(null);
      } catch (e) {}
    };

    tracks.forEach((t) => {
      try {
        t.addEventListener("ended", onTrackEnded);
      } catch (e) {
        try {
          // fallback assignment
          (t as any).onended = onTrackEnded;
        } catch (e) {}
      }
    });

    return () => {
      tracks.forEach((t) => {
        try {
          t.removeEventListener("ended", onTrackEnded);
        } catch (e) {
          try {
            (t as any).onended = null;
          } catch (e) {}
        }
      });
    };
  }, [sharingStream, socketState, sharingBy]);

  // listen for whiteboard state updates from Whiteboard component
  useEffect(() => {
    const onState = (e: any) => {
      try {
        const d = e.detail || {};
        setWbPage({ current: d.current || 1, total: d.total || 1 });
      } catch (e) {}
    };
    window.addEventListener("whiteboard:state", onState as any);
    return () => window.removeEventListener("whiteboard:state", onState as any);
  }, []);

  return (
    <SocketContext.Provider value={socketState || socketRef.current}>
      <ScreenShareBroadcaster />
      <ScreenShareManager />
      <div className="flex flex-col h-screen ">
        {/* Live Status Bar */}
        <div className="bg-white shadow-md rounded-lg flex justify-between items-center px-6 py-3">
          {/* Left: Live info */}
          <div className="flex items-center gap-3">
            <GiAerialSignal className="text-green-500 text-xl" />
            <p className="text-sm font-medium text-gray-700">Started: 5:01</p>
          </div>

          {/* Debug: socket id and session id (dev) */}
          {/* <div className="text-xs text-gray-500 ml-4">
            <div>
              socket:{" "}
              <span className="font-mono text-xs">{socketId || "-"}</span>
            </div>
            <div>
              room:{" "}
              <span className="font-mono text-xs">
                {currentSessionId || "-"}
              </span>
            </div>
          </div> */}

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-1 text-gray-700">
            <div className="flex items-center gap-4">
              <FiUserPlus className="text-lg hover:text-blue-600 cursor-pointer transition" />
              <SlCamrecorder className="text-lg hover:text-red-600 cursor-pointer transition" />
              <IoExitOutline className="text-lg hover:text-gray-800 cursor-pointer transition" />

              <button
                title={isRecording ? "Dừng ghi" : "Ghi lại buổi học"}
                onClick={() =>
                  isRecording ? stopRecording() : startRecording()
                }
                disabled={recordingUploading}
                className={`flex items-center text-lg transition ${
                  isRecording ? "text-red-600" : "hover:text-red-500"
                } ${
                  recordingUploading
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {isRecording ? <BsStopCircle /> : <BsRecordCircle />}
              </button>

              <button
                title="Share screen"
                onClick={async () => {
                  try {
                    await startShare("screen");
                  } catch (e) {}
                }}
                className="flex items-center text-lg hover:text-purple-600 transition"
              >
                <TbScreenShare />
              </button>

              <MdDashboard className="text-lg hover:text-indigo-600 cursor-pointer transition" />
              {isTeacherTop && (
                <button
                  title="End session"
                  onClick={() => setShowEndConfirm(true)}
                  className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                >
                  End Session
                </button>
              )}
            </div>
            {(isRecording || recordingUploading) && (
              <div className="flex items-center gap-2 text-xs text-red-600 font-semibold">
                <BsRecordCircle
                  className={isRecording ? "animate-pulse" : ""}
                />
                <span>
                  {isRecording
                    ? `Đang ghi · ${formatRecordingDuration(recordingDuration)}`
                    : "Đang lưu bản ghi..."}
                </span>
              </div>
            )}
            {recordingError && (
              <div className="text-xs text-red-500 max-w-sm text-right">
                {recordingError}
              </div>
            )}
          </div>
        </div>

        {/* Debug overlay */}
        {debugMsgs.length > 0 && (
          <div className="fixed right-4 top-20 z-50 w-80 max-h-64 overflow-auto bg-black/70 text-white text-xs rounded p-2">
            <div className="font-semibold text-sm mb-1">WS Debug</div>
            {debugMsgs.map((m, i) => (
              <div key={i} className="truncate">
                {m}
              </div>
            ))}
          </div>
        )}

        {/* Pending share requests (teachers) */}
        {pendingShareRequests.length > 0 && (
          <div className="p-2 border-b">
            <div className="text-sm font-medium">Screen share requests:</div>
            <div className="flex gap-2 mt-1">
              {pendingShareRequests.map((r) => (
                <div
                  key={r.id}
                  className="border p-2 rounded flex items-center gap-2"
                >
                  <div className="text-sm">{r.name || r.id}</div>
                  <button
                    className="px-2 py-1 bg-green-600 text-white rounded"
                    onClick={() => {
                      try {
                        const s = socketState || socketRef.current;
                        if (s && s.connected)
                          s.emit("screen:request:approved", {
                            to: r.id,
                            by: s.id,
                          });
                        setPendingShareRequests((p) =>
                          p.filter((x) => x.id !== r.id)
                        );
                      } catch (e) {}
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="px-2 py-1 bg-gray-300 rounded"
                    onClick={() =>
                      setPendingShareRequests((p) =>
                        p.filter((x) => x.id !== r.id)
                      )
                    }
                  >
                    Deny
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-stretch gap-2 p-2 flex-1 rounded-2xl bg-white shadow-inner">
          {/* MAIN AREA */}
          <div
            className={`flex flex-col transition-all duration-300 ${
              showUsers || showChatbox ? "w-4/5" : "w-full"
            } rounded-2xl bg-gray-50 border border-gray-200 shadow-sm`}
          >
            <section className="flex-1 flex flex-col justify-between relative p-2">
              {/* WHITEBOARD / SCREEN SHARING */}
              <div className="h-full rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                {sessionEnded && (
                  <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">
                        Session ended
                      </div>
                      <div className="mt-2 text-sm">
                        This session has been ended by the teacher.
                      </div>
                    </div>
                  </div>
                )}
                {/* Unified screen share: no separate broadcaster/receiver components */}
                {sharingBy ? (
                  <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center rounded-lg">
                    {sharingStream ? (
                      <video
                        autoPlay
                        playsInline
                        muted={
                          sharingBy === (socketRef.current?.id || null) ||
                          !shareAudioEnabled
                        }
                        className="w-full h-full object-contain rounded-lg"
                        ref={(el) => {
                          if (!el) {
                            shareVideoRef.current = null;
                            return;
                          }
                          shareVideoRef.current = el;
                          if (sharingStream) {
                            try {
                              if (el.srcObject !== sharingStream) {
                                el.srcObject = sharingStream;
                              }
                            } catch (e) {}
                          }
                        }}
                      />
                    ) : (
                      <div className="text-2xl">
                        {sharingBy === socketRef.current?.id
                          ? "You are sharing your screen"
                          : `${sharingBy} is sharing`}
                      </div>
                    )}

                    {sharingBy === socketRef.current?.id && (
                      <button
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 transition text-white rounded-lg shadow"
                        onClick={() => {
                          try {
                            const s = socketRef.current;
                            window.dispatchEvent(
                              new CustomEvent("screen:share:stop-local", {})
                            );
                            if (s && s.connected)
                              s.emit("screen:share:stop", { by: s.id });
                            try {
                              if (sharingStream) {
                                try {
                                  sharingStream
                                    .getTracks()
                                    .forEach((t) => t.stop());
                                } catch (e) {}
                              }
                            } catch (e) {}
                            setSharingStream(null);
                            setSharingBy(null);
                          } catch (e) {}
                        }}
                      >
                        Stop Sharing
                      </button>
                    )}
                    {viewerCanToggleSharedAudio && (
                      <button
                        className="mt-2 px-3 py-1 text-sm bg-gray-800 text-white rounded"
                        onClick={toggleSharedAudio}
                      >
                        {shareAudioEnabled
                          ? "Mute shared audio"
                          : "Enable shared audio"}
                      </button>
                    )}
                  </div>
                ) : (
                  <Whiteboard />
                )}
              </div>

              {/* FOOTER CONTROLS */}
              <div className="flex justify-between items-center mt-3 bg-white border border-gray-200 rounded-xl shadow-sm p-2">
                {/* Whiteboard navigation */}
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 shadow-sm">
                  <RiArrowGoBackFill
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:prev"))
                    }
                    className="cursor-pointer hover:text-blue-500"
                  />
                  <RiArrowGoForwardFill
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:next"))
                    }
                    className="cursor-pointer hover:text-blue-500"
                  />
                </div>

                {/* Center controls */}
                <div className="flex items-center gap-6 text-2xl">
                  <HiOutlineUsers
                    onClick={() => {
                      setShowUsers(!showUsers);
                      setShowChatbox(false);
                    }}
                    className="cursor-pointer hover:text-blue-600 transition"
                  />
                  <MdCallEnd className="text-red-600 hover:scale-110 transition cursor-pointer" />
                  <BsChatLeftText
                    onClick={() => {
                      setShowChatbox(!showChatbox);
                      setShowUsers(false);
                    }}
                    className="cursor-pointer hover:text-blue-600 transition"
                  />
                </div>

                {/* Page indicator */}
                <div className="flex items-center border border-gray-300 rounded-lg p-1 shadow-sm gap-2">
                  <RiArrowLeftSLine
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:prev"))
                    }
                    className="cursor-pointer hover:text-blue-500 text-xl"
                  />
                  <input
                    type="text"
                    className="outline-none w-12 text-center border border-gray-200 rounded"
                    readOnly
                    value={`${wbPage.current}/${wbPage.total}`}
                  />
                  <RiArrowRightSLine
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:next"))
                    }
                    className="cursor-pointer hover:text-blue-500 text-xl"
                  />
                  <PiProjectorScreenLight className="text-xl text-gray-500" />
                </div>
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          {showUsers || showChatbox ? (
            <div className="flex flex-col gap-4 w-1/5 relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Collapse button */}
              <div
                onClick={() => {
                  setShowUsers(false);
                  setShowChatbox(false);
                }}
                className="absolute h-10 flex items-center justify-center top-1/2 -translate-y-1/2 cursor-pointer rounded-r-lg border border-gray-300 bg-gray-50 -left-5 shadow-md px-1 hover:bg-gray-100"
              >
                <RiArrowRightDoubleFill className="text-gray-700" />
              </div>

              <div className="h-full overflow-y-auto">
                {showUsers ? <ParticipantsGrid /> : <Chatbox />}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 relative">
              <div
                onClick={() => setShowChatbox(true)}
                className="absolute h-10 flex items-center justify-center top-1/2 -translate-y-1/2 cursor-pointer rounded-r-lg border border-gray-300 bg-gray-50 -left-5 shadow-md px-1 hover:bg-gray-100"
              >
                <MdKeyboardDoubleArrowLeft className="text-gray-700" />
              </div>

              {sharingBy && !showUsers && !showChatbox && (
                <ParticipantsGrid compact />
              )}
            </div>
          )}
        </div>
      </div>

      {/* End session confirm modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30">
          <div className="bg-white p-4 rounded shadow-lg">
            <div className="text-lg font-medium">End session?</div>
            <div className="mt-2 text-sm">
              Are you sure you want to end this session for all participants?
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-3 py-1 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (ending) return;
                    setEnding(true);
                    const s = socketRef.current;
                    try {
                      // persist session status to backend if we have sessionId
                      const sid =
                        (window as any).__CURRENT_CLASSSESSION_ID || null;
                      if (sid) {
                        await ClassSessionService.updateClassSession(sid, {
                          sessionStatus: "COMPLETED",
                        });
                      }
                      // after successful persist, emit session:end with session id
                      try {
                        if (s && s.connected)
                          s.emit("session:end", { by: s.id, sessionId: sid });
                      } catch (e) {}
                    } catch (e) {
                      console.warn("failed to persist session end", e);
                      // even if persist fails, still notify clients so session ends in UI
                      try {
                        if (s && s.connected)
                          s.emit("session:end", { by: s.id });
                      } catch (e) {}
                    }
                    // locally mark ended and close modal
                    setSessionEnded(true);
                    setShowEndConfirm(false);
                    setEnding(false);
                  } catch (e) {
                    setEnding(false);
                  }
                }}
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                {ending ? "Ending..." : "End session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export default ClassSession;
