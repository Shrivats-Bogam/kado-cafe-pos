import { useMemo } from "react";
import { encodeQR } from "../lib/qr.js";

// Self-contained QR renderer as SVG. No external deps.

export default function QRCode({ value, size = 176 }) {
  const matrix = useMemo(() => {
    try { return encodeQR(value, "M"); } catch { return null; }
  }, [value]);

  if (!matrix) {
    return <div className="text-xs text-rose-400">Could not generate QR (text too long)</div>;
  }

  const margin = 2;
  const dim = matrix.size + margin * 2;
  const cell = size / dim;
  const rects = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.get(r, c)) {
        rects.push(`M${(c + margin) * cell},${(r + margin) * cell}h${cell}v${cell}h-${cell}z`);
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="bg-white rounded-lg">
      <path d={rects.join("")} fill="#0c0a09" />
    </svg>
  );
}
