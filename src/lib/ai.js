// Unified AI Integration Layer for Kado Cafe POS AI 1.0

import { getAISettings, saveAISettings, PROVIDERS } from "./ai/providerRegistry.js";
import { generateAIInsight, testAIConnection } from "./ai/insightEngine.js";

export { getAISettings, saveAISettings, PROVIDERS, generateAIInsight, testAIConnection };

/**
 * Backward-compatible helper for legacy callers (e.g. AIInsightsView).
 * Wraps generateAIInsight gracefully without crashing.
 */
export async function generateInsights(orderHistory = [], menuItems = []) {
  try {
    const mockState = { orderHistory, menuItems };
    const res = await generateAIInsight(mockState, "today");
    
    // Map to legacy component format
    return {
      bestSellers: res.facts.slice(0, 3),
      slowMovers: res.inferences.slice(0, 2),
      comboSuggestions: res.recommendations.map(r => r.recommendation),
      demandForecast: res.summary,
      revenueEstimate: res.facts[0] || "Revenue tracking active",
      insight: res.summary,
      structured: res
    };
  } catch (err) {
    throw err;
  }
}
