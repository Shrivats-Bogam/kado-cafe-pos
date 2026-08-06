import { Clock, Zap, Flame } from "lucide-react";
import { Card, Pill } from "../components/ui.jsx";
import { KITCHEN_STATES } from "../data/defaults.js";
import { minutesSince } from "../lib/currency.js";

// Kitchen display system.
// Rush orders appear at the TOP of the queue with a red badge and pulsing border.
// Cards are sorted by: rush-first, then oldest-order-first (longest waiting).

export default function KitchenView({ tables, parcels, menuItems, onCycleKitchen, onSetPriority, currentUser }) {
  const next = (s) => KITCHEN_STATES[Math.min(KITCHEN_STATES.indexOf(s) + 1, KITCHEN_STATES.length - 1)];

  const active = tables
    .filter((t) => t.items.length > 0 && t.kitchenStatus !== "Served")
    .sort((a, b) => {
      // Rush first
      const ap = a.priority === "Rush" ? 1 : 0;
      const bp = b.priority === "Rush" ? 1 : 0;
      if (ap !== bp) return bp - ap;
      // Then oldest-first (New before Cooking before Ready — within same priority)
      const ak = KITCHEN_STATES.indexOf(a.kitchenStatus);
      const bk = KITCHEN_STATES.indexOf(b.kitchenStatus);
      if (ak !== bk) return ak - bk;
      // Then earliest startedAt
      const at = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return at - bt;
    });

  const activeParcels = parcels
    .filter((p) => p.status === "Preparing" || p.status === "Ready")
    .sort((a, b) => {
      const ai = a.priority === "Rush" ? 1 : 0;
      const bi = b.priority === "Rush" ? 1 : 0;
      if (ai !== bi) return bi - ai;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-stone-300">Table Orders</h3>
        <span className="text-xs text-stone-500">({active.length} active)</span>
        {active.some((t) => t.priority === "Rush") && (
          <span className="text-xs text-rose-400 flex items-center gap-1 animate-pulse"><Flame size={12} /> Rush in queue</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {active.length === 0 && <p className="text-sm text-stone-500">No active table orders.</p>}
        {active.map((t) => {
          const isRush = t.priority === "Rush";
          const mins = minutesSince(t.startedAt);
          return (
            <Card
              key={t.id}
              className={`p-4 flex flex-col gap-2 ${
                isRush ? "border-rose-600 border-2 ring-2 ring-rose-500/30" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-serif text-stone-50 flex items-center gap-2">
                  Table {t.number}
                  {isRush && (
                    <button
                      onClick={() => onSetPriority && onSetPriority(t.id, "Normal")}
                      title="Tap to demote back to Normal"
                      className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse"
                    >
                      <Zap size={10} /> RUSH
                    </button>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500 flex items-center gap-1"><Clock size={11} /> {mins}m</span>
                  <Pill tone={
                    t.kitchenStatus === "New" ? "amber"
                    : t.kitchenStatus === "Cooking" ? "sky"
                    : t.kitchenStatus === "Ready" ? "emerald"
                    : "stone"
                  }>{t.kitchenStatus}</Pill>
                </div>
              </div>

              <ul className="text-sm text-stone-400 list-disc list-inside">
                {t.items.map((it) => {
                  const mi = menuItems.find((m) => m.id === it.menuItemId);
                  return (
                    <li key={it.menuItemId}>
                      <span>{mi?.name} ×{it.qty}</span>
                      {it.notes && <span className="block text-xs text-amber-400 font-medium italic pl-4">Note: {it.notes}</span>}
                    </li>
                  );
                })}
              </ul>

              {t.kitchenStatus !== "Served" && (
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => onCycleKitchen("table", t.id, next(t.kitchenStatus))}
                    className="flex-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-sm py-2 font-medium"
                  >Mark {next(t.kitchenStatus)}</button>
                  {onSetPriority && !isRush && (
                    <button
                      onClick={() => onSetPriority(t.id, "Rush")}
                      title="Mark as rush"
                      className="rounded-lg bg-stone-800 px-2.5 text-rose-400 hover:bg-rose-600 hover:text-white text-sm py-2"
                    >
                      <Zap size={14} />
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <h3 className="text-sm font-medium text-stone-300">Parcel Orders</h3>
        <span className="text-xs text-stone-500">({activeParcels.length} active)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeParcels.length === 0 && <p className="text-sm text-stone-500">No active parcel orders.</p>}
        {activeParcels.map((p) => {
          const isRush = p.priority === "Rush";
          return (
            <Card key={p.id} className={`p-4 flex flex-col gap-2 ${isRush ? "border-rose-600 border-2" : ""}`}>
              <div className="flex justify-between items-center">
                <span className="font-serif text-stone-50">{p.customerName || "Parcel"}</span>
                <Pill tone="sky">{p.status}</Pill>
              </div>
              <ul className="text-sm text-stone-400 list-disc list-inside">
                {p.items.map((it) => {
                  const mi = menuItems.find((m) => m.id === it.menuItemId);
                  return (
                    <li key={it.menuItemId}>
                      <span>{mi?.name} ×{it.qty}</span>
                      {it.notes && <span className="block text-xs text-amber-400 font-medium italic pl-4">Note: {it.notes}</span>}
                    </li>
                  );
                })}
              </ul>
              {p.notes && <p className="text-xs text-stone-400 italic bg-stone-900/60 p-2 rounded-lg border border-stone-800">Note: {p.notes}</p>}
              {p.status === "Preparing" && (
                <button
                  onClick={() => onCycleKitchen("parcel", p.id, "Ready")}
                  className="mt-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-sm py-2"
                >Mark Ready</button>
              )}
              {p.status === "Ready" && (
                <button
                  onClick={() => onCycleKitchen("parcel", p.id, "Delivered")}
                  className="mt-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-sm py-2"
                >Mark Delivered</button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
