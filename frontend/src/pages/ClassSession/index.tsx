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

export const SocketContext = createContext<Socket | null>(null);
import { GiAerialSignal } from "react-icons/gi";
import { HiOutlineUsers } from "react-icons/hi2";
import { BsChatLeftText } from "react-icons/bs";
import { MdCallEnd } from "react-icons/md";
import { RiArrowRightDoubleFill } from "react-icons/ri";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { set } from "react-hook-form";
const ClassSession = () => {
  const [showUsers, setShowUsers] = useState(false);
  const [showChatbox, setShowChatbox] = useState(true);
  const [wbPage, setWbPage] = useState({ current: 1, total: 1 });
  const [pendingShareRequests, setPendingShareRequests] = useState<
    { id: string; name: string }[]
  >([]);
  const [sharingBy, setSharingBy] = useState<string | null>(null);
  const [approvedToShare, setApprovedToShare] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = React.useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string | null>(null);

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
        const user = JSON.parse(localStorage.getItem("user") || "{}");
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
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}") || {};
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
        const by = payload?.by || null;
        setSharingBy(by || null);
      } catch (e) {}
    };

    const onStop = (payload: any) => {
      try {
        setSharingBy(null);
      } catch (e) {}
    };

    s.on("screen:request", onRequest);
    s.on("screen:request:approved", onApproved);
    s.on("screen:share:announce", onAnnounce);
    s.on("screen:share:stop", onStop);

    return () => {
      s.off("screen:request", onRequest);
      s.off("screen:request:approved", onApproved);
      s.off("screen:share:announce", onAnnounce);
      s.off("screen:share:stop", onStop);
    };
  }, [socketState]);

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
        {/* live */}
        <div className="shadow  flex justify-between items-center p-2 py-2 px-6 ">
          <div className="flex justify-center items-center gap-2 ">
            <GiAerialSignal />
            <p>Started: 5:01</p>
          </div>
          <div className="flex gap-4  text-lg float-right  ">
            <FiUserPlus />
            <SlCamrecorder />
            <IoExitOutline />
            <button
              title="Share screen"
              onClick={async () => {
                try {
                  const s = socketState || socketRef.current;
                  const user =
                    JSON.parse(localStorage.getItem("user") || "{}") || {};
                  const isTeacher = user?.role === "TEACHER";
                  if (isTeacher || approvedToShare) {
                    // permission granted: start getDisplayMedia on user gesture
                    try {
                      const disp = await (
                        navigator.mediaDevices as any
                      ).getDisplayMedia({ video: true, audio: true });
                      // dispatch local stream so ParticipantsGrid will set it and renegotiate
                      window.dispatchEvent(
                        new CustomEvent("screen:share:local-stream", {
                          detail: { stream: disp },
                        } as any)
                      );
                      setApprovedToShare(false);
                      if (s && s.connected)
                        s.emit("screen:share:announce", { by: s.id });
                    } catch (e) {
                      console.warn("getDisplayMedia failed", e);
                    }
                  } else {
                    // students request permission
                    if (s && s.connected)
                      s.emit("screen:request", {
                        from: s.id,
                        userName: user?.name || "Student",
                      });
                  }
                } catch (e) {}
              }}
              className="inline-flex items-center"
            >
              <TbScreenShare />
            </button>
            <MdDashboard />
            <div className="ml-4 flex items-center gap-2">
              <div
                className={`px-2 py-1 rounded ${
                  socketConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {socketConnected
                  ? `Socket: ${socketId?.slice(0, 6)}`
                  : "Socket: disconnected"}
              </div>
              <button
                onClick={() => {
                  try {
                    const s = socketState || socketRef.current;
                    if (s && s.connected) {
                      s.emit("chat:message", {
                        text: "test",
                        from: "local-test",
                        ts: Date.now(),
                      });
                    }
                  } catch (e) {}
                }}
                className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Test Socket
              </button>
            </div>
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

        <div className="flex justify-between gap-2 p-1 flex-1 rounded-2xl">
          <div
            className={`flex gap-2   ${
              showUsers || showChatbox ? "w-4/5" : "w-full"
            } `}
          >
            <section className="flex-1 flex flex-col justify-end p-1 relative   mx-1 ">
              <div className="flex flex-col gap-4 text-xl border border-gray-300 p-2 absolute top-1/2 -translate-y-1/2 ">
                <IoIosSend className="cursor-pointer" />
                <BsEraserFill className="cursor-pointer" />
                <RxText className="cursor-pointer" />
                <FaPenClip className="cursor-pointer" />
              </div>

              <div className="h-full">
                {sharingBy ? (
                  <div className="h-full w-full bg-black text-white flex items-center justify-center flex-col">
                    <div className="text-2xl">
                      {sharingBy === socketRef.current?.id
                        ? "You are sharing your screen"
                        : `${sharingBy} is sharing`}
                    </div>
                    {sharingBy === socketRef.current?.id && (
                      <div className="mt-2">
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded"
                          onClick={() => {
                            try {
                              const s = socketRef.current;
                              window.dispatchEvent(
                                new CustomEvent("screen:share:stop-local", {})
                              );
                              if (s && s.connected)
                                s.emit("screen:share:stop", { by: s.id });
                            } catch (e) {}
                          }}
                        >
                          Stop sharing
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Whiteboard />
                )}
              </div>

              <div className="flex justify-between items-center  mt-auto ">
                <div className="flex shadow border border-gray-300 p-1 gap-2 ">
                  <RiArrowGoBackFill
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:prev"))
                    }
                  />
                  <RiArrowGoForwardFill
                    onClick={() =>
                      window.dispatchEvent(new Event("whiteboard:next"))
                    }
                  />
                </div>
                <div className="flex gap-4 text-2xl">
                  <HiOutlineUsers
                    onClick={() => {
                      setShowUsers(!showUsers);
                      setShowChatbox(false);
                    }}
                    className="cursor-pointer"
                  />
                  <MdCallEnd />
                  <BsChatLeftText
                    onClick={() => {
                      setShowChatbox(!showChatbox);
                      setShowUsers(false);
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex border border-gray-300 items-center justify-center shadow p-1">
                  <div className="flex gap-2 items-center justify-center  p-1 ">
                    <RiArrowLeftSLine
                      onClick={() =>
                        window.dispatchEvent(new Event("whiteboard:prev"))
                      }
                      className="cursor-pointer text-xl"
                    />
                    <input
                      type="text"
                      className="outline-none w-12 text-center"
                      readOnly
                      value={`${wbPage.current}/${wbPage.total}`}
                    />
                    <RiArrowRightSLine
                      onClick={() =>
                        window.dispatchEvent(new Event("whiteboard:next"))
                      }
                      className="cursor-pointer text-xl"
                    />
                  </div>
                  <PiProjectorScreenLight className="text-xl " />
                </div>
              </div>
            </section>
          </div>
          {showUsers || showChatbox ? (
            <div className="flex flex-col gap-4 w-1/5 relative">
              <div
                onClick={() => {
                  setShowUsers(false);
                  setShowChatbox(false);
                }}
                className="absolute border h-10 flex items-center top-1/2 -translate-y-1/2 
           cursor-pointer rounded border-gray-300  -left-4 bg-white  "
              >
                <RiArrowRightDoubleFill />
              </div>
              <div className="h-full">
                {showUsers ? <ParticipantsGrid /> : <Chatbox />}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4  relative">
              <div
                onClick={() => {
                  setShowChatbox(true);
                }}
                className="absolute border h-10 flex items-center top-1/2 -translate-y-1/2 
           cursor-pointer rounded border-gray-300  -left-4 bg-white  "
              >
                <MdKeyboardDoubleArrowLeft />
              </div>
            </div>
          )}
        </div>
      </div>
    </SocketContext.Provider>
  );
};

export default ClassSession;
