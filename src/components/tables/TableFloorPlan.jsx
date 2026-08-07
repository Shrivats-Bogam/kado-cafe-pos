import { useState, useRef } from "react";
import { Users, Move, ShoppingBag, Clock, Sparkles } from "lucide-react";
import TableStatusBadge from "./TableStatusBadge.jsx";
import { currency, orderTotal } from "../../lib/currency.js";
import { TABLE_SHAPES } from "./TableModal.jsx";

export function TableFloorPlan({
  tables = [],
  menuItems = [],
  onOpenTable,
  onOpenMoreMenu,
  onUpdateTablePosition,
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getShapeIcon = (shapeId) => {
    const found = TABLE_SHAPES.find((s) => s.id === shapeId);
    return found ? found.icon : "□";
  };

  // Drag handlers
  const handlePointerDown = (e, table) => {
    e.stopPropagation();
    setDraggingId(table.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerMove = (e) => {
    if (!draggingId || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(containerRect.width - 150, e.clientX - containerRect.left - dragOffset.x));
    const y = Math.max(10, Math.min(containerRect.height - 130, e.clientY - containerRect.top - dragOffset.y));

    if (onUpdateTablePosition) {
      onUpdateTablePosition(draggingId, { x: Math.round(x), y: Math.round(y) });
    }
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative w-full min-h-[520px] bg-stone-950 border border-stone-800 rounded-3xl p-6 overflow-hidden shadow-2xl select-none"
      style={{
        backgroundImage: "radial-gradient(#292524 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Floor Plan Zone Labels */}
      <div className="absolute top-4 left-6 pointer-events-none text-xs font-bold uppercase tracking-wider text-stone-600 border border-stone-800/80 px-3 py-1 rounded-lg bg-stone-900/50">
        🚪 Main Entrance & Foyer
      </div>

      <div className="absolute top-4 right-6 pointer-events-none text-xs font-bold uppercase tracking-wider text-stone-600 border border-stone-800/80 px-3 py-1 rounded-lg bg-stone-900/50">
        ☕ Espresso Counter & Bar
      </div>

      <div className="absolute bottom-4 right-6 pointer-events-none text-xs font-bold uppercase tracking-wider text-stone-600 border border-stone-800/80 px-3 py-1 rounded-lg bg-stone-900/50">
        👨‍🍳 Kitchen & KDS Pickup
      </div>

      <div className="absolute bottom-4 left-6 pointer-events-none text-xs font-bold uppercase tracking-wider text-stone-600 border border-stone-800/80 px-3 py-1 rounded-lg bg-stone-900/50">
        🛋 VIP Lounge & Window Seats
      </div>

      {/* Drag & Move Help Instruction */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center opacity-15">
        <Move size={48} className="mx-auto text-stone-400 mb-1" />
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Interactive Drag & Arrange Floor Canvas</p>
      </div>

      {/* Draggable Tables */}
      {tables.map((t, idx) => {
        const { grandTotal } = orderTotal(t.items || [], menuItems);
        const shapeIcon = getShapeIcon(t.shape);
        const posX = t.x ?? (idx % 4) * 190 + 30;
        const posY = t.y ?? Math.floor(idx / 4) * 150 + 60;
        const isDragging = draggingId === t.id;

        return (
          <div
            key={t.id}
            onPointerDown={(e) => handlePointerDown(e, t)}
            onClick={() => onOpenTable(t.id)}
            style={{
              position: "absolute",
              left: `${posX}px`,
              top: `${posY}px`,
              touchAction: "none",
            }}
            className={`w-[160px] p-3 rounded-2xl bg-stone-900 border transition-all duration-75 cursor-grab active:cursor-grabbing shadow-xl z-10 hover:z-30 hover:border-amber-500/60 ${
              isDragging ? "ring-2 ring-amber-400 border-amber-500 scale-105 shadow-2xl z-40" : "border-stone-800"
            }`}
          >
            {/* Table Header */}
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{shapeIcon}</span>
                <span className="font-serif font-bold text-sm text-stone-50">T-{t.number}</span>
              </div>
              <span className="text-[10px] font-bold text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                👥 {t.capacity || 4}
              </span>
            </div>

            {/* Status Badge */}
            <div className="mb-2">
              <TableStatusBadge status={t.status} />
            </div>

            {/* Customer / Total */}
            <div className="text-[11px] text-stone-400 border-t border-stone-800 pt-1.5 space-y-0.5">
              {t.customerName ? (
                <p className="font-medium text-stone-200 truncate">{t.customerName}</p>
              ) : (
                <p className="text-stone-500 italic">Walk-in</p>
              )}

              {t.items && t.items.length > 0 ? (
                <p className="font-bold text-amber-400 text-xs">
                  {currency(grandTotal)} ({t.items.length} items)
                </p>
              ) : (
                <p className="text-emerald-400/80 text-[10px] font-medium">Ready</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
