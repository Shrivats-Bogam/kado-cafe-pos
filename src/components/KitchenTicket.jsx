import { Clock, Zap, CheckCircle2, Play, Check, StickyNote, Printer } from "lucide-react";
import { Card, Pill } from "./ui.jsx";
import { formatElapsedTime } from "../lib/currency.js";
import { hardwarePrinter } from "../lib/hardwarePrinter.js";

export default function KitchenTicket({ 
  ticket, 
  menuItems, 
  elapsedMinutes,
  urgencyLevel,
  displayMode,
  isSelected,
  onToggleSelect,
  onAction 
}) {
  const isLarge = displayMode === "large";
  const isRush = ticket.priority === "Rush";
  const isTable = ticket.type === "table";
  const status = ticket.status; // "New", "Cooking", "Ready", "Preparing"
  const elapsedTimeStr = formatElapsedTime(ticket.createdAt);

  // Border & Urgency class assignment (PART 6)
  let borderClass = "border-stone-800";
  if (isRush) {
    borderClass = "border-purple-500/80 ring-2 ring-purple-500/30 bg-stone-900/90";
  } else if (urgencyLevel === "Urgent") {
    borderClass = "border-rose-600 border-2 ring-2 ring-rose-500/30 bg-stone-900/90";
  } else if (urgencyLevel === "Attention") {
    borderClass = "border-amber-500 border-2 bg-stone-900/80";
  }

  // Next action configuration (PART 3 & PART 11)
  let primaryAction = null;

  if (isTable) {
    if (status === "New") {
      primaryAction = {
        label: "Start Cooking",
        icon: Play,
        nextStatus: "Cooking",
        colorClass: "bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-100 border border-stone-700",
      };
    } else if (status === "Cooking") {
      primaryAction = {
        label: "Mark Ready",
        icon: CheckCircle2,
        nextStatus: "Ready",
        colorClass: "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold",
      };
    } else if (status === "Ready") {
      primaryAction = {
        label: "Serve",
        icon: Check,
        nextStatus: "Served",
        colorClass: "bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold",
      };
    }
  } else {
    // Parcel
    if (status === "New" || status === "Preparing") {
      primaryAction = {
        label: "Mark Ready",
        icon: CheckCircle2,
        nextStatus: "Ready",
        colorClass: "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold",
      };
    } else if (status === "Ready") {
      primaryAction = {
        label: "Delivered",
        icon: Check,
        nextStatus: "Delivered",
        colorClass: "bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold",
      };
    }
  }

  return (
    <Card
      className={`relative flex flex-col justify-between transition-all cursor-pointer select-none rounded-2xl ${borderClass} ${
        isSelected ? "ring-2 ring-amber-500 bg-stone-900" : "bg-stone-900/90"
      } ${isLarge ? "p-5 min-h-[280px]" : "p-4 min-h-[240px]"}`}
      onClick={() => onToggleSelect(ticket.id)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3.5 left-3.5 w-5 h-5 rounded border border-stone-600 flex items-center justify-center bg-stone-950/90 pointer-events-none z-10">
        {isSelected && <Check size={14} className="text-amber-500" />}
      </div>

      {/* Header: Identifier, Rush Badge & Timer / Status */}
      <div className="flex justify-between items-start pl-7 pb-2.5 border-b border-stone-800/80">
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className={`font-serif font-bold text-stone-50 truncate ${isLarge ? "text-xl" : "text-base"}`}>
              {isTable ? `TABLE ${ticket.number}` : `PARCEL #${ticket.number}`}
            </span>
            {isRush && (
              <span className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 animate-pulse tracking-wide shrink-0">
                <Zap size={10} /> RUSH
              </span>
            )}
          </div>
          <span className={`text-stone-400 font-medium truncate ${isLarge ? "text-xs" : "text-[11px]"}`}>
            {ticket.customerName ? ticket.customerName : (isTable ? "Walk-in Guest" : "Takeaway")}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`font-mono font-bold flex items-center gap-1 ${
            isRush || urgencyLevel === "Urgent" ? "text-rose-400" : 
            urgencyLevel === "Attention" ? "text-amber-400" : "text-stone-400"
          } ${isLarge ? "text-sm" : "text-xs"}`}>
            <Clock size={isLarge ? 14 : 12} /> {elapsedTimeStr || `${elapsedMinutes}m`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Print Kitchen Order Ticket (KOT)"
              onClick={(e) => {
                e.stopPropagation();
                hardwarePrinter.printKOT(ticket, { receiptWidth: "80mm" });
              }}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition cursor-pointer"
            >
              <Printer size={12} />
            </button>
            <Pill tone={
              status === "New" ? "amber"
              : status === "Cooking" || status === "Preparing" ? "sky"
              : status === "Ready" ? "emerald"
              : "stone"
            }>{status}</Pill>
          </div>
        </div>
      </div>

      {/* Body: Items & Special Instructions */}
      <div className={`flex-1 py-3 my-1 overflow-y-auto ${isLarge ? "text-base" : "text-sm"}`}>
        <ul className="text-stone-300 list-none space-y-2.5">
          {ticket.items.map((it, idx) => {
            const mi = menuItems.find((m) => m.id === it.menuItemId);
            return (
              <li key={`${it.menuItemId}-${idx}`} className="flex flex-col">
                <div className="flex items-start gap-2">
                  <span className="font-extrabold text-amber-400 min-w-[24px] text-sm shrink-0">{it.qty}×</span>
                  <span className="font-bold text-stone-100 leading-snug">{mi?.name || "Item"}</span>
                </div>
                {it.notes && (
                  <span className="block text-xs text-amber-300 font-medium italic pl-8 mt-0.5">
                    ↳ Note: "{it.notes}"
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Order-Level Note */}
        {ticket.notes && (
          <div className="mt-3 text-xs text-stone-300 italic bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 flex items-start gap-1.5 leading-relaxed">
            <StickyNote size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-200 not-italic mr-1">Order Note:</span>
              <span>"{ticket.notes}"</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Button (PART 3 & 11) */}
      {primaryAction && (
        <div className="pt-2 border-t border-stone-800/80 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(ticket, primaryAction.nextStatus);
            }}
            className={`w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer ${primaryAction.colorClass} ${
              isLarge ? "min-h-[52px] text-base" : "min-h-[44px] text-xs"
            }`}
          >
            <primaryAction.icon size={isLarge ? 18 : 15} /> {primaryAction.label}
          </button>
        </div>
      )}
    </Card>
  );
}
