import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, Pill, PrimaryButton } from "../components/ui.jsx";
import { generateInsights } from "../lib/ai.js";

// AI Insights — pure presentation + state layer.
// All network/key/prompt logic is now owned by src/lib/ai.js. That module is
// the single place to swap when we move to a Supabase Edge Function.

export default function AIInsightsView({ orderHistory, menuItems }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      setInsights(await generateInsights(orderHistory, menuItems));
    } catch (err) {
      console.error(err);
      setError(
        err?.code === "MISSING_KEY"
          ? "Add your Claude API key as VITE_ANTHROPIC_API_KEY in .env to use this."
          : "Couldn't generate insights right now — try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-stone-300">
            Ask Claude to analyze your sales history and suggest what to promote, what's slowing
            down, and simple combo ideas.
          </p>
        </div>
        <PrimaryButton onClick={generate} disabled={loading} className="self-start">
          {loading ? "Thinking..." : insights ? "Regenerate Insights" : "Generate Insights"}
        </PrimaryButton>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {orderHistory.length === 0 && (
          <p className="text-xs text-stone-500">
            No completed orders yet — insights will be more useful once you've billed a few.
          </p>
        )}
      </Card>

      {insights && (
        <>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-stone-300 mb-2">Best Sellers</h3>
            <div className="flex flex-wrap gap-2">
              {(insights.bestSellers || []).map((n) => <Pill key={n} tone="emerald">{n}</Pill>)}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-stone-300 mb-2">Slow Movers</h3>
            <div className="flex flex-wrap gap-2">
              {(insights.slowMovers || []).map((n) => <Pill key={n} tone="rose">{n}</Pill>)}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-stone-300 mb-2">Combo Suggestions</h3>
            <ul className="text-sm text-stone-300 list-disc list-inside flex flex-col gap-1">
              {(insights.comboSuggestions || []).map((n) => <li key={n}>{n}</li>)}
            </ul>
          </Card>
          <Card className="p-4 flex flex-col gap-2">
            <div>
              <span className="text-xs uppercase tracking-wide text-stone-500">Demand Forecast</span>
              <p className="text-sm text-stone-200">{insights.demandForecast}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-stone-500">Revenue Estimate</span>
              <p className="text-sm text-stone-200">{insights.revenueEstimate}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-stone-500">Insight</span>
              <p className="text-sm text-stone-200">{insights.insight}</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
