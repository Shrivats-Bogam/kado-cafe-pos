import { useRef, useCallback } from "react";
import { Users, Clock, QrCode, MoreVertical, Zap, BookmarkCheck, ShoppingBag, Sparkles } from "lucide-react";
import TableStatusBadge from "./TableStatusBadge.jsx";
import { currency, orderTotal, minutesSince } from "../lib/currency.js";

export default function TableCard({ table, menuItems, onOpenTable, onOpenMoreMenu }) {
  const { grandTotal } = orderTotal(table.items, menuItems);
  const mins = minutesSince(table.startedAt);
  const touchTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const capacity = table.capacity || (table.number % 3 === 0 ? 2 : table.number % 3 === 1 ? 4 : 6);
  const isReserved = table.status === "reserved" || Boolean(table.reservation);
  const isRush = table.priority === "Rush";
  const isCleaning = table.status === "cleaning";

  // Long press handler for mobile
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
    // If long press was triggered, suppress regular tap
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpenTable(table.id);
  };

  const handleMoreClick = (e) => {
    e.stopPropagation();
    if (onOpenMoreMenu) {
      onOpenMoreMenu(table);
    }
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
      className={`group relative rounded-2xl bg-stone-900 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer select-none min-h-[170px] p-4 shadow-md shadow-black/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98] ${
        isRush
          ? "border-rose-500/70 ring-2 ring-rose-500/30"
          : isCleaning
          ? "border-stone-700/60 opacity-80"
          : "border-stone-800 hover:border-stone-700"
      }`}
    >
      {/* Rush Badge Overlay */}
      {isRush && (
        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs animate-pulse z-10">
          <Zap size={10} /> RUSH
        </div>
      )}

      {/* Header: Table Number & More Button */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl font-bold text-stone-50 group-hover:text-amber-400 transition-colors">
              Table {table.number}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs text-stone-400 font-medium bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700/50">
              <Users size={12} className="text-stone-400" />
              {capacity}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleMoreClick}
              className="min-w-[48px] min-h-[48px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-stone-400 hover:text-amber-400 hover:bg-stone-800/80 transition-all active:scale-95"
              aria-label="More options"
              title="Table actions menu"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Status Badge & Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <TableStatusBadge status={table.status} />

          {isReserved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
              <BookmarkCheck size={11} /> Reserved
            </span>
          )}

          {table.qrEnabled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full" title="QR Code Enabled">
              <QrCode size={10} /> QR
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-col gap-2 pt-2 border-t border-stone-800/80 mt-auto">
        {/* Customer Name */}
        {table.customerName ? (
          <p className="text-xs font-medium text-stone-200 truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {table.customerName}
          </p>
        ) : (
          <p className="text-xs text-stone-500 italic">No customer assigned</p>
        )}

        {/* Bottom Bar: Items, Total, Timer */}
        <div className="flex items-center justify-between text-xs text-stone-400 mt-1">
          {table.items.length > 0 ? (
            <>
              <div className="flex items-center gap-1 text-stone-300 font-medium">
                <ShoppingBag size={13} className="text-amber-500" />
                <span>{table.items.length} item{table.items.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="flex items-center gap-2">
                {mins > 0 && (
                  <span className="text-[11px] text-stone-400 flex items-center gap-1 bg-stone-800/60 px-1.5 py-0.5 rounded-md">
                    <Clock size={11} className="text-sky-400" /> {mins}m
                  </span>
                )}
                <span className="text-sm font-bold text-amber-400">
                  {currency(grandTotal)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-xs text-stone-500">
              <span>Ready for guests</span>
              <span className="text-[11px] text-emerald-400/80 flex items-center gap-1 font-medium">
                <Sparkles size={11} /> Open
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
