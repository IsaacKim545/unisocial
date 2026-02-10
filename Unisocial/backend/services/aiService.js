const fetch = require("node-fetch");

const LANG_NAMES = {
  ko: "한국어", en: "English", zh: "中文", ja: "日本語",
  es: "Español", fr: "Français", de: "Deutsch", pt: "Português",
  ru: "Русский", ar: "العربية", hi: "हिन्दी", th: "ไทย",
  vi: "Tiếng Việt", id: "Bahasa Indonesia", tr: "Türkçe", it: "Italiano",
  nl: "Nederlands", pl: "Polski", sv: "Svenska", uk: "Українська",
};
function langName(code) { return LANG_NAMES[code] || code; }

class AIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.anthropic.com/v1";
    this.model = "claude-sonnet-4-20250514";
  }

  // ─── 캡션 & 해시태그 추천 (다국어 + 멀티플랫폼) ────────────
  async suggestCaption({ topic, platforms, tone = "casual", language = "ko" }) {
    const langName = langName(language) || "English";
    const platformList = platforms.join(", ");

    const prompt = `You are a global social media marketing expert.

Topic: "${topic}"
Target platforms: ${platformList}
Tone: ${tone}
Language: ${langName}

Generate platform-optimized captions and hashtags.
Each caption MUST be written in ${langName}.
Respect each platform's character limits and style.

Respond ONLY with this JSON (no other text):
{
  "captions": {
    ${platforms.map((p) => `"${p}": "optimized caption for ${p}"`).join(",\n    ")}
  },
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "best_posting_times": {
    ${platforms.map((p) => `"${p}": "recommended time"`).join(",\n    ")}
  }
}`;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text for all platforms
      const fallback = {};
      platforms.forEach((p) => { fallback[p] = text; });
      return { captions: fallback, hashtags: [], best_posting_times: {} };
    }
  }

  // ─── 콘텐츠 아이디어 추천 (다국어) ────────────────────────
  async suggestIdeas({ category, count = 5, language = "ko" }) {
    const langName = langName(language) || "English";

    const prompt = `Suggest ${count} social media content ideas.
Category: ${category}
Language: ALL text must be in ${langName}

Respond ONLY with a JSON array (no other text):
[{"title": "title", "description": "brief description", "platforms": ["best platforms"]}]`;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error (${res.status})`);

    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";

    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return [];
    }
  }

  // ─── 콘텐츠 번역 ──────────────────────────────────────────
  async translateContent({ content, fromLang, toLangs }) {
    const prompt = `Translate the following social media post from ${langName(fromLang)} to the listed languages.
Keep hashtags, emojis, and mentions intact. Adapt tone for each language's social media culture.

Original (${langName(fromLang)}): "${content}"

Respond ONLY with JSON:
{
  ${toLangs.map((l) => `"${l}": "translated text in ${langName(l)}"`).join(",\n  ")}
}`;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error (${res.status})`);

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";

    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
}

module.exports = AIService;
