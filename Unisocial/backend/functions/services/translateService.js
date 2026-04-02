const fetch = require("node-fetch");

const DEEPL_LANG = { ko:"KO",en:"EN",zh:"ZH",ja:"JA",es:"ES",fr:"FR",de:"DE",pt:"PT-BR",ru:"RU",ar:"AR",hi:"HI",th:"TH",vi:"VI",id:"ID",tr:"TR",it:"IT",nl:"NL",pl:"PL",sv:"SV",uk:"UK" };

class TranslateService {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = apiKey?.endsWith(":fx") ? "https://api-free.deepl.com/v2" : "https://api.deepl.com/v2"; }

  async translate(text, targetLang, sourceLang) {
    const target = DEEPL_LANG[targetLang] || targetLang.toUpperCase();
    const source = sourceLang ? (DEEPL_LANG[sourceLang] || sourceLang.toUpperCase()) : undefined;
    const params = new URLSearchParams(); params.append("text", text); params.append("target_lang", target);
    if (source) params.append("source_lang", source);
    const res = await fetch(`${this.baseUrl}/translate`, { method: "POST", headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    if (!res.ok) { const err = await res.text().catch(() => ""); throw new Error(`DeepL API error (${res.status}): ${err}`); }
    const data = await res.json(); return data.translations?.[0]?.text || "";
  }

  async translateMulti({ content, fromLang, toLangs }) {
    const results = {};
    await Promise.all(toLangs.map(async (lang) => { try { results[lang] = await this.translate(content, lang, fromLang); } catch (e) { results[lang] = content; } }));
    return results;
  }

  async getUsage() { const res = await fetch(`${this.baseUrl}/usage`, { headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` } }); if (!res.ok) throw new Error(`DeepL usage API error (${res.status})`); return res.json(); }
}

module.exports = TranslateService;
