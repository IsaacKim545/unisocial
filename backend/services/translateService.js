const fetch = require("node-fetch");

// DeepL 언어 코드 매핑 (우리 코드 → DeepL 코드)
const DEEPL_LANG = {
  ko: "KO", en: "EN", zh: "ZH", ja: "JA",
  es: "ES", fr: "FR", de: "DE", pt: "PT-BR",
  ru: "RU", ar: "AR", hi: "HI", th: "TH",
  vi: "VI", id: "ID", tr: "TR", it: "IT",
  nl: "NL", pl: "PL", sv: "SV", uk: "UK",
};

class TranslateService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Free API: api-free.deepl.com, Pro API: api.deepl.com
    this.baseUrl = apiKey?.endsWith(":fx")
      ? "https://api-free.deepl.com/v2"
      : "https://api.deepl.com/v2";
  }

  async translate(text, targetLang, sourceLang) {
    const target = DEEPL_LANG[targetLang] || targetLang.toUpperCase();
    const source = sourceLang ? (DEEPL_LANG[sourceLang] || sourceLang.toUpperCase()) : undefined;

    const params = new URLSearchParams();
    params.append("text", text);
    params.append("target_lang", target);
    if (source) params.append("source_lang", source);

    const res = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`DeepL API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.translations?.[0]?.text || "";
  }

  async translateMulti({ content, fromLang, toLangs }) {
    const results = {};

    // 병렬 처리
    const promises = toLangs.map(async (lang) => {
      try {
        results[lang] = await this.translate(content, lang, fromLang);
      } catch (e) {
        console.error(`DeepL translate to ${lang} failed:`, e.message);
        results[lang] = content; // 실패 시 원문
      }
    });

    await Promise.all(promises);
    return results;
  }

  // 사용량 확인
  async getUsage() {
    const res = await fetch(`${this.baseUrl}/usage`, {
      headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`DeepL usage API error (${res.status})`);
    return res.json();
  }
}

module.exports = TranslateService;
