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

  const storedUserTop = authMemory.getUser() || {};
  const isTeacherTop = storedUserTop?.role === "TEACHER";

  // startShare: 'screen' uses getDisplayMedia, 'camera' uses getUserMedia
  const startShare = async (kind: "screen" | "camera") => {
    try {
      const s = socketState || socketRef.current;
      const user = authMemory.getUser() || {};
      const isTeacher = user?.role === "TEACHER";
      if (!isTeacher && !approvedToShare) {
        if (s && s.connected) {
          s.emit("screen:request", {
            from: s.id,
            userName: user?.name || "Student",
          });
        }
        return;
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
        console.warn("startShare failed to get media", e);
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
      console.debug("index.tsx: started local share", {
        kind,
        tracks: disp.getTracks().map((t: any) => t.kind),
      });
      setApprovedToShare(false);

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
                if (ackSeen || attempt >= maxRetries) {
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
  const [socketState, setSocketState] = React.useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const currentSessionId = (window as any).__CURRENT_CLASSSESSION_ID || null;

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
          console.warn(
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
        }
      } catch (e) {}
    };

    const onAnnounce = (payload: any) => {
      try {
        const by = payload?.by || payload?.from || payload?.id || null;
        setSharingBy(by || null);
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
                window.dispatchEvent(
                  new CustomEvent("screen:ensure-offer", {
                    detail: { sharer: by },
                  } as any)
                );
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
      } catch (e) {}
    };
    s.on("webrtc:announce", onWebrtcAnn);
    s.on("screen:share:stop", onStop);

    return () => {
      s.off("screen:request", onRequest);
      s.off("screen:request:approved", onApproved);
      s.off("screen:share:announce", onAnnounce);
      s.off("session:end", onSessionEnd);
      s.off("webrtc:announce", onWebrtcAnn);
      s.off("screen:share:stop", onStop);
      s.off("screen:stream:received", onStreamReceived);
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
        if (stream) {
          // Heuristic: accept this remote stream only if it appears to be a
          // displayMedia (screen/window) stream. For display streams some browsers
          // expose settings like `displaySurface` or `mediaSource` on the video track.
          // If we detect no display-like setting, treat it as a camera stream and ignore
          // so camera tiles do not overwrite the shared application screen.
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
                // fallback: inspect label for common words
                const label = (t as any).label || "";
                if (/screen|display|monitor|window/i.test(label)) {
                  isDisplay = true;
                  break;
                }
              } catch (e) {}
            }
          } catch (e) {}

          if (!isDisplay) {
            console.debug(
              "index.tsx: ignoring remote stream because it does not look like a display stream",
              { id }
            );
            return;
          }

          setSharingStream(stream);
          if (id) setSharingBy(id);
        }
      } catch (e) {}
    };
    // ParticipantsGrid will notify us via the onDisplayStream prop instead
    // of using global DOM events.
    return () => {};
  }, []);

  // local stream (sharer) — set sharingStream so sharer sees their own shared screen
  useEffect(() => {
    const onLocal = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        console.debug("index.tsx: screen:share:local-stream", {
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
      <div className="flex flex-col h-screen ">
        {/* Live Status Bar */}
        <div className="bg-white shadow-md rounded-lg flex justify-between items-center px-6 py-3">
          {/* Left: Live info */}
          <div className="flex items-center gap-3">
            <GiAerialSignal className="text-green-500 text-xl" />
            <p className="text-sm font-medium text-gray-700">Started: 5:01</p>
          </div>

          {/* Debug: socket id and session id (dev) */}
          <div className="text-xs text-gray-500 ml-4">
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
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4 text-gray-700">
            <FiUserPlus className="text-lg hover:text-blue-600 cursor-pointer transition" />
            <SlCamrecorder className="text-lg hover:text-red-600 cursor-pointer transition" />
            <IoExitOutline className="text-lg hover:text-gray-800 cursor-pointer transition" />

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
        </div>

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
                {sharingBy ? (
                  <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center rounded-lg">
                    {sharingStream ? (
                      <video
                        autoPlay
                        playsInline
                        muted={sharingBy !== (socketRef.current?.id || "local")}
                        className="w-full h-full object-contain rounded-lg"
                        ref={(el) => {
                          if (el && sharingStream) {
                            try {
                              el.srcObject = sharingStream;
                              el.play().catch(() => {});
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
                {showUsers ? (
                  <ParticipantsGrid
                    onRemoteStream={(id: string, stream: MediaStream) => {
                      /* logic giữ nguyên */
                    }}
                  />
                ) : (
                  <Chatbox />
                )}
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
                <ParticipantsGrid
                  compact
                  onRemoteStream={(id, stream) => {
                    /* giữ nguyên */
                  }}
                />
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
