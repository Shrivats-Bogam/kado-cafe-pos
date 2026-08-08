import { useState } from "react";
import { Sparkles, Bot, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Info } from "lucide-react";
import { Card, PrimaryButton } from "../components/ui.jsx";
import { generateAIInsight, getAISettings } from "../lib/ai.js";

const CATEGORY_TABS = [
  { id: "all", label: "All Insights" },
  { id: "revenue", label: "Revenue" },
  { id: "sales", label: "Sales & Products" },
  { id: "customer", label: "Customer CRM" },
  { id: "inventory", label: "Inventory" },
  { id: "kitchen", label: "Kitchen" }
];

export default function AIInsightsView({ state = {}, orderHistory = [], menuItems = [], onNavigate }) {
  const [insightData, setInsightData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const settings = getAISettings();

  const handleGenerate = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const fullState = state.orderHistory ? state : { orderHistory, menuItems };
      const res = await generateAIInsight(fullState, "today", { forceRefresh: force });
      setInsightData(res);
    } catch (err) {
      console.error("AI Insights Error:", err);
      if (err.code === "DISABLED") {
        setError("AI Insights is currently disabled. Enable it in Settings.");
      } else if (err.code === "MISSING_KEY") {
        setError(`Missing API key for active provider "${settings.provider.toUpperCase()}". Add key in Settings.`);
      } else if (err.code === "RATE_LIMIT") {
        setError("AI provider rate limit reached (429). Please try again in a few moments.");
      } else if (err.code === "OFFLINE") {
        setError("AI requires an active internet connection. POS core modules remain operational.");
      } else {
        setError(err.message || "Couldn't generate AI insights right now — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRecs = (insightData?.recommendations || []).filter((r) => {
    if (activeCategory === "all") return true;
    return r.category === activeCategory;
  });

  return (
    <div className="flex flex-col gap-4 text-stone-100">
      {/* Header Banner */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-bold text-stone-50">AI Business Intelligence Engine 1.0</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-800 text-amber-400 border border-stone-700">
                Provider: {settings.provider.toUpperCase()} ({settings.model})
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Provider-independent intelligence layer analyzing revenue, menu sales, inventory shortages, and customer trends.
            </p>
          </div>
        </div>

        <PrimaryButton
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 min-h-[44px] px-4 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Generating Insights...
            </>
          ) : (
            <>
              <Sparkles size={15} /> {insightData ? "Refresh AI Insights" : "Generate AI Insights"}
            </>
          )}
        </PrimaryButton>
      </Card>

      {/* Error / Warning Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Tabs */}
      {insightData && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveCategory(t.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px] ${
                activeCategory === t.id
                  ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                  : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Generated Insights Content */}
      {insightData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Executive Summary & Facts vs Inferences */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Executive Summary */}
            <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-2 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Executive Summary
              </h3>
              <p className="text-xs text-stone-200 leading-relaxed font-serif">{insightData.summary}</p>
            </Card>

            {/* Fact vs Inference Separation (PART 16) */}
            <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Verified Data Facts
              </h3>
              <div className="space-y-1.5 text-xs">
                {insightData.facts.length === 0 ? (
                  <p className="text-stone-500">No specific data facts returned.</p>
                ) : (
                  insightData.facts.map((f, i) => (
                    <div key={i} className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-emerald-300 font-mono text-[11px]">
                      • {f}
                    </div>
                  ))
                )}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5 pt-2 border-t border-stone-800">
                <Info size={14} className="text-sky-400" /> Probable Inferences
              </h3>
              <div className="space-y-1.5 text-xs">
                {insightData.inferences.length === 0 ? (
                  <p className="text-stone-500">No inferences generated.</p>
                ) : (
                  insightData.inferences.map((inf, i) => (
                    <div key={i} className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-stone-300 text-[11px]">
                      • {inf}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Actionable Recommendations List */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Data-Backed Action Recommendations ({filteredRecs.length})
            </h3>

            {filteredRecs.length === 0 ? (
              <Card className="p-6 text-center text-xs text-stone-500">
                No recommendations for this category.
              </Card>
            ) : (
              filteredRecs.map((rec, idx) => (
                <Card key={idx} className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-2 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        rec.severity === "critical" ? "bg-rose-500" :
                        rec.severity === "high" ? "bg-orange-500" :
                        rec.severity === "normal" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      {rec.title}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                      {rec.category.toUpperCase()} • Confidence {Math.round((rec.confidence || 0.8) * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 font-medium">{rec.observation}</p>
                  <p className="text-xs text-amber-300/90 font-mono bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                    💡 {rec.recommendation}
                  </p>

                  {rec.targetModule && onNavigate && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onNavigate(rec.targetModule)}
                        className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        Action Target <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center flex flex-col items-center gap-3 bg-stone-900 border-stone-800 shadow-md">
          <Bot size={36} className="text-amber-500/60" />
          <div>
            <h3 className="text-sm font-bold text-stone-200">No AI Insights Generated Yet</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md">
              Click "Generate AI Insights" above to analyze your sales history, product velocity, inventory shortages, and customer trends.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
