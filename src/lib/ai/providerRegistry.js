// Multi-Provider Registry and Configuration Layer for Kado Cafe POS AI 1.0

const SETTINGS_KEY = "kado_ai_settings";

export const DEFAULT_AI_SETTINGS = {
  enabled: true,
  provider: "gemini",
  model: "gemini-1.5-flash",
  apiKey: "",
  fallbackProvider: "anthropic"
};

export const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    models: ["gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-1.5-flash"
  },
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o"],
    defaultModel: "gpt-4o-mini"
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"],
    defaultModel: "claude-3-5-haiku-20241022"
  }
];

export function getAISettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch (err) {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings) {
  try {
    const current = getAISettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    return getAISettings();
  }
}

export function getEffectiveAPIKey(providerId) {
  const settings = getAISettings();
  if (settings.provider === providerId && settings.apiKey) {
    return settings.apiKey;
  }

  // Fallback to environment variables
  if (providerId === "gemini") return import.meta.env.VITE_GEMINI_API_KEY || "";
  if (providerId === "openai") return import.meta.env.VITE_OPENAI_API_KEY || "";
  if (providerId === "anthropic") return import.meta.env.VITE_ANTHROPIC_API_KEY || "";

  return "";
}
