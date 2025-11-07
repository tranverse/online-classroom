import React, { useState, createContext, useEffect, useRef } from "react";
import { pass } from "@config/api";
import { InfisicalSDK } from "@infisical/sdk";
import { FiUserPlus } from "react-icons/fi";
import { SlCamrecorder } from "react-icons/sl";
import { IoExitOutline } from "react-icons/io5";
import { TbScreenShare } from "react-icons/tb";
import Chatbox from "./components/Chatbox";
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
        socket.emit("join", { room: sid });
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
            <TbScreenShare />
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
                <Whiteboard />
              </div>

              <div className="flex justify-between items-center  mt-auto ">
                <div className="flex shadow border border-gray-300 p-1 gap-2 ">
                  <RiArrowGoBackFill />
                  <RiArrowGoForwardFill />
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
                    <RiArrowLeftSLine className="cursor-pointer text-xl" />
                    <input
                      type="text"
                      className="outline-none w-6"
                      defaultValue="1/2"
                    />
                    <RiArrowRightSLine className="cursor-pointer text-xl" />
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
                {showUsers ? <GridView /> : <Chatbox />}
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
