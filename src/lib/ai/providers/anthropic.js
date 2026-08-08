// Anthropic Claude Provider Adapter for Kado Cafe POS AI

export async function callAnthropic(apiKey, model, systemPrompt, userContextPrompt) {
  if (!apiKey) {
    const err = new Error("Missing Anthropic API Key");
    err.code = "MISSING_KEY";
    throw err;
  }

  const url = "https://api.anthropic.com/v1/messages";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: model || "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContextPrompt }]
    })
  });

  if (response.status === 429) {
    const err = new Error("Anthropic API rate limit reached (429)");
    err.code = "RATE_LIMIT";
    throw err;
  }

  if (!response.ok) {
    const txt = await response.text();
    const err = new Error(`Anthropic API Error (${response.status}): ${txt.slice(0, 150)}`);
    err.code = "API_ERROR";
    throw err;
  }

  const data = await response.json();
  const rawText = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  if (!rawText) {
    const err = new Error("Empty response from Anthropic API");
    err.code = "MALFORMED_RESPONSE";
    throw err;
  }

  return rawText;
}
