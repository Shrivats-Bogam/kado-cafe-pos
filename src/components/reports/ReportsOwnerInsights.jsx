import { AlertTriangle, Lightbulb, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card } from "../ui.jsx";

export function ReportsOwnerInsights({ warnings = [], insights = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Needs Attention Actionable Warnings */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <ShieldAlert size={16} /> Needs Attention ({warnings.length})
          </h3>
          <span className="text-[10px] text-stone-500 font-mono">Actionable Ops Alerts</span>
        </div>

        {warnings.length === 0 ? (
          <div className="py-6 text-center text-xs text-emerald-400 flex flex-col items-center gap-1.5 border border-dashed border-emerald-500/30 rounded-xl bg-emerald-500/5">
            <CheckCircle2 size={20} />
            <span className="font-semibold">All Operations Healthy! No urgent warnings.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {warnings.map((w, idx) => {
              let tone = "bg-stone-950 border-stone-800 text-stone-300";
              if (w.type === "danger") tone = "bg-rose-500/10 border-rose-500/30 text-rose-300";
              else if (w.type === "warning") tone = "bg-amber-500/10 border-amber-500/30 text-amber-300";
              else if (w.type === "info") tone = "bg-sky-500/10 border-sky-500/30 text-sky-300";

              return (
                <div key={idx} className={`p-2.5 rounded-xl border text-xs flex flex-col gap-0.5 ${tone}`}>
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={13} className="shrink-0" /> {w.title}
                  </span>
                  <span className="text-[11px] opacity-90">{w.detail}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rule-Based Owner Insights */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Lightbulb size={16} /> Owner Business Insights
          </h3>
          <span className="text-[10px] text-stone-500 font-mono">Data-Backed Rules</span>
        </div>

        {insights.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
            Insufficient data for business insights.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {insights.map((ins, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">#{idx + 1}</span>
                <span className="font-medium">{ins}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
