const express = require("express");
const { addDoc } = require("../config/firebase");
const authMiddleware = require("../middleware/auth");
const { checkAILimit } = require("../middleware/usageLimit");
const { t } = require("../config/i18n");
const AIService = require("../services/aiService");
const TranslateService = require("../services/translateService");

const router = express.Router();

router.post("/suggest", authMiddleware, checkAILimit, async (req, res) => {
  const { topic, platforms, tone, language } = req.body;
  const lang = language || req.lang || "ko";
  if (!topic) return res.status(400).json({ error: t(lang, "ai_topic_required") });
  if (!process.env.ANTHROPIC_API_KEY) {
    const c = {}; (platforms || ["instagram","youtube","twitter"]).forEach(p => { c[p] = `${topic} #socialhub #crosspost`; });
    return res.json({ captions: c, hashtags: ["socialhub","crosspost","socialmedia"], best_posting_times: {}, source: "default" });
  }
  try {
    const ai = new AIService(process.env.ANTHROPIC_API_KEY);
    const suggestion = await ai.suggestCaption({ topic, platforms: platforms || ["instagram","youtube","twitter"], tone: tone || "casual", language: lang });
    await addDoc("aiUsageLog", { userId: req.user.id, action: "suggest_caption", tokensUsed: 1500 });
    res.json({ ...suggestion, source: "claude" });
  } catch (err) { console.error("AI suggest error:", err); res.status(500).json({ error: t(lang, "ai_error") }); }
});

router.post("/ideas", authMiddleware, checkAILimit, async (req, res) => {
  const { category, count, language } = req.body;
  const lang = language || req.lang || "ko";
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ ideas: [{ title: "Behind the scenes", description: "Show your process", platforms: ["instagram","tiktok"] },{ title: "Tips & Tricks", description: "Share expertise", platforms: ["youtube","linkedin"] },{ title: "Q&A Session", description: "Answer follower questions", platforms: ["tiktok","threads"] }], source: "default" });
  try {
    const ai = new AIService(process.env.ANTHROPIC_API_KEY);
    const ideas = await ai.suggestIdeas({ category: category || "general", count: count || 5, language: lang });
    await addDoc("aiUsageLog", { userId: req.user.id, action: "suggest_ideas", tokensUsed: 1024 });
    res.json({ ideas, source: "claude" });
  } catch (err) { console.error("AI ideas error:", err); res.status(500).json({ error: t(lang, "ai_error") }); }
});

router.post("/translate", authMiddleware, checkAILimit, async (req, res) => {
  const { content, fromLang, toLangs } = req.body;
  if (!content || !fromLang || !toLangs?.length) return res.status(400).json({ error: "content, fromLang, toLangs required" });
  if (!process.env.DEEPL_API_KEY) return res.status(400).json({ error: "DEEPL_API_KEY required for translation" });
  try {
    const deepl = new TranslateService(process.env.DEEPL_API_KEY);
    const translations = await deepl.translateMulti({ content, fromLang, toLangs });
    await addDoc("aiUsageLog", { userId: req.user.id, action: "translate_deepl", tokensUsed: content.length * toLangs.length });
    res.json({ original: content, fromLang, translations, source: "deepl" });
  } catch (err) { console.error("Translation error:", err); res.status(500).json({ error: t(req.lang, "ai_error") }); }
});

module.exports = router;
