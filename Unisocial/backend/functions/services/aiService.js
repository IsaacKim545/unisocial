const fetch = require("node-fetch");

const LANG_NAMES = {
  ko: "한국어", en: "English", zh: "中文", ja: "日本語",
  es: "Español", fr: "Français", de: "Deutsch", pt: "Português",
  ru: "Русский", ar: "العربية", hi: "हिन्दी", th: "ไทย",
  vi: "Tiếng Việt", id: "Bahasa Indonesia", tr: "Türkçe", it: "Italiano",
  nl: "Nederlands", pl: "Polski", sv: "Svenska", uk: "Українська",
};
function getLangName(code) { return LANG_NAMES[code] || code; }

class AIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.anthropic.com/v1";
    this.model = "claude-sonnet-4-20250514";
  }

  async suggestCaption({ topic, platforms, tone = "casual", language = "ko" }) {
    const lang = getLangName(language) || "English";
    const platformList = platforms.join(", ");
    const prompt = `You are a global social media marketing expert.\n\nTopic: "${topic}"\nTarget platforms: ${platformList}\nTone: ${tone}\nLanguage: ${lang}\n\nGenerate platform-optimized captions and hashtags.\nEach caption MUST be written in ${lang}.\nRespond ONLY with this JSON (no other text):\n{\n  "captions": {\n    ${platforms.map((p) => `"${p}": "optimized caption for ${p}"`).join(",\n    ")}\n  },\n  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],\n  "best_posting_times": {\n    ${platforms.map((p) => `"${p}": "recommended time"`).join(",\n    ")}\n  }\n}`;
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) { const errBody = await res.text(); throw new Error(`Claude API error (${res.status}): ${errBody}`); }
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    try { return JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim()); }
    catch { const f = {}; platforms.forEach((p) => { f[p] = text; }); return { captions: f, hashtags: [], best_posting_times: {} }; }
  }

  async suggestIdeas({ category, count = 5, language = "ko" }) {
    const lang = getLangName(language) || "English";
    const prompt = `Suggest ${count} social media content ideas.\nCategory: ${category}\nLanguage: ALL text must be in ${lang}\n\nRespond ONLY with a JSON array:\n[{"title": "title", "description": "brief description", "platforms": ["best platforms"]}]`;
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`Claude API error (${res.status})`);
    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";
    try { return JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim()); } catch { return []; }
  }

  async translateContent({ content, fromLang, toLangs }) {
    const prompt = `Translate the following social media post from ${getLangName(fromLang)} to the listed languages.\nKeep hashtags, emojis, and mentions intact.\n\nOriginal (${getLangName(fromLang)}): "${content}"\n\nRespond ONLY with JSON:\n{\n  ${toLangs.map((l) => `"${l}": "translated text in ${getLangName(l)}"`).join(",\n  ")}\n}`;
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`Claude API error (${res.status})`);
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    try { return JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim()); } catch { return {}; }
  }
}

module.exports = AIService;
