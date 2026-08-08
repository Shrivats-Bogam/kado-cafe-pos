// Google Gemini Provider Adapter for Kado Cafe POS AI

export async function callGemini(apiKey, model, systemPrompt, userContextPrompt) {
  if (!apiKey) {
    const err = new Error("Missing Gemini API Key");
    err.code = "MISSING_KEY";
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\n${userContextPrompt}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (response.status === 429) {
    const err = new Error("Gemini API rate limit reached (429)");
    err.code = "RATE_LIMIT";
    throw err;
  }

  if (!response.ok) {
    const txt = await response.text();
    const err = new Error(`Gemini API Error (${response.status}): ${txt.slice(0, 150)}`);
    err.code = "API_ERROR";
    throw err;
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    const err = new Error("Empty response from Gemini API");
    err.code = "MALFORMED_RESPONSE";
    throw err;
  }

  return rawText;
}
