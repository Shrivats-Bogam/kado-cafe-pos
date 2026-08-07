import { useRef, useCallback } from "react";
import { Users, Clock, ShoppingBag, ArrowRight, Zap, StickyNote } from "lucide-react";
import TableStatusBadge from "./TableStatusBadge.jsx";
import { currency, orderTotal, minutesSince } from "../lib/currency.js";
import { TABLE_SHAPES } from "./TableModal.jsx";

export default function TableCard({ table, menuItems, onOpenTable, onOpenMoreMenu }) {
  const { grandTotal } = orderTotal(table.items || [], menuItems);
  const mins = minutesSince(table.startedAt);
  const touchTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const capacity = table.capacity || 4;
  const isRush = table.priority === "Rush";

  const getShapeIcon = (shapeId) => {
    const found = TABLE_SHAPES.find((s) => s.id === shapeId);
    return found ? found.icon : "□";
  };

  const shapeIcon = getShapeIcon(table.shape);

  // Touch long press for mobile (500ms)
  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onOpenMoreMenu) {
        onOpenMoreMenu(table);
      }
    }, 500);
  }, [table, onOpenMoreMenu]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const handleCardClick = (e) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpenTable(table.id);
  };

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenTable(table.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Table ${table.number}, status ${table.status}`}
      className={`group relative rounded-2xl bg-stone-900 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer select-none h-full min-h-[220px] p-4.5 shadow-md hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98] ${
        isRush
          ? "border-rose-500/80 ring-2 ring-rose-500/40"
          : "border-stone-800 hover:border-amber-500/50"
      }`}
    >
      {/* Rush Badge Overlay */}
      {isRush && (
        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs animate-pulse z-10">
          <Zap size={11} /> RUSH
        </div>
      )}

      {/* Header: Table Number (left) & Capacity Badge (right) */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0" title={`Shape: ${table.shape || "Square"}`}>
            {shapeIcon}
          </span>
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-50 group-hover:text-amber-400 transition-colors leading-none">
              {table.name || `Table ${table.number}`}
            </h3>
            {table.type && (
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mt-0.5">{table.type}</p>
            )}
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-stone-200 bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl shadow-inner shrink-0">
          <Users size={13} className="text-amber-400" />
          {capacity}
        </span>
      </div>

      {/* Main Body: Single Status Badge, Customer Name, Large Bill Total, Items & Timer */}
      <div className="py-3 flex flex-col gap-2 my-auto">
        {/* Single Primary Status Badge */}
        <div className="flex items-center justify-between">
          <TableStatusBadge status={table.status} />
          {table.notes && (
            <span className="text-[10px] text-stone-400 truncate max-w-[100px] flex items-center gap-1 bg-stone-800 px-2 py-0.5 rounded" title={table.notes}>
              <StickyNote size={10} className="text-amber-400 shrink-0" /> {table.notes}
            </span>
          )}
        </div>

        {/* Customer Name */}
        <p className="text-xs font-semibold text-stone-300 truncate">
          {table.customerName ? table.customerName : "Walk-in Guest"}
        </p>

        {/* Large Bill Amount */}
        {table.items && table.items.length > 0 ? (
          <div>
            <span className="text-2xl font-extrabold text-amber-400 tracking-tight block">
              {currency(grandTotal)}
            </span>
            <p className="text-xs text-stone-400 font-medium mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <ShoppingBag size={12} className="text-stone-400" />
                {table.items.length} item{table.items.length !== 1 ? "s" : ""}
              </span>
              {mins > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-sky-400">
                    <Clock size={11} /> {mins} min
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="py-1">
            <span className="text-sm font-semibold text-stone-500 block italic">
              No active order
            </span>
            <p className="text-xs text-emerald-400/90 font-medium">
              Ready for guests
            </p>
          </div>
        )}
      </div>

      {/* Footer Callout: Tap to Open Order */}
      <div className="pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-bold group-hover:text-amber-300 transition-colors">
        <span>Tap to Open Order</span>
        <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
