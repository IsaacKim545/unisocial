const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { t } = require("../config/i18n");
const auth = require("../middleware/auth");
const { generateCode, sendVerificationEmail } = require("../services/emailService");

const router = express.Router();

// ─── Signup (Step 1: 인증코드 발송) ─────────────────────
router.post("/signup", async (req, res) => {
  const { email, password, username, language } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: t(req.lang, "auth_fields_required") });
  }

  try {
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: t(req.lang, "auth_email_exists") });
    }

    const unExists = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (unExists.rows.length > 0) {
      return res.status(409).json({ error: t(req.lang, "auth_username_exists") });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)",
      [email, code, expiresAt]
    );

    const lang = language || req.lang || "ko";
    await sendVerificationEmail(email, code, lang);

    const passwordHash = await bcrypt.hash(password, 12);

    res.status(200).json({
      message: lang === "ko" ? "인증 코드가 이메일로 발송되었습니다."
             : lang === "zh" ? "验证码已发送到您的邮箱。"
             : lang === "ja" ? "認証コードがメールに送信されました。"
             : "Verification code sent to your email.",
      pendingUser: { email, username, passwordHash, language: lang },
      requiresVerification: true,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Verify (Step 2: 인증코드 확인 & 계정 생성) ─────────
router.post("/verify", async (req, res) => {
  const { email, code, username, passwordHash, language } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: req.lang === "ko" ? "인증 코드가 올바르지 않거나 만료되었습니다."
             : req.lang === "zh" ? "验证码无效或已过期。"
             : req.lang === "ja" ? "認証コードが無効または期限切れです。"
             : "Invalid or expired verification code.",
      });
    }

    await pool.query("UPDATE email_verifications SET used = true WHERE id = $1", [result.rows[0].id]);

    const lang = language || req.lang || "ko";
    const userResult = await pool.query(
      "INSERT INTO users (email, password_hash, username, language, email_verified) VALUES ($1, $2, $3, $4, true) RETURNING id, email, username, language",
      [email, passwordHash, username, lang]
    );

    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.status(201).json({
      message: t(lang, "auth_signup_success"),
      token,
      user: { id: user.id, email: user.email, username: user.username, language: user.language },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: t(req.lang, "auth_email_exists") });
    }
    console.error("Verify error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Resend Code ─────────────────────────────────────────
router.post("/resend-code", async (req, res) => {
  const { email, language } = req.body;
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      "INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)",
      [email, code, expiresAt]
    );
    await sendVerificationEmail(email, code, language || req.lang);
    res.json({ message: "Verification code resent." });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Login ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      // OAuth 전용 계정인 경우 안내
      if (user && !user.password_hash && user.oauth_provider) {
        const providerNames = { google: "Google", microsoft: "Microsoft", apple: "Apple" };
        const pn = providerNames[user.oauth_provider] || user.oauth_provider;
        return res.status(401).json({
          error: req.lang === "ko" ? `이 계정은 ${pn}(으)로 가입되었습니다. ${pn} 로그인을 사용하세요.`
               : `This account was created with ${pn}. Please use ${pn} login.`,
        });
      }
      return res.status(401).json({ error: t(req.lang, "auth_invalid_credentials") });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: req.lang === "ko" ? "이메일 인증이 필요합니다."
             : "Email verification required.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({
      message: t(user.language || req.lang, "auth_login_success"),
      token,
      user: { id: user.id, email: user.email, username: user.username, language: user.language },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Password Reset: Send Code ──────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email, language } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({
        error: req.lang === "ko" ? "등록되지 않은 이메일입니다."
             : req.lang === "zh" ? "该邮箱未注册。"
             : req.lang === "ja" ? "登録されていないメールアドレスです。"
             : "This email is not registered.",
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      "INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)",
      [email, code, expiresAt]
    );
    await sendVerificationEmail(email, code, language || req.lang);
    // SMTP 미설정 시 코드를 응답에 포함 (개발 모드)
    const isDev = !process.env.SMTP_HOST;
    res.json({ message: "Reset code sent.", ...(isDev && { devCode: code }) });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Password Reset: Verify & Change ────────────────────
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and new password required." });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: "Password too short." });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: req.lang === "ko" ? "잘못된 코드이거나 만료되었습니다." : "Invalid or expired code." });
    }

    // 코드 사용 처리
    await pool.query("UPDATE email_verifications SET used = true WHERE id = $1", [result.rows[0].id]);

    // 비밀번호 변경
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1, email_verified = true WHERE email = $2", [hash, email]);

    res.json({ message: req.lang === "ko" ? "비밀번호가 변경되었습니다." : "Password has been reset." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Logout ─────────────────────────────────────────────
router.post("/logout", auth, (req, res) => {
  res.json({ message: "Logged out." });
});

// ─── My Info ────────────────────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, username, language, email_verified, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Update Language ────────────────────────────────────
router.patch("/language", auth, async (req, res) => {
  const { language } = req.body;
  const supported = ["ko", "en", "zh", "ja"];
  if (!supported.includes(language)) {
    return res.status(400).json({ error: "Supported: ko, en, zh, ja" });
  }
  await pool.query("UPDATE users SET language = $1 WHERE id = $2", [language, req.user.id]);
  res.json({ language });
});

module.exports = router;
