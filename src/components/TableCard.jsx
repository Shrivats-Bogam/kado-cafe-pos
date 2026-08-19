import { useRef, useCallback } from "react";
import { Users, Clock, ShoppingBag, ArrowRight, Zap, StickyNote, MapPin, Edit2 } from "lucide-react";
import TableStatusBadge from "./TableStatusBadge.jsx";
import { currency, orderTotal, formatElapsedTime } from "../lib/currency.js";

export const TABLE_SHAPES = [
  { id: "square", label: "Square", icon: "□", desc: "Standard 2-4 capacity" },
  { id: "round", label: "Round", icon: "○", desc: "Circular booth seating" },
  { id: "rectangle", label: "Rectangle", icon: "▭", desc: "Long family dining" },
  { id: "sofa", label: "Sofa / Lounge", icon: "🛋", desc: "Lounge sofa seating" },
];

export default function TableCard({ table, menuItems, onOpenTable, onEditTable, onOpenMoreMenu }) {
  const { grandTotal } = orderTotal(table.items || [], menuItems);
  const elapsedTimeStr = formatElapsedTime(table.startedAt);
  const touchTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const capacity = table.capacity || 4;
  const isRush = table.priority === "Rush";
  const isOccupied = (table.items && table.items.length > 0) || table.status !== "available";

  const getShapeIcon = (shapeId) => {
    const found = TABLE_SHAPES.find((s) => s.id === shapeId);
    return found ? found.icon : "□";
  };

  const shapeIcon = getShapeIcon(table.shape);
  const areaLabel = table.area || table.type || "Indoor";

  // Determine Primary Action Button Label based on PART 1 Rules:
  // Available -> [Start Order]
  // Occupied / Preparing -> [Continue Order]
  // Ready -> [View Order]
  // Billing -> [Open Bill]
  let primaryActionLabel = "Start Order";
  if (table.status === "ready" || table.kitchenStatus === "Ready") {
    primaryActionLabel = "View Order";
  } else if (table.status === "billing" || table.status === "payment_pending") {
    primaryActionLabel = "Open Bill";
  } else if (isOccupied) {
    primaryActionLabel = "Continue Order";
  }

  // Mobile long press (500ms) for action menu
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
      data-testid={`table-card-${table.number}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenTable(table.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${table.name || `Table ${table.number}`}, Capacity ${capacity}, Section ${areaLabel}, status ${table.status}`}
      className={`group relative rounded-2xl bg-stone-900 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer select-none h-full min-h-[240px] p-5 shadow-md hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500/80 ${
        isRush
          ? "border-purple-500/80 ring-2 ring-purple-500/40 shadow-purple-900/20"
          : isOccupied
          ? "border-amber-500/40 hover:border-amber-500/80 shadow-amber-900/10"
          : "border-stone-800 hover:border-stone-700"
      }`}
    >
      {/* Rush Overlay Badge */}
      {isRush && (
        <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs animate-pulse z-10">
          <Zap size={11} /> RUSH
        </div>
      )}

      {/* Header: Table Name (large) & Section + Capacity */}
      <div className="flex items-start justify-between pb-3 border-b border-stone-800/80">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="text-2xl shrink-0 text-amber-400" title={`Shape: ${table.shape || "Square"}`}>
            {shapeIcon}
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-xl font-bold text-stone-50 group-hover:text-amber-300 transition-colors leading-tight truncate">
              {table.name || `Table ${table.number}`}
            </h3>
            <p className="text-[11px] text-stone-400 font-semibold mt-0.5 flex items-center gap-1">
              <MapPin size={10} className="text-amber-500 shrink-0" />
              <span className="uppercase tracking-wider truncate">{areaLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid={`edit-table-btn-${table.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onEditTable) onEditTable(table);
              else if (onOpenMoreMenu) onOpenMoreMenu(table);
            }}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 border border-stone-700 transition cursor-pointer"
            title="Edit Table"
          >
            <Edit2 size={13} className="text-amber-400" />
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-stone-200 bg-stone-800/90 border border-stone-700/80 px-2.5 py-1 rounded-xl shadow-inner min-h-[32px]">
            <Users size={13} className="text-amber-400" />
            {capacity}
          </span>
        </div>
      </div>

      {/* Body: Status Badge, Customer Name, Large Bill Amount & Items/Timer */}
      <div className="py-3.5 flex flex-col gap-2.5 my-auto">
        <div className="flex items-center justify-between gap-2">
          <TableStatusBadge status={table.status} priority={table.priority} />
          {table.notes && (
            <span className="text-[10px] text-stone-400 truncate max-w-[110px] flex items-center gap-1 bg-stone-800 px-2 py-0.5 rounded-md border border-stone-750" title={table.notes}>
              <StickyNote size={10} className="text-amber-400 shrink-0" /> {table.notes}
            </span>
          )}
        </div>

        {/* Current Customer */}
        <p className="text-xs font-semibold text-stone-300 truncate">
          {table.customerName ? table.customerName : "Walk-in Guest"}
        </p>

        {/* Current Bill Total & Items / Time */}
        {table.items && table.items.length > 0 ? (
          <div>
            <span className="text-2xl font-extrabold text-amber-400 tracking-tight block">
              {currency(grandTotal)}
            </span>
            <p className="text-xs text-stone-400 font-medium mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <ShoppingBag size={12} className="text-stone-400" />
                {table.items.length} item{table.items.length !== 1 ? "s" : ""}
              </span>
              {elapsedTimeStr && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-sky-400">
                    <Clock size={11} /> {elapsedTimeStr}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="py-1">
            <span className="text-sm font-medium text-stone-500 block italic">
              No active order
            </span>
            <p className="text-xs text-emerald-400 font-medium mt-0.5">
              Ready for guests
            </p>
          </div>
        )}
      </div>

      {/* Primary Action Footer */}
      <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-bold text-stone-400 group-hover:text-amber-300 transition-colors min-h-[36px]">
        <span>{primaryActionLabel}</span>
        <ArrowRight size={15} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-400" />
      </div>
    </div>
  );
}
