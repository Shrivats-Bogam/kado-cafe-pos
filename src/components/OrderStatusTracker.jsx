import { Clock, Bell, Receipt, CheckCircle, Flame, Sparkles } from "lucide-react";
import { Card, Pill } from "./ui.jsx";

const KITCHEN_STEPS = ["New", "Cooking", "Ready", "Served"];

export function OrderStatusTracker({ table, onCallWaiter, onRequestBill, t }) {
  const status = table?.kitchenStatus || "New";
  const stepIndex = KITCHEN_STEPS.indexOf(status);

  return (
    <Card className="p-4 flex flex-col gap-4 bg-stone-900/90 border-stone-800 shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-serif text-base font-bold text-stone-50 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            {t.orderStatus}
          </h3>
          <p className="text-xs text-stone-400">Table {table.number} · Live progress updates</p>
        </div>
        <Pill tone={status === "Served" ? "emerald" : status === "Ready" ? "purple" : "amber"}>
          {status}
        </Pill>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between relative px-2 py-2">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-stone-800 -z-0" />
        <div 
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-amber-500 transition-all duration-500 -z-0"
          style={{ width: `${(Math.max(0, stepIndex) / (KITCHEN_STEPS.length - 1)) * 85}%` }}
        />

        {KITCHEN_STEPS.map((step, idx) => {
          const isDone = idx <= stepIndex;
          const isCurrent = idx === stepIndex;

          return (
            <div key={step} className="flex flex-col items-center gap-1.5 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  isCurrent
                    ? "bg-amber-500 text-stone-950 ring-4 ring-amber-500/20"
                    : isDone
                    ? "bg-emerald-500 text-stone-950"
                    : "bg-stone-800 text-stone-500 border border-stone-700"
                }`}
              >
                {isDone ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <span className={`text-[10px] font-semibold ${isDone ? "text-stone-200" : "text-stone-500"}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Self-Service Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
        <button
          type="button"
          onClick={onCallWaiter}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold flex items-center justify-center gap-2 transition border border-stone-700"
        >
          <Bell size={15} className="text-amber-500" />
          <span>{t.callWaiter}</span>
        </button>

        <button
          type="button"
          onClick={onRequestBill}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold flex items-center justify-center gap-2 transition border border-stone-700"
        >
          <Receipt size={15} className="text-emerald-500" />
          <span>{t.requestBill}</span>
        </button>
      </div>
    </Card>
  );
}
