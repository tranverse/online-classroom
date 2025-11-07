import React, { useContext, useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { SocketContext } from "../index";

const Chatbox = () => {
  const socket = useContext(SocketContext as any) as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => {
      console.debug("recv chat:message", m);
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
    if (!text) return;
    const payload = {
      text,
      from: localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")!).name
        : "Me",
      ts: Date.now(),
    };
    console.debug("emit chat:message", payload);
    setMessages((s) => [...s, payload]);
    try {
      socket?.emit("chat:message", payload);
    } catch (e) {}
    setText("");
  };

  return (
    <div className="bg-white rounded-lg p-3 h-full flex flex-col">
      <div className="flex-1 overflow-auto mb-3 space-y-2">
        {messages.map((m, idx) => (
          <div key={idx} className="text-sm">
            <div className="font-medium text-gray-700">{m.from}</div>
            <div className="text-gray-600">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 border rounded px-3 py-2 outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Type a message"
        />
        <button
          onClick={send}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          <IoMdSend />
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
