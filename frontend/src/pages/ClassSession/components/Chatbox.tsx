import React, { useContext, useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { SocketContext } from "../index";
import CommentService from "@services/comment.service";
import authMemory from "@services/authMemory";

const Chatbox = () => {
  const socket = useContext(SocketContext as any) as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => setMessages((s) => [...s, m]);
    socket.on("chat:message", onMsg);
    return () => socket.off("chat:message", onMsg);
  }, [socket]);

  const send = () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const user = authMemory.getUser() || null;
    const fromName = user?.name || "Me";
    const optimistic = {
      _optimistic: true,
      text: trimmed,
      from: fromName,
      ts: Date.now(),
    };

    setMessages((s) => [...s, optimistic]);
    try {
      socket?.emit("chat:message", {
        text: trimmed,
        from: fromName,
        ts: optimistic.ts,
      });
    } catch (e) {}

    const sessionId = (window as any).__CURRENT_CLASSSESSION_ID || null;
    (async () => {
      if (!sessionId) return setText("");

      try {
        const created = await CommentService.create(sessionId, trimmed);
        const normalized = {
          id: created?.id,
          text: created?.message ?? created?.text,
          from: created?.userName ?? created?.from ?? fromName,
          ts: created?.createdAt
            ? new Date(created.createdAt).getTime()
            : created?.ts ?? Date.now(),
        };
        setMessages((list) =>
          list.map((m) =>
            m._optimistic && m.ts === optimistic.ts ? normalized : m
          )
        );
      } catch (err) {
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

  const currentUser = authMemory.getUser()?.name || "Me";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 text-sm text-gray-600 font-medium bg-white/70 backdrop-blur-sm rounded-t-2xl">
        💬 Class Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((m, idx) => {
          const from = m.from ?? m.userName ?? "Me";
          const textVal = m.text ?? m.message ?? "";
          const tsVal =
            typeof m.ts === "number"
              ? m.ts
              : Date.parse(m.ts || m.createdAt || "") || null;
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
                className={`group relative max-w-[75%] px-4 py-2 rounded-2xl text-sm transition-all ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                {!isMe && (
                  <div className="font-semibold text-gray-600 text-xs mb-1">
                    {from}
                  </div>
                )}
                <div>{textVal}</div>
                <div
                  className={`text-[10px] mt-1 ${
                    isMe ? "text-blue-100" : "text-gray-400"
                  } text-right`}
                >
                  {displayTime}
                </div>
                {m._failed && (
                  <div className="absolute -bottom-4 right-2 text-[10px] text-red-500">
                    ✖ Failed to send
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
          <button
            onClick={send}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm transition"
          >
            <IoMdSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
