const express = require("express");
const auth = require("../middleware/auth");
const { checkAILimit } = require("../middleware/usageLimit");
const { pool } = require("../config/database");
const { t } = require("../config/i18n");
const AIService = require("../services/aiService");

const router = express.Router();

// ─── AI 캡션 + 해시태그 추천 ────────────────────────────────
router.post("/suggest", auth, checkAILimit, async (req, res) => {
  const { topic, platforms, tone, language } = req.body;
  const lang = language || req.lang || "ko";

  if (!topic) {
    return res.status(400).json({ error: t(lang, "ai_topic_required") });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // API 키 없으면 기본 추천
    const defaultCaptions = {};
    (platforms || ["instagram", "youtube", "twitter"]).forEach((p) => {
      defaultCaptions[p] = `${topic} #socialhub #crosspost`;
    });

    return res.json({
      captions: defaultCaptions,
      hashtags: ["socialhub", "crosspost", "socialmedia"],
      best_posting_times: {},
      source: "default",
    });
  }

  try {
    const ai = new AIService(process.env.ANTHROPIC_API_KEY);
    const suggestion = await ai.suggestCaption({
      topic,
      platforms: platforms || ["instagram", "youtube", "twitter"],
      tone: tone || "casual",
      language: lang,
    });

    await pool.query(
      "INSERT INTO ai_usage_log (user_id, action, tokens_used) VALUES ($1, $2, $3)",
      [req.user.id, "suggest_caption", 1500]
    );

    res.json({ ...suggestion, source: "claude" });
  } catch (err) {
    console.error("AI suggest error:", err);
    res.status(500).json({ error: t(lang, "ai_error") });
  }
});

// ─── 콘텐츠 아이디어 ───────────────────────────────────────
router.post("/ideas", auth, checkAILimit, async (req, res) => {
  const { category, count, language } = req.body;
  const lang = language || req.lang || "ko";

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({
      ideas: [
        { title: "Behind the scenes", description: "Show your process", platforms: ["instagram", "tiktok"] },
        { title: "Tips & Tricks", description: "Share expertise", platforms: ["youtube", "linkedin"] },
        { title: "Q&A Session", description: "Answer follower questions", platforms: ["tiktok", "threads"] },
      ],
      source: "default",
    });
  }

  try {
    const ai = new AIService(process.env.ANTHROPIC_API_KEY);
    const ideas = await ai.suggestIdeas({
      category: category || "general",
      count: count || 5,
      language: lang,
    });

    await pool.query(
      "INSERT INTO ai_usage_log (user_id, action, tokens_used) VALUES ($1, $2, $3)",
      [req.user.id, "suggest_ideas", 1024]
    );

    res.json({ ideas, source: "claude" });
  } catch (err) {
    console.error("AI ideas error:", err);
    res.status(500).json({ error: t(lang, "ai_error") });
  }
});

// ─── 콘텐츠 번역 (DeepL) ────────────────────────────────────
const TranslateService = require("../services/translateService");

router.post("/translate", auth, checkAILimit, async (req, res) => {
  const { content, fromLang, toLangs } = req.body;

  if (!content || !fromLang || !toLangs || toLangs.length === 0) {
    return res.status(400).json({
      error: "content, fromLang, toLangs required",
      example: { content: "안녕하세요!", fromLang: "ko", toLangs: ["en", "es", "ja"] },
    });
  }

  if (!process.env.DEEPL_API_KEY) {
    return res.status(400).json({ error: "DEEPL_API_KEY required for translation" });
  }

  try {
    const deepl = new TranslateService(process.env.DEEPL_API_KEY);
    const translations = await deepl.translateMulti({ content, fromLang, toLangs });

    await pool.query(
      "INSERT INTO ai_usage_log (user_id, action, tokens_used) VALUES ($1, $2, $3)",
      [req.user.id, "translate_deepl", content.length * toLangs.length]
    );

    res.json({ original: content, fromLang, translations, source: "deepl" });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: t(req.lang, "ai_error") });
  }
});

module.exports = router;
