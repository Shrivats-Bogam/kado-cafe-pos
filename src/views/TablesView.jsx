import { Clock, QrCode, Zap } from "lucide-react";
import { Card, Pill } from "../components/ui.jsx";
import { TABLE_STATUS } from "../data/defaults.js";
import { currency, orderTotal, minutesSince } from "../lib/currency.js";

// Grid of cafe tables. Click to open TableOrderScreen; bottom row offers
// QR-code view, status advance, and reset to available.

export default function TablesView({ tables, menuItems, onOpenTable, onSetStatus, onShowQR }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {tables.map((t) => {
        const color = TABLE_STATUS[t.status] || TABLE_STATUS.available;
        const { grandTotal } = orderTotal(t.items, menuItems);
        const mins = minutesSince(t.startedAt);
        const tone = t.status === "available" ? "emerald"
          : t.status === "payment_pending" ? "rose"
          : "amber";

          return (
          <Card key={t.id} className={`p-0 overflow-hidden flex flex-col ${t.priority === "Rush" ? "ring-2 ring-rose-500/50" : ""}`}>
            <button onClick={() => onOpenTable(t.id)} className="text-left p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-stone-50 flex items-center gap-1.5">
                  Table {t.number}
                  {t.priority === "Rush" && (
                    <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <Zap size={9} /> RUSH
                    </span>
                  )}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
              </div>
              <Pill tone={tone}>{color.label}</Pill>
              {t.items.length > 0 && (
                <>
                  <p className="text-xs text-stone-500">{t.items.length} item(s) · {currency(grandTotal)}</p>
                  {t.customerName && <p className="text-xs text-stone-500">{t.customerName}</p>}
                  <p className="text-xs text-stone-600 flex items-center gap-1"><Clock size={11} /> {mins} min</p>
                </>
              )}
            </button>
            <div className="grid grid-cols-3 border-t border-stone-800 text-xs">
              <button
                onClick={() => onShowQR(t.id)}
                className="py-2 text-amber-400 border-r border-stone-800 flex items-center justify-center gap-1"
              >
                <QrCode size={12} /> QR
              </button>
              {t.status !== "available" ? (
                <>
                  <button
                    onClick={() => onSetStatus(t.id, "serving")}
                    className="py-2 text-sky-400 border-r border-stone-800"
                  >Serving</button>
                  <button
                    onClick={() => onSetStatus(t.id, "available")}
                    className="py-2 text-stone-400"
                  >Reset</button>
                </>
              ) : (
                <div className="col-span-2" />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
