// AI insights integration layer.
//
// The view (AIInsightsView) only needs to know "given some sales data, give me
// structured insights". How those insights are produced — direct Anthropic call,
// Supabase Edge Function, OpenAI, or a local stub — is an implementation detail
// owned by this module.
//
// Today we still call Anthropic directly because there is no backend yet, but the
// network call is now isolated here so the client bundle no longer embeds API
// URLs/headers inline in a view file, and so swapping to a backend proxy later is
// a one-file change (see `callBackend`).
//
// SECURITY NOTE: the direct-call path uses VITE_ANTHROPIC_API_KEY shipped in the
// client bundle. This is acceptable only for a single-owner private device. The
// forward-looking path is `callEdgeFunction` (commented) once a Supabase Edge
// Function exists; that removes the key from the client entirely.

import { aggregateItemSales, revenueByDay, totalRevenue } from "./aggregate.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const ANTHROPIC_MAX_TOKENS = 1000;

// Shape the caller (view) must pass in: a pre-aggregated sales summary.
// Keeping this as a plain object (not the raw orderHistory) keeps the prompt
// small and stable — view is responsible for aggregation.
export function buildSalesSummary(orderHistory, menuItems) {
  const itemCounts = aggregateItemSales(orderHistory, menuItems);
  const revenueByDayMap = revenueByDay(orderHistory);
  return {
    totalOrders: orderHistory.length,
    totalRevenue: totalRevenue(orderHistory),
    itemSalesCounts: itemCounts,
    revenueByDay: revenueByDayMap,
    menu: menuItems.filter((m) => m.available).map((m) => ({
      name: m.name,
      category: m.category,
      price: m.price,
    })),
  };
}

// Build the prompt that requests strict JSON in a fixed shape.
export function buildPrompt(summary) {
  return `You are a small cafe's sales analyst. Given this JSON sales summary, respond with ONLY strict JSON (no markdown fences, no preamble), matching exactly this shape:
{"bestSellers":["item1","item2","item3"],"slowMovers":["item1","item2"],"comboSuggestions":["suggestion1","suggestion2"],"demandForecast":"one short sentence","revenueEstimate":"one short sentence estimating next week's revenue based on trend","insight":"one or two short sentences of plain-English business advice"}
Keep every string short. If there isn't enough data for a field, use your best reasonable guess and say so briefly rather than leaving it empty.

Sales data:
${JSON.stringify(summary)}`;
}

// Parse the model's text response into the expected object.
// Strips markdown fences if the model added them despite instructions.
export function parseInsights(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// --- Transport strategies (only one is active at a time) ---

// Direct browser → Anthropic. Reads the key from Vite env.
// Acceptable for a private single-owner device; swap to `callEdgeFunction` for
// production multi-user deployments.
async function callAnthropicDirect(prompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error("Missing VITE_ANTHROPIC_API_KEY");
    err.code = "MISSING_KEY";
    throw err;
  }
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const txt = await response.text();
    const err = new Error(`Claude API ${response.status}: ${txt.slice(0, 200)}`);
    err.code = "API_ERROR";
    throw err;
  }
  const data = await response.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ──────────────────────────────────────────────────────────────────────────
// Forward-looking path: route through a Supabase Edge Function.
//
// Uncomment and switch `generateInsights` below to this once an Edge Function
// named `cafe-ai-insights` is deployed. The function holds the Claude key in
// its own environment and returns the same text body; the client never sees
// the API key.
//
// async function callEdgeFunction(prompt, { supabase }) {
//   const { data, error } = await supabase.functions.invoke("cafe-ai-insights", {
//     body: { prompt },
//   });
//   if (error) throw error;
//   return data.text;
// }
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generate AI insights from aggregated sales data.
 * Returns the parsed insights object (see buildPrompt for shape).
 * Throws an Error with `.code` of "MISSING_KEY" or "API_ERROR" on failure.
 */
export async function generateInsights(orderHistory, menuItems) {
  const summary = buildSalesSummary(orderHistory, menuItems);
  const prompt = buildPrompt(summary);
  // Today: direct call. Tomorrow: replace this line with `callEdgeFunction(prompt, …)`.
  const text = await callAnthropicDirect(prompt);
  return parseInsights(text);
}
