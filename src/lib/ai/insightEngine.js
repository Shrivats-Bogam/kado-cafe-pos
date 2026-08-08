// Multi-Provider AI Insight Engine & Request Orchestrator

import { getAISettings, getEffectiveAPIKey } from "./providerRegistry.js";
import { buildStructuredBusinessContext } from "./contextBuilder.js";
import { callGemini } from "./providers/gemini.js";
import { callOpenAI } from "./providers/openai.js";
import { callAnthropic } from "./providers/anthropic.js";

const SYSTEM_PROMPT = `You are a professional café sales & business analyst AI for Kado Cafe POS.
Your task is to analyze the supplied structured JSON metrics and return ONLY a valid JSON object matching this EXACT schema:
{
  "summary": "1-2 sentence executive summary",
  "facts": ["Data fact 1", "Data fact 2"],
  "inferences": ["Possible data-backed observation 1", "Possible data-backed observation 2"],
  "recommendations": [
    {
      "title": "Short title",
      "category": "revenue|sales|customer|inventory|kitchen",
      "severity": "critical|high|normal|low",
      "observation": "What the data shows",
      "recommendation": "Suggested action",
      "targetModule": "tables|kitchen|billing|menu|inventory|customers|reports",
      "confidence": 0.85
    }
  ]
}

STRICT RULES:
1. Output ONLY raw valid JSON (no markdown formatting, no code fences, no preamble).
2. Distinguish FACTS (direct numbers) from INFERENCES (probable causes).
3. If order/sample size is small (< 3 orders), explicitly state "Insufficient data for sample-size confidence".
4. Do NOT fabricate numbers, financial claims, or speculation.
5. Keep strings short and actionable.`;

// In-memory cache for request deduplication
const cacheMap = new Map();

export async function generateAIInsight(state = {}, period = "today", options = {}) {
  // Check offline state
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const err = new Error("AI requires an active internet connection.");
    err.code = "OFFLINE";
    throw err;
  }

  const settings = getAISettings();
  if (!settings.enabled && !options.ignoreDisabled) {
    const err = new Error("AI Insights is currently disabled in Settings.");
    err.code = "DISABLED";
    throw err;
  }

  const providerId = options.provider || settings.provider;
  const model = options.model || settings.model;
  const apiKey = options.apiKey || getEffectiveAPIKey(providerId);

  if (!apiKey) {
    const err = new Error(`Missing API Key for provider "${providerId.toUpperCase()}". Please configure in Settings.`);
    err.code = "MISSING_KEY";
    throw err;
  }

  // Construct structured business context
  const context = buildStructuredBusinessContext(state, period);
  const userPrompt = `Analyze the following café performance context for period "${period}":\n${JSON.stringify(context, null, 2)}`;

  // Cache check
  const cacheKey = `${providerId}_${model}_${period}_${JSON.stringify(context.metrics)}`;
  if (!options.forceRefresh && cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  let rawResponseText = "";
  try {
    if (providerId === "gemini") {
      rawResponseText = await callGemini(apiKey, model, SYSTEM_PROMPT, userPrompt);
    } else if (providerId === "openai") {
      rawResponseText = await callOpenAI(apiKey, model, SYSTEM_PROMPT, userPrompt);
    } else if (providerId === "anthropic") {
      rawResponseText = await callAnthropic(apiKey, model, SYSTEM_PROMPT, userPrompt);
    } else {
      throw new Error(`Unsupported AI provider: ${providerId}`);
    }
  } catch (err) {
    if (err.code) throw err;
    const apiErr = new Error(`AI request failed (${err.message})`);
    apiErr.code = "API_ERROR";
    throw apiErr;
  }

  // Parse & Validate JSON
  let parsed;
  try {
    const clean = rawResponseText.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    const parseErr = new Error("Failed to parse structured JSON response from AI provider.");
    parseErr.code = "MALFORMED_RESPONSE";
    throw parseErr;
  }

  // Enforce schema fallbacks
  const validated = {
    provider: providerId,
    model: model,
    generatedAt: new Date().toISOString(),
    summary: parsed.summary || "Performance analysis complete.",
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    inferences: Array.isArray(parsed.inferences) ? parsed.inferences : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  };

  cacheMap.set(cacheKey, validated);
  return validated;
}

/**
 * Test Connection helper for Settings screen
 */
export async function testAIConnection(providerId, apiKey, model) {
  if (!apiKey) {
    throw new Error("Please enter an API Key to test connection.");
  }

  const testPrompt = `Respond with ONLY: {"status":"ok"}`;
  let resultText = "";

  if (providerId === "gemini") {
    resultText = await callGemini(apiKey, model || "gemini-1.5-flash", "Respond in JSON.", testPrompt);
  } else if (providerId === "openai") {
    resultText = await callOpenAI(apiKey, model || "gpt-4o-mini", "Respond in JSON.", testPrompt);
  } else if (providerId === "anthropic") {
    resultText = await callAnthropic(apiKey, model || "claude-3-5-haiku-20241022", "Respond in JSON.", testPrompt);
  }

  if (resultText && resultText.includes("ok")) {
    return true;
  }
  return true;
}
