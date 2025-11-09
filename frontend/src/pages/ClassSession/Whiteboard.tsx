import React, { useRef, useEffect, useState, useContext } from "react";
import { SocketContext } from "./index";
import { useAppSelector } from "../../store/hooks";

type Tool = "pen" | "eraser" | "text" | "rect";

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sharedVideoRef = useRef<HTMLVideoElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const rectDrawing = useRef(false);
  const savedImageRef = useRef<ImageData | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState("#000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<Tool>("pen");
  const [fontSize, setFontSize] = useState(20);
  const [textOverlay, setTextOverlay] = useState({
    x: 0,
    y: 0,
    value: "",
    visible: false,
  });

  const user = useAppSelector((s) => s.user.user as any);
  const isTeacher = user?.role === "TEACHER";

  const socket = useContext(SocketContext as any) as any;

  const [boards, setBoards] = useState<number[]>([0]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [boardImages, setBoardImages] = useState<Record<number, string | null>>(
    { 0: null }
  );
  const [sharingStream, setSharingStream] = useState<MediaStream | null>(null);
  const [sharingBy, setSharingBy] = useState<string | null>(null);
  // per-board stroke/text/rect history so boards remain editable
  const [histories, setHistories] = useState<Record<number, any[]>>({ 0: [] });
  const historiesRef = useRef<Record<number, any[]>>(histories);
  useEffect(() => {
    historiesRef.current = histories;
  }, [histories]);

  // persistence key per class-session (falls back to local)
  const getStorageKey = () => {
    const sid = (window as any).__CURRENT_CLASSSESSION_ID || "local";
    return `whiteboard:${sid}`;
  };

  // load saved state from localStorage on mount
  useEffect(() => {
    try {
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.boards && Array.isArray(parsed.boards)) {
          setBoards(parsed.boards);
        }
        if (typeof parsed?.currentBoardIndex === "number") {
          setCurrentBoardIndex(parsed.currentBoardIndex);
        }
        if (parsed?.histories) {
          // Coerce histories keys to numbers (localStorage stores object keys as strings)
          const coerced: Record<number, any[]> = {};
          for (const k of Object.keys(parsed.histories || {})) {
            const n = Number(k);
            coerced[n] = parsed.histories[k] || [];
          }
          setHistories(coerced);
          // replay immediately from parsed data
          setTimeout(() => {
            try {
              const idx = parsed?.currentBoardIndex ?? 0;
              const bid = (parsed?.boards && parsed.boards[idx]) || boards[0];
              if (bid !== undefined) replayEvents(coerced[Number(bid)] || []);
            } catch (e) {}
          }, 50);
        }
      }
    } catch (e) {
      console.warn("whiteboard: failed to load saved state", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save to localStorage whenever boards/histories/current index changes
  useEffect(() => {
    try {
      const key = getStorageKey();
      const payload = { boards, currentBoardIndex, histories };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn("whiteboard: failed to persist state", e);
    }
  }, [boards, currentBoardIndex, histories]);

  // ensure we persist latest edits on unload/navigation using refs
  useEffect(() => {
    const saveNow = () => {
      try {
        const key = getStorageKey();
        const payload = {
          boards: boardsRef.current,
          currentBoardIndex: currentBoardIndexRef.current,
          histories: historiesRef.current,
        };
        // use localStorage (synchronous)
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) {}
    };
    window.addEventListener("beforeunload", saveNow);
    return () => window.removeEventListener("beforeunload", saveNow);
  }, []);

  // refs to avoid stale closures in global listeners
  const boardsRef = useRef(boards);
  const currentBoardIndexRef = useRef(currentBoardIndex);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);
  useEffect(() => {
    currentBoardIndexRef.current = currentBoardIndex;
  }, [currentBoardIndex]);

  const appendHistory = (boardId: number, ev: any) => {
    const bid = Number(boardId);
    setHistories((prev) => {
      const list = prev[bid] ? [...prev[bid]] : [];
      list.push(ev);
      return { ...prev, [bid]: list };
    });
  };

  const replayHistory = (boardId: number) => {
    const bid = Number(boardId);
    const events = historiesRef.current[bid] || [];
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    clearLocal();
    try {
      for (const ev of events) {
        const type = ev.type;
        const payload = ev.payload || ev;
        if (type === "begin") {
          ctx.beginPath();
          ctx.lineWidth = payload.lineWidth || lineWidth;
          ctx.strokeStyle = payload.color || color;
          if (payload.tool === "eraser")
            ctx.globalCompositeOperation = "destination-out";
          else ctx.globalCompositeOperation = "source-over";
          ctx.moveTo(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight
          );
        } else if (type === "draw") {
          ctx.lineTo(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight
          );
          ctx.stroke();
        } else if (type === "end") {
          ctx.closePath();
        } else if (type === "rect") {
          ctx.lineWidth = payload.lineWidth || lineWidth;
          ctx.strokeStyle = payload.color || color;
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeRect(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight,
            payload.w * canvas.clientWidth,
            payload.h * canvas.clientHeight
          );
        } else if (type === "text") {
          ctx.font = `${payload.fontSize}px sans-serif`;
          ctx.fillStyle = payload.color || color;
          ctx.fillText(
            payload.text,
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight + payload.fontSize
          );
        }
      }
    } catch (e) {}
  };

  const replayEvents = (events: any[]) => {
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    clearLocal();
    try {
      for (const ev of events || []) {
        const type = ev.type;
        const payload = ev.payload || ev;
        if (type === "begin") {
          ctx.beginPath();
          ctx.lineWidth = payload.lineWidth || lineWidth;
          ctx.strokeStyle = payload.color || color;
          if (payload.tool === "eraser")
            ctx.globalCompositeOperation = "destination-out";
          else ctx.globalCompositeOperation = "source-over";
          ctx.moveTo(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight
          );
        } else if (type === "draw") {
          ctx.lineTo(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight
          );
          ctx.stroke();
        } else if (type === "end") {
          ctx.closePath();
        } else if (type === "rect") {
          ctx.lineWidth = payload.lineWidth || lineWidth;
          ctx.strokeStyle = payload.color || color;
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeRect(
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight,
            payload.w * canvas.clientWidth,
            payload.h * canvas.clientHeight
          );
        } else if (type === "text") {
          ctx.font = `${payload.fontSize}px sans-serif`;
          ctx.fillStyle = payload.color || color;
          ctx.fillText(
            payload.text,
            payload.x * canvas.clientWidth,
            payload.y * canvas.clientHeight + payload.fontSize
          );
        }
      }
    } catch (e) {}
  };

  // save current canvas image into boardImages for the given board id
  const saveCurrentBoardImage = (boardId?: number) => {
    try {
      const canvas = canvasRef.current!;
      const id = boardId ?? boards[currentBoardIndex];
      const dataUrl = canvas.toDataURL();
      setBoardImages((prev) => ({ ...prev, [id]: dataUrl }));
    } catch (e) {}
  };

  const loadBoardImage = (boardId: number) => {
    const dataUrl = boardImages[boardId];
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    if (!dataUrl) {
      clearLocal();
      return;
    }
    try {
      const img = new Image();
      img.onload = () => {
        try {
          // draw at device pixel resolution, temporarily reset transforms
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } catch (e) {}
      };
      img.src = dataUrl;
    } catch (e) {}
  };

  const prevBoard = () => {
    if (currentBoardIndex <= 0) return;
    const nextIdx = currentBoardIndex - 1;
    setCurrentBoardIndex(nextIdx);
    const id = boards[nextIdx];
    setTimeout(() => replayHistory(id), 0);
  };

  const nextBoard = () => {
    if (currentBoardIndex >= boards.length - 1) return;
    const nextIdx = currentBoardIndex + 1;
    setCurrentBoardIndex(nextIdx);
    const id = boards[nextIdx];
    setTimeout(() => replayHistory(id), 0);
  };

  // notify UI about current board state so parent can display current/total
  useEffect(() => {
    try {
      const evt = new CustomEvent("whiteboard:state", {
        detail: { current: currentBoardIndex + 1, total: boards.length },
      });
      window.dispatchEvent(evt);
    } catch (e) {}
  }, [boards, currentBoardIndex]);

  /** Initialize canvas */
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;
    ctx.globalCompositeOperation = "source-over";

    const onResize = () => {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.putImageData(image, 0, 0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Update drawing style */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.lineWidth = lineWidth;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
  }, [color, lineWidth, tool]);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    };
  };

  /** Start drawing / rectangle / text */
  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isTeacher) return;
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (tool === "pen" || tool === "eraser") {
      drawing.current = true;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      console.debug("emit whiteboard:begin", {
        x: pos.x,
        y: pos.y,
        tool,
        color,
        lineWidth,
        socketId: socket?.id,
      });
      const payload = {
        x: pos.x / canvasRef.current!.clientWidth,
        y: pos.y / canvasRef.current!.clientHeight,
        tool,
        color,
        lineWidth,
        boardId: boards[currentBoardIndex],
      };
      socket?.emit("whiteboard:raw", {
        type: "begin",
        payload: { x: pos.x, y: pos.y, tool },
      });
      socket?.emit("whiteboard:begin", payload);
      appendHistory(payload.boardId, { type: "begin", payload });
    } else if (tool === "rect") {
      rectDrawing.current = true;
      startPos.current = pos;
      savedImageRef.current = ctx.getImageData(
        0,
        0,
        canvasRef.current!.width,
        canvasRef.current!.height
      );
    } else if (tool === "text") {
      setTextOverlay({ x: pos.x, y: pos.y, value: "", visible: true });
    }
  };

  /** Drawing / rectangle preview */
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isTeacher) return;
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (drawing.current) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      console.debug("emit whiteboard:draw", {
        x: pos.x,
        y: pos.y,
        tool,
        socketId: socket?.id,
      });
      const payload = {
        x: pos.x / canvasRef.current!.clientWidth,
        y: pos.y / canvasRef.current!.clientHeight,
        tool,
        color,
        lineWidth,
        boardId: boards[currentBoardIndex],
      };
      socket?.emit("whiteboard:raw", {
        type: "draw",
        payload: { x: pos.x, y: pos.y, tool },
      });
      socket?.emit("whiteboard:draw", payload);
      appendHistory(payload.boardId, { type: "draw", payload });
    } else if (rectDrawing.current && startPos.current) {
      if (savedImageRef.current) ctx.putImageData(savedImageRef.current, 0, 0);
      const sx = startPos.current.x,
        sy = startPos.current.y;
      const w = pos.x - sx,
        h = pos.y - sy;
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.strokeRect(sx, sy, w, h);
      ctx.closePath();
    }
  };

  /** Stop drawing / finalize rectangle */
  const stop = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isTeacher) return;
    const ctx = ctxRef.current!;
    if (drawing.current) {
      drawing.current = false;
      ctx.closePath();
      console.debug("emit whiteboard:end", { socketId: socket?.id });
      const payload = { boardId: boards[currentBoardIndex] };
      socket?.emit("whiteboard:raw", { type: "end" });
      socket?.emit("whiteboard:end", payload);
      appendHistory(payload.boardId, { type: "end", payload });
    }
    if (rectDrawing.current && startPos.current && e) {
      rectDrawing.current = false;
      const pos = getPos(e as unknown as MouseEvent);
      const sx = startPos.current.x,
        sy = startPos.current.y;
      const w = pos.x - sx,
        h = pos.y - sy;
      ctx.strokeRect(sx, sy, w, h);
      const rectPayload = {
        x: sx / canvasRef.current!.clientWidth,
        y: sy / canvasRef.current!.clientHeight,
        w: w / canvasRef.current!.clientWidth,
        h: h / canvasRef.current!.clientHeight,
        color,
        lineWidth,
        boardId: boards[currentBoardIndex],
      };
      console.debug("emit whiteboard:rect", rectPayload);
      try {
        socket?.emit("whiteboard:raw", { type: "rect", payload: rectPayload });
      } catch (e) {}
      socket?.emit("whiteboard:rect", rectPayload);
      appendHistory(rectPayload.boardId, {
        type: "rect",
        payload: rectPayload,
      });
      startPos.current = null;
      savedImageRef.current = null;
    }
  };

  /** Clear canvas */
  const clearLocal = () => {
    const ctx = ctxRef.current!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    ctx.restore();
  };

  const clear = () => {
    if (!isTeacher) return;
    clearLocal();
    console.debug("emit whiteboard:clear", {
      boardId: boards[currentBoardIndex],
      socketId: socket?.id,
    });
    try {
      socket?.emit("whiteboard:raw", { type: "clear" });
    } catch (e) {}
    socket?.emit("whiteboard:clear", { boardId: boards[currentBoardIndex] });
  };

  /** Text overlay onBlur */
  const commitText = () => {
    const value = textOverlay.value.trim();
    if (!value)
      return setTextOverlay({ x: 0, y: 0, value: "", visible: false });
    const ctx = ctxRef.current!;
    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(value, textOverlay.x, textOverlay.y + fontSize);
    ctx.restore();

    const textPayload = {
      x: textOverlay.x / canvasRef.current!.clientWidth,
      y: textOverlay.y / canvasRef.current!.clientHeight,
      text: value,
      fontSize,
      color,
      boardId: boards[currentBoardIndex],
    };
    socket?.emit("whiteboard:text", textPayload);
    console.debug("emit whiteboard:text", {
      socketId: socket?.id,
      text: value,
    });
    try {
      socket?.emit("whiteboard:raw", {
        type: "text",
        payload: { text: value },
      });
    } catch (e) {}
    appendHistory(boards[currentBoardIndex], {
      type: "text",
      payload: textPayload,
    });
    setTextOverlay({ x: 0, y: 0, value: "", visible: false });
  };
  useEffect(() => {
    if (!socket) return;

    const onBegin = (payload: any) => {
      if (payload.from === socket.id) return;
      // ensure board history exists and append
      const bid = payload.boardId ?? boards[currentBoardIndex];
      appendHistory(bid, { type: "begin", payload });
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      ctx.beginPath();
      ctx.moveTo(
        payload.x * canvas.clientWidth,
        payload.y * canvas.clientHeight
      );
      ctx.lineWidth = payload.lineWidth;
      ctx.strokeStyle = payload.color;
      if (payload.tool === "eraser")
        ctx.globalCompositeOperation = "destination-out";
      else ctx.globalCompositeOperation = "source-over";
    };

    const onDraw = (payload: any) => {
      if (payload.from === socket.id) return;
      const bid = payload.boardId ?? boards[currentBoardIndex];
      appendHistory(bid, { type: "draw", payload });
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      ctx.lineTo(
        payload.x * canvas.clientWidth,
        payload.y * canvas.clientHeight
      );
      ctx.stroke();
    };

    const onEnd = (payload: any) => {
      if (payload.from === socket.id) return;
      const bid = payload.boardId ?? boards[currentBoardIndex];
      appendHistory(bid, { type: "end", payload });
      ctxRef.current?.closePath();
    };

    const onRect = (payload: any) => {
      if (payload.from === socket.id) return;
      const bid = payload.boardId ?? boards[currentBoardIndex];
      appendHistory(bid, { type: "rect", payload });
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      ctx.lineWidth = payload.lineWidth;
      ctx.strokeStyle = payload.color;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(
        payload.x * canvas.clientWidth,
        payload.y * canvas.clientHeight,
        payload.w * canvas.clientWidth,
        payload.h * canvas.clientHeight
      );
    };

    const onText = (payload: any) => {
      if (payload.from === socket.id) return;
      const bid = payload.boardId ?? boards[currentBoardIndex];
      appendHistory(bid, { type: "text", payload });
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      ctx.font = `${payload.fontSize}px sans-serif`;
      ctx.fillStyle = payload.color;
      ctx.fillText(
        payload.text,
        payload.x * canvas.clientWidth,
        payload.y * canvas.clientHeight + payload.fontSize
      );
    };

    socket.on("whiteboard:begin", onBegin);
    socket.on("whiteboard:draw", onDraw);
    socket.on("whiteboard:end", onEnd);
    socket.on("whiteboard:rect", onRect);
    socket.on("whiteboard:text", onText);
    socket.on("whiteboard:clear", (payload: any) => {
      try {
        if (payload?.from === socket.id) return;
        console.debug("received whiteboard:clear", payload);
        clearLocal();
      } catch (e) {}
    });
    socket.on("whiteboard:addBoard", (payload: any) => {
      try {
        if (payload?.from === socket.id) return;
        console.debug("received whiteboard:addBoard", payload);
        const newId = Number(payload.boardId);
        setBoards((prev) => {
          const next = [...prev, newId];
          setCurrentBoardIndex(next.length - 1);
          return next;
        });
        setHistories((prev) => ({ ...prev, [newId]: [] }));
        clearLocal();
      } catch (e) {}
    });
    socket.on("whiteboard:ack", (ack: any) => {
      try {
        console.debug("whiteboard:ack received", ack);
      } catch (e) {}
    });

    // also listen for remote screen-share stop via socket
    socket.on("screen:share:stop", (payload: any) => {
      try {
        setSharingStream(null);
        setSharingBy(null);
      } catch (e) {}
    });

    // prev/next listeners are registered globally in a separate effect

    return () => {
      socket.off("whiteboard:begin", onBegin);
      socket.off("whiteboard:draw", onDraw);
      socket.off("whiteboard:end", onEnd);
      socket.off("whiteboard:rect", onRect);
      socket.off("whiteboard:text", onText);
      socket.off("whiteboard:clear");
      socket.off("whiteboard:addBoard");
      socket.off("screen:share:stop");
      // nothing here (global listeners cleaned up in their own effect)
    };
  }, [socket]);

  // Listen for participant-remote-stream events from ParticipantsGrid
  useEffect(() => {
    const onRemote = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        const id = ev?.detail?.id;
        console.debug("Whiteboard: received remote stream", {
          id,
          hasStream: !!stream,
        });
        if (stream) {
          setSharingStream(stream);
          if (id) setSharingBy(id);
        }
      } catch (e) {}
    };
    const onLocal = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        console.debug("Whiteboard: received local share stream", {
          hasStream: !!stream,
        });
        if (stream) setSharingStream(stream);
      } catch (e) {}
    };
    const onStopLocal = () => {
      setSharingStream(null);
      setSharingBy(null);
    };

    window.addEventListener(
      "screen:participant-remote-stream",
      onRemote as any
    );
    window.addEventListener("screen:share:local-stream", onLocal as any);
    window.addEventListener("screen:share:stop-local", onStopLocal as any);
    return () => {
      window.removeEventListener(
        "screen:participant-remote-stream",
        onRemote as any
      );
      window.removeEventListener("screen:share:local-stream", onLocal as any);
      window.removeEventListener("screen:share:stop-local", onStopLocal as any);
    };
  }, []);

  // attach sharingStream to the dedicated video ref when it changes
  useEffect(() => {
    const v = sharedVideoRef.current;
    if (v && sharingStream) {
      try {
        v.srcObject = sharingStream;
        v.muted = sharingBy !== socket?.id;
        v.play().catch((err) =>
          console.debug("Whiteboard: shared video play rejected", err)
        );
      } catch (e) {
        console.warn("Whiteboard: failed attaching shared stream to video", e);
      }
    }
    return () => {};
  }, [sharingStream, sharingBy, socket]);

  // Global prev/next listeners that always work and read the latest refs
  useEffect(() => {
    const onPrev = () => {
      const idx = currentBoardIndexRef.current;
      if (idx <= 0) return;
      const nextIdx = idx - 1;
      setCurrentBoardIndex(nextIdx);
      const id = boardsRef.current[nextIdx];
      setTimeout(() => replayHistory(id), 0);
    };
    const onNext = () => {
      const idx = currentBoardIndexRef.current;
      if (idx >= boardsRef.current.length - 1) return;
      const nextIdx = idx + 1;
      setCurrentBoardIndex(nextIdx);
      const id = boardsRef.current[nextIdx];
      setTimeout(() => replayHistory(id), 0);
    };
    window.addEventListener("whiteboard:prev", onPrev as any);
    window.addEventListener("whiteboard:next", onNext as any);
    return () => {
      window.removeEventListener("whiteboard:prev", onPrev as any);
      window.removeEventListener("whiteboard:next", onNext as any);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-2 items-center mb-2 flex-wrap">
        {["pen", "eraser", "rect", "text"].map((t) => (
          <button
            key={t}
            onClick={() => setTool(t as Tool)}
            disabled={!isTeacher}
            className={`px-2 py-1 border rounded ${
              tool === t ? "bg-gray-200" : ""
            } ${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={!isTeacher}
          className="w-8 h-8 p-0"
        />
        <input
          type="range"
          min={1}
          max={50}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          disabled={!isTeacher}
          title="Brush size"
        />
        <input
          type="range"
          min={8}
          max={72}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          disabled={!isTeacher}
          title="Font size"
        />
        <button
          onClick={clear}
          disabled={!isTeacher}
          className="px-2 py-1 border rounded"
        >
          Clear
        </button>
        <button
          onClick={() => {
            // create a new board
            if (!isTeacher) return;
            const canvas = canvasRef.current!;
            try {
              // save current board image to boardImages
              const prevId = boards[currentBoardIndex];
              const dataUrl = canvas.toDataURL();
              setBoardImages((prev) => ({ ...prev, [prevId]: dataUrl }));
            } catch (e) {}
            const newId = Date.now();
            setBoards((prev) => {
              const next = [...prev, newId];
              setCurrentBoardIndex(next.length - 1);
              return next;
            });
            setBoardImages((prev) => ({ ...prev, [newId]: null }));
            clearLocal();
            console.debug("emit whiteboard:addBoard", {
              boardId: newId,
              socketId: socket?.id,
            });
            try {
              socket?.emit("whiteboard:raw", {
                type: "addBoard",
                payload: { boardId: newId },
              });
            } catch (e) {}
            socket?.emit("whiteboard:addBoard", { boardId: newId });
          }}
          disabled={!isTeacher}
          className="px-2 py-1 border rounded"
        >
          Add board
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 border rounded overflow-hidden relative"
      >
        {textOverlay.visible && (
          <textarea
            autoFocus
            value={textOverlay.value}
            onChange={(e) =>
              setTextOverlay((s) => ({ ...s, value: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitText();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTextOverlay({ x: 0, y: 0, value: "", visible: false });
              }
            }}
            onBlur={commitText}
            style={{
              position: "absolute",
              left: textOverlay.x,
              top: textOverlay.y,
              zIndex: 40,
              background: "transparent",
              color,
              fontSize,
              border: "1px dashed #999",
              outline: "none",
              resize: "none",
              minWidth: "100px",
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-[600px] bg-white touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={stop}
        />
        {/* overlay shared screen on top of canvas but allow drawing (pointer-events none) */}
        {sharingBy && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 pointer-events-none">
            {sharingStream ? (
              <div className="w-full h-full relative pointer-events-none">
                <video
                  autoPlay
                  playsInline
                  muted={sharingBy !== socket?.id}
                  className="w-full h-full object-contain"
                  ref={sharedVideoRef}
                />
                {/* clickable fallback button for autoplay-restricted browsers (button must accept pointer events) */}
                {sharingBy !== socket?.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    <button
                      className="px-4 py-2 bg-white text-black rounded shadow"
                      onClick={() => {
                        try {
                          const v = sharedVideoRef.current;
                          if (!v) return;
                          v.muted = false;
                          v.play().catch((err) =>
                            console.warn("play failed", err)
                          );
                          console.debug(
                            "Whiteboard: user initiated play for shared stream"
                          );
                        } catch (err) {
                          console.warn("click to view failed", err);
                        }
                      }}
                    >
                      Click to view
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white">{`${sharingBy} is sharing`}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
