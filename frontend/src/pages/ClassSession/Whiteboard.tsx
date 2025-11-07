import React, { useRef, useEffect, useState, useContext } from "react";
import { SocketContext } from "./index";
import { useAppSelector } from "../../store/hooks";

type Tool = "pen" | "eraser" | "text" | "rect";

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const rectDrawing = useRef(false);
  const savedImageRef = useRef<ImageData | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState<string>("#000000");
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("pen");
  const [fontSize, setFontSize] = useState<number>(20);
  const [textOverlay, setTextOverlay] = useState<{
    x: number;
    y: number;
    value: string;
    visible: boolean;
  }>({ x: 0, y: 0, value: "", visible: false });

  // get current user from redux to determine permissions
  const user = useAppSelector((s) => s.user.user as any);
  const isTeacher = user?.role === "TEACHER";

  // get socket from context
  const socket = useContext(SocketContext as any) as any;

  // multi-whiteboard support (in-memory)
  const [boards, setBoards] = useState<number[]>([0]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState<number>(0);
  // store dataUrls for each board id
  const [boardImages, setBoardImages] = useState<Record<number, string | null>>(
    { 0: null }
  );

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
    // ensure default composite mode
    ctx.globalCompositeOperation = "source-over";
    // simple resize handler to maintain size
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

  // update drawing style when color/tool/linewidth/font change
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.lineWidth = lineWidth;
    if (tool === "eraser") {
      // use destination-out for true erasing
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)"; // strokeStyle ignored in destination-out but keep
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
  }, [color, lineWidth, tool, fontSize]);

  useEffect(() => {
    if (ctxRef.current) ctxRef.current.lineWidth = lineWidth;
  }, [lineWidth]);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (e instanceof TouchEvent) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const ev = e as MouseEvent;
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isTeacher) return; // only teachers can start drawing
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (tool === "pen" || tool === "eraser") {
      drawing.current = true;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      // send start-draw event (normalized coordinates)
      try {
        const canvas = canvasRef.current!;
        const nx = pos.x / canvas.clientWidth;
        const ny = pos.y / canvas.clientHeight;
        console.debug("emit whiteboard:begin", {
          x: nx,
          y: ny,
          tool,
          color,
          lineWidth,
        });
        socket?.emit("whiteboard:begin", {
          x: nx,
          y: ny,
          tool,
          color,
          lineWidth,
        });
      } catch (err) {}
    } else if (tool === "rect") {
      // start rectangle drawing
      rectDrawing.current = true;
      startPos.current = pos;
      // save current canvas image for preview
      try {
        savedImageRef.current = ctx.getImageData(
          0,
          0,
          canvasRef.current!.width,
          canvasRef.current!.height
        );
      } catch (err) {
        savedImageRef.current = null;
      }
    } else if (tool === "text") {
      // show text overlay input at clicked position
      const container = containerRef.current!;
      setTextOverlay({ x: pos.x, y: pos.y, value: "", visible: true });
    }
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isTeacher) return; // block move/draw for non-teachers
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (drawing.current) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      try {
        const canvas = canvasRef.current!;
        const nx = pos.x / canvas.clientWidth;
        const ny = pos.y / canvas.clientHeight;
        console.debug("emit whiteboard:draw", {
          x: nx,
          y: ny,
          tool,
          color,
          lineWidth,
        });
        socket?.emit("whiteboard:draw", {
          x: nx,
          y: ny,
          tool,
          color,
          lineWidth,
        });
      } catch (err) {}
    } else if (rectDrawing.current && startPos.current) {
      // preview rectangle by restoring saved image and drawing rect on top
      if (savedImageRef.current) {
        // restore saved image
        ctx.putImageData(savedImageRef.current, 0, 0);
      } else {
        // just clear and continue
        // ctx.clearRect(0,0, canvasRef.current!.width, canvasRef.current!.height)
      }
      const sx = startPos.current.x;
      const sy = startPos.current.y;
      const w = pos.x - sx;
      const h = pos.y - sy;
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.strokeRect(sx, sy, w, h);
      ctx.closePath();
    }
  };

  const stop = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isTeacher) return; // ignore stop if drawing wasn't allowed
    const ctx = ctxRef.current!;
    if (drawing.current) {
      drawing.current = false;
      ctx.closePath();
      try {
        console.debug("emit whiteboard:end");
        socket?.emit("whiteboard:end", {});
      } catch (err) {}
    }
    if (rectDrawing.current) {
      // finalize rectangle onto canvas
      rectDrawing.current = false;
      const pos = e ? getPos(e as unknown as MouseEvent) : null;
      if (startPos.current && pos) {
        const sx = startPos.current.x;
        const sy = startPos.current.y;
        const w = pos.x - sx;
        const h = pos.y - sy;
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.strokeRect(sx, sy, w, h);
        ctx.closePath();
      }
      startPos.current = null;
      savedImageRef.current = null;
    }
  };

  // subscribe to socket events to render remote drawings
  useEffect(() => {
    if (!socket) return;

    const onBegin = (payload: any) => {
      console.debug("recv whiteboard:begin", payload);
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      const x = payload.x * canvas.clientWidth;
      const y = payload.y * canvas.clientHeight;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onDraw = (payload: any) => {
      console.debug("recv whiteboard:draw", payload);
      const ctx = ctxRef.current!;
      const canvas = canvasRef.current!;
      const x = payload.x * canvas.clientWidth;
      const y = payload.y * canvas.clientHeight;
      ctx.lineTo(x, y);
      ctx.strokeStyle = payload.color || ctx.strokeStyle;
      ctx.lineWidth = payload.lineWidth || ctx.lineWidth;
      ctx.stroke();
    };
    const onEnd = () => {
      console.debug("recv whiteboard:end");
      const ctx = ctxRef.current!;
      try {
        ctx.closePath();
      } catch (e) {}
    };

    socket.on("whiteboard:begin", onBegin);
    socket.on("whiteboard:draw", onDraw);
    socket.on("whiteboard:end", onEnd);

    return () => {
      try {
        socket.off("whiteboard:begin", onBegin);
        socket.off("whiteboard:draw", onDraw);
        socket.off("whiteboard:end", onEnd);
      } catch (e) {}
    };
  }, [socket]);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    // clear taking devicePixelRatio into account
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const saveCurrentBoardImage = () => {
    const canvas = canvasRef.current!;
    try {
      const data = canvas.toDataURL("image/png");
      const id = boards[currentBoardIndex];
      setBoardImages((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      // ignore
    }
  };

  const loadBoardImage = (id: number) => {
    const data = boardImages[id];
    const ctx = ctxRef.current!;
    const canvas = canvasRef.current!;
    clear();
    if (data) {
      const img = new Image();
      img.onload = () => {
        // draw into the canvas respecting pixel ratio
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // scale image to canvas CSS size
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const ratio = devicePixelRatio || 1;
        ctx.drawImage(img, 0, 0, canvas.width / ratio, canvas.height / ratio);
        ctx.restore();
      };
      img.src = data;
    }
  };

  const addBoard = () => {
    // save current board first
    saveCurrentBoardImage();
    const id = Date.now();
    setBoards((b) => [...b, id]);
    setBoardImages((prev) => ({ ...prev, [id]: null }));
    setCurrentBoardIndex(boards.length); // new index
    // clear canvas after a tick
    setTimeout(() => clear(), 10);
  };

  const switchBoard = (index: number) => {
    if (index === currentBoardIndex) return;
    saveCurrentBoardImage();
    setCurrentBoardIndex(index);
    // load after state updates
    setTimeout(() => {
      const id = boards[index];
      loadBoardImage(id);
    }, 10);
  };

  const download = () => {
    const canvas = canvasRef.current!;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.png";
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center mb-2 flex-wrap">
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setTool("pen")}
            disabled={!isTeacher}
            title={!isTeacher ? "Read-only: teachers only" : "Pen"}
            className={`px-2 py-1 border rounded ${
              tool === "pen" ? "bg-gray-200" : ""
            } ${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool("eraser")}
            disabled={!isTeacher}
            title={!isTeacher ? "Read-only: teachers only" : "Eraser"}
            className={`px-2 py-1 border rounded ${
              tool === "eraser" ? "bg-gray-200" : ""
            } ${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Eraser
          </button>
          <button
            onClick={() => setTool("rect")}
            disabled={!isTeacher}
            title={!isTeacher ? "Read-only: teachers only" : "Rect"}
            className={`px-2 py-1 border rounded ${
              tool === "rect" ? "bg-gray-200" : ""
            } ${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Rect
          </button>
          <button
            onClick={() => setTool("text")}
            disabled={!isTeacher}
            title={!isTeacher ? "Read-only: teachers only" : "Text"}
            className={`px-2 py-1 border rounded ${
              tool === "text" ? "bg-gray-200" : ""
            } ${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Text
          </button>
        </div>

        <label className="flex items-center gap-1">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={`w-8 h-8 p-0 ${
              !isTeacher ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Color"
            disabled={!isTeacher}
          />
        </label>

        <label className="flex items-center gap-1">
          <input
            type="range"
            min={1}
            max={50}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            title="Brush size"
            disabled={!isTeacher}
            className={`${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </label>

        <label className="flex items-center gap-1">
          <input
            type="range"
            min={8}
            max={72}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            title="Font size"
            disabled={!isTeacher}
            className={`${!isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </label>

        <button
          onClick={clear}
          className={`px-2 py-1 border rounded ${
            !isTeacher ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!isTeacher}
        >
          Clear
        </button>
        <button onClick={download} className="px-2 py-1 border rounded">
          Download
        </button>

        <div className="ml-2 flex items-center gap-2">
          <button
            onClick={addBoard}
            disabled={!isTeacher}
            title={
              !isTeacher ? "Only teachers can add boards" : "Add whiteboard"
            }
            className={`px-2 py-1 border rounded ${
              !isTeacher ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            + New Board
          </button>
          <div className="flex gap-1 items-center">
            {boards.map((b, idx) => (
              <button
                key={b}
                onClick={() => switchBoard(idx)}
                className={`px-2 py-1 border rounded ${
                  idx === currentBoardIndex ? "bg-gray-200" : ""
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {!isTeacher && (
          <div className="ml-2 text-sm text-gray-500">Read-only</div>
        )}
      </div>

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
            onBlur={() => {
              // draw text onto canvas
              const ctx = ctxRef.current!;
              ctx.save();
              ctx.font = `${fontSize}px sans-serif`;
              ctx.fillStyle = color;
              // y offset so text sits visually at click
              ctx.fillText(
                textOverlay.value || "",
                textOverlay.x,
                textOverlay.y + fontSize
              );
              ctx.restore();
              setTextOverlay({ x: 0, y: 0, value: "", visible: false });
            }}
            style={{
              position: "absolute",
              left: textOverlay.x,
              top: textOverlay.y,
              zIndex: 40,
              background: "transparent",
              color: color,
              fontSize: fontSize,
              border: "1px dashed #999",
              outline: "none",
              resize: "none",
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
      </div>
    </div>
  );
};

export default Whiteboard;
