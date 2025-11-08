import React, { useContext, useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { SocketContext } from "../index";
import CommentService from "@services/comment.service";

const Chatbox = () => {
  const socket = useContext(SocketContext as any) as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => {
      setMessages((s) => [...s, m]);
    };
    socket.on("chat:message", onMsg);
    return () => {
      try {
        socket.off("chat:message", onMsg);
      } catch (e) {}
    };
  }, [socket]);

  const send = () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const user = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!)
      : null;
    const fromName = user?.name || "Me";
    const optimistic = {
      _optimistic: true,
      text: trimmed,
      from: fromName,
      ts: Date.now(),
    };

    // show optimistic message immediately
    setMessages((s) => [...s, optimistic]);

    // emit realtime message so other clients see it
    try {
      socket?.emit("chat:message", {
        text: trimmed,
        from: fromName,
        ts: optimistic.ts,
      });
    } catch (e) {
      console.warn("socket emit failed", e);
    }

    // persist to backend
    const sessionId = (window as any).__CURRENT_CLASSSESSION_ID || null;
    (async () => {
      if (!sessionId) {
        // no session id — leave optimistic message
        setText("");
        return;
      }

      // ensure user id present for backend X-User-Id header
      let userObj = null;
      try {
        userObj = JSON.parse(localStorage.getItem("user") || "null");
      } catch (e) {}
      if (!userObj || !userObj.id) {
        console.warn("Cannot persist comment: no user.id in localStorage");
        setMessages((list) =>
          list.map((m) =>
            m._optimistic && m.ts === optimistic.ts
              ? { ...m, _failed: true }
              : m
          )
        );
        setText("");
        return;
      }

      try {
        const created = await CommentService.create(sessionId, trimmed);
        // normalize server DTO to client message shape: { text, from, ts }
        const normalized = {
          id: created?.id,
          text: created?.message ?? created?.text,
          from: created?.userName ?? created?.from ?? fromName,
          ts: created?.createdAt
            ? new Date(created.createdAt).getTime()
            : created?.ts ?? Date.now(),
        };
        // replace optimistic entry with normalized server-provided message
        setMessages((list) =>
          list.map((m) =>
            m._optimistic && m.ts === optimistic.ts ? normalized : m
          )
        );
      } catch (err: any) {
        console.error("Failed to save comment", err);
        setMessages((list) =>
          list.map((m) =>
            m._optimistic && m.ts === optimistic.ts
              ? { ...m, _failed: true }
              : m
          )
        );
      } finally {
        setText("");
      }
    })();
  };

  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!).name
    : "Me";

  return (
    <div className="bg-gray-50 rounded-xl shadow-md p-4 flex flex-col h-full max-h-full">
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {messages.map((m, idx) => {
          // normalize fields from either optimistic or server shapes
          const from = m.from ?? m.userName ?? "Me";
          const textVal = m.text ?? m.message ?? "";
          let tsVal: number | null = null;
          if (typeof m.ts === "number") tsVal = m.ts;
          else if (typeof m.ts === "string") {
            const parsed = Date.parse(m.ts);
            tsVal = isNaN(parsed) ? null : parsed;
          } else if (m.createdAt) {
            const parsed = Date.parse(m.createdAt);
            tsVal = isNaN(parsed) ? null : parsed;
          }

          const displayTime = tsVal
            ? new Date(tsVal).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          const isMe = from === currentUser;

          return (
            <div
              key={idx}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-lg text-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                }`}
              >
                {!isMe && (
                  <div className="font-semibold text-gray-600 mb-1">{from}</div>
                )}
                <div>{textVal}</div>
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {displayTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Type a message..."
        />
        <button
          onClick={send}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
        >
          <IoMdSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
