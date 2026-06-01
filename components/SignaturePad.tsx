"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  // Devuelve la firma como archivo PNG (o null si se limpia).
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasContent = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Ajusta el tamaño en píxeles del canvas a su tamaño en pantalla.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
    }
  }, []);

  const pos = (event: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const start = (event: React.PointerEvent) => {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: React.PointerEvent) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasContent.current = true;
    if (empty) setEmpty(false);
  };

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent.current) {
      onChange(null);
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        onChange(null);
        return;
      }
      onChange(new File([blob], "firma.png", { type: "image/png" }));
    }, "image/png");
  }, [onChange]);

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-40 border-2 border-dashed border-slate-300 rounded-lg bg-white touch-none"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Firma aquí
          </span>
        )}
      </div>
      <div className="flex justify-end mt-1.5">
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="text-xs font-semibold text-slate-500 hover:text-red-500 disabled:opacity-60"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
