import { Clock, Zap, CheckCircle2, Play, Check } from "lucide-react";
import { Card, Pill } from "./ui.jsx";

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
  
  // Style based on urgency
  let borderClass = "border-stone-800";
  if (urgencyLevel === "Urgent") borderClass = "border-rose-600 border-2 ring-2 ring-rose-500/30";
  else if (urgencyLevel === "Attention") borderClass = "border-amber-500 border-2";

  // Actions logic based on current status
  const isTable = ticket.type === "table";
  const status = ticket.status; // "New", "Cooking", "Ready" for tables; "Preparing", "Ready" for parcels
  
  // Normalize next actions
  let primaryAction = null; // { label, icon, nextStatus, colorClass }

  if (isTable) {
    if (status === "New") {
      primaryAction = { label: "Start Cooking", icon: Play, nextStatus: "Cooking", colorClass: "bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200" };
    } else if (status === "Cooking") {
      primaryAction = { label: "Ready", icon: CheckCircle2, nextStatus: "Ready", colorClass: "bg-amber-500 hover:bg-amber-400 text-stone-950" };
    } else if (status === "Ready") {
      primaryAction = { label: "Served", icon: Check, nextStatus: "Served", colorClass: "bg-emerald-500 hover:bg-emerald-400 text-stone-950" };
    }
  } else {
    // Parcel
    if (status === "Preparing") {
      primaryAction = { label: "Ready", icon: CheckCircle2, nextStatus: "Ready", colorClass: "bg-amber-500 hover:bg-amber-400 text-stone-950" };
    } else if (status === "Ready") {
      primaryAction = { label: "Delivered", icon: Check, nextStatus: "Delivered", colorClass: "bg-emerald-500 hover:bg-emerald-400 text-stone-950" };
    }
  }

  return (
    <Card
      className={`relative flex flex-col gap-3 transition-all cursor-pointer ${borderClass} ${
        isSelected ? "ring-2 ring-amber-500 bg-stone-900/80" : ""
      } ${isLarge ? "p-5" : "p-4"}`}
      onClick={() => onToggleSelect(ticket.id)}
    >
      {/* Selection Overlay Checkbox (Visual only, handled by parent onClick) */}
      <div className="absolute top-3 left-3 w-5 h-5 rounded border border-stone-600 flex items-center justify-center bg-stone-950/80 pointer-events-none">
        {isSelected && <Check size={14} className="text-amber-500" />}
      </div>

      <div className="flex justify-between items-start pl-8">
        <div className="flex flex-col">
          <span className={`font-serif text-stone-50 flex items-center gap-2 ${isLarge ? "text-xl" : "text-base"}`}>
            {ticket.type === "table" ? `Table ${ticket.number}` : "Parcel"}
            {ticket.priority === "Rush" && (
              <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse tracking-wide">
                <Zap size={10} /> RUSH
              </span>
            )}
          </span>
          <span className={`text-stone-400 font-medium ${isLarge ? "text-sm" : "text-xs"}`}>
            {ticket.customerName || "Walk-in"}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold flex items-center gap-1 ${
              urgencyLevel === "Urgent" ? "text-rose-400" : 
              urgencyLevel === "Attention" ? "text-amber-400" : "text-stone-400"
            } ${isLarge ? "text-base" : "text-sm"}`}>
              <Clock size={isLarge ? 14 : 12} /> {elapsedMinutes}m
            </span>
          </div>
          <Pill tone={
            status === "New" ? "amber"
            : status === "Cooking" || status === "Preparing" ? "sky"
            : status === "Ready" ? "emerald"
            : "stone"
          }>{status}</Pill>
        </div>
      </div>

      <div className={`flex-1 border-y border-stone-800/60 py-3 my-1 overflow-y-auto ${isLarge ? "text-base" : "text-sm"}`}>
        <ul className="text-stone-300 list-none space-y-2">
          {ticket.items.map((it, idx) => {
            const mi = menuItems.find((m) => m.id === it.menuItemId);
            return (
              <li key={`${it.menuItemId}-${idx}`} className="flex flex-col">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-500 min-w-[20px]">{it.qty}x</span>
                  <span className="font-medium text-stone-200 leading-snug">{mi?.name || "Unknown Item"}</span>
                </div>
                {it.notes && (
                  <span className="block text-xs text-amber-400 font-medium italic pl-7 mt-0.5">
                    {it.notes}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {ticket.notes && (
          <div className="mt-3 text-xs text-stone-400 italic bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/80 leading-relaxed">
            <span className="font-bold text-stone-300 not-italic mr-1">Note:</span>
            {ticket.notes}
          </div>
        )}
      </div>

      {primaryAction && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(ticket, primaryAction.nextStatus);
            }}
            className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg ${primaryAction.colorClass} ${isLarge ? "min-h-[56px] text-lg" : "min-h-[48px] text-sm"}`}
          >
            <primaryAction.icon size={isLarge ? 20 : 16} /> {primaryAction.label}
          </button>
        </div>
      )}
    </Card>
  );
}
