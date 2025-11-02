import React, { useRef, useEffect, useState } from "react";

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
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (tool === "pen" || tool === "eraser") {
      drawing.current = true;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
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
    const pos = getPos(e as unknown as MouseEvent);
    const ctx = ctxRef.current!;
    if (drawing.current) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
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
    const ctx = ctxRef.current!;
    if (drawing.current) {
      drawing.current = false;
      ctx.closePath();
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

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    // clear taking devicePixelRatio into account
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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
            className={`px-2 py-1 border rounded ${
              tool === "pen" ? "bg-gray-200" : ""
            }`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-2 py-1 border rounded ${
              tool === "eraser" ? "bg-gray-200" : ""
            }`}
          >
            Eraser
          </button>
          <button
            onClick={() => setTool("rect")}
            className={`px-2 py-1 border rounded ${
              tool === "rect" ? "bg-gray-200" : ""
            }`}
          >
            Rect
          </button>
          <button
            onClick={() => setTool("text")}
            className={`px-2 py-1 border rounded ${
              tool === "text" ? "bg-gray-200" : ""
            }`}
          >
            Text
          </button>
        </div>

        <label className="flex items-center gap-1">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 p-0"
            title="Color"
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
          />
        </label>

        <button onClick={clear} className="px-2 py-1 border rounded">
          Clear
        </button>
        <button onClick={download} className="px-2 py-1 border rounded">
          Download
        </button>
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
