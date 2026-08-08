// OpenAI Provider Adapter for Kado Cafe POS AI

export async function callOpenAI(apiKey, model, systemPrompt, userContextPrompt) {
  if (!apiKey) {
    const err = new Error("Missing OpenAI API Key");
    err.code = "MISSING_KEY";
    throw err;
  }

  const url = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContextPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  if (response.status === 429) {
    const err = new Error("OpenAI API rate limit reached (429)");
    err.code = "RATE_LIMIT";
    throw err;
  }

  if (!response.ok) {
    const txt = await response.text();
    const err = new Error(`OpenAI API Error (${response.status}): ${txt.slice(0, 150)}`);
    err.code = "API_ERROR";
    throw err;
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) {
    const err = new Error("Empty response from OpenAI API");
    err.code = "MALFORMED_RESPONSE";
    throw err;
  }

  return rawText;
}
