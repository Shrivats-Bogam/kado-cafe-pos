import { useMemo } from "react";
import { X, Clock, ShoppingBag, Zap, CheckCircle2, Receipt, Coffee } from "lucide-react";
import { Card, Pill, IconButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { indexById } from "../lib/menuIndex.js";

export function TableTimeline({ table, menuItems = [], onClose }) {
  const events = useMemo(() => {
    if (!table) return [];
    const idx = indexById(menuItems);
    const list = [];

    // 1. Opened event
    if (table.startedAt) {
      list.push({
        id: "open",
        time: new Date(table.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "Table Opened",
        desc: table.customerName ? `Guest: ${table.customerName}` : "Walk-in Guest seated",
        icon: Coffee,
        tone: "emerald",
      });
    }

    // 2. Items ordered
    if (table.items && table.items.length > 0) {
      const itemSummary = table.items
        .map((it) => {
          const mi = idx.get(it.menuItemId);
          return `${it.qty}x ${mi ? mi.name : (it.name || it.menuItemId)}`;
        })
        .join(", ");

      list.push({
        id: "items",
        time: table.startedAt ? new Date(new Date(table.startedAt).getTime() + 2 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
        title: `Order Taken (${table.items.length} items)`,
        desc: itemSummary,
        icon: ShoppingBag,
        tone: "amber",
      });
    }

    // 3. Priority Rush Event
    if (table.priority === "Rush") {
      list.push({
        id: "rush",
        time: table.priorityAt ? new Date(table.priorityAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Rush",
        title: "Priority Updated to RUSH ⚡",
        desc: "Kitchen KDS notified with high priority red badge",
        icon: Zap,
        tone: "rose",
      });
    }

    // 4. Kitchen Status Event
    if (table.kitchenStatus) {
      list.push({
        id: "kitchen",
        time: "Kitchen Live",
        title: `Kitchen Status: ${table.kitchenStatus}`,
        desc: table.kitchenStatus === "Ready" ? "Food prepared & ready to serve" : "Items being prepared by kitchen crew",
        icon: CheckCircle2,
        tone: table.kitchenStatus === "Ready" ? "sky" : "purple",
      });
    }

    // 5. Billing Event
    if (table.status === "billing" || table.status === "payment_pending") {
      list.push({
        id: "billing",
        time: "Bill Printed",
        title: "Bill Generated & Printed",
        desc: `Awaiting checkout payment`,
        icon: Receipt,
        tone: "rose",
      });
    }

    return list;
  }, [table, menuItems]);

  if (!table) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card
        className="w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-150 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-semibold text-lg text-stone-50 flex items-center gap-2">
              <Clock size={18} className="text-amber-400" /> Table {table.number} Event Timeline
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Chronological audit history of table actions</p>
          </div>
          <IconButton onClick={onClose} aria-label="Close timeline">
            <X size={18} />
          </IconButton>
        </div>

        {/* Event List */}
        {events.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-6">
            No events recorded yet for Table {table.number}.
          </p>
        ) : (
          <div className="space-y-4 relative my-2 before:absolute before:left-3.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-stone-800">
            {events.map((evt) => {
              const Icon = evt.icon;
              return (
                <div key={evt.id} className="relative pl-8 flex flex-col gap-0.5">
                  <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-stone-900 flex items-center justify-center shrink-0 ${
                    evt.tone === "rose" ? "bg-rose-500" :
                    evt.tone === "emerald" ? "bg-emerald-500" :
                    evt.tone === "amber" ? "bg-amber-500" :
                    evt.tone === "purple" ? "bg-purple-500" : "bg-sky-500"
                  }`} />
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-200 flex items-center gap-1.5">
                      <Icon size={14} className={
                        evt.tone === "rose" ? "text-rose-400" :
                        evt.tone === "emerald" ? "text-emerald-400" :
                        evt.tone === "amber" ? "text-amber-400" :
                        evt.tone === "purple" ? "text-purple-300" : "text-sky-400"
                      } />
                      {evt.title}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium bg-stone-800 px-2 py-0.5 rounded">
                      {evt.time}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 pl-5 leading-relaxed">
                    {evt.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
          >
            Close Timeline
          </button>
        </div>
      </Card>
    </div>
  );
}
