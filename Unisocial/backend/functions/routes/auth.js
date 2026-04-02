const express = require("express");
const bcrypt = require("bcryptjs");
const { admin, db, auth, queryDocs, addDoc } = require("../config/firebase");
const { t } = require("../config/i18n");
const authMiddleware = require("../middleware/auth");
const { generateCode, sendVerificationEmail } = require("../services/emailService");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { email, password, username, language } = req.body;
  if (!email || !password || !username) return res.status(400).json({ error: t(req.lang, "auth_fields_required") });
  try {
    try { await auth.getUserByEmail(email); return res.status(409).json({ error: t(req.lang, "auth_email_exists") }); } catch (err) { if (err.code !== "auth/user-not-found") throw err; }
    const existingUsername = await queryDocs("users", [["username", "==", username]], null, null, 1);
    if (existingUsername.length > 0) return res.status(409).json({ error: t(req.lang, "auth_username_exists") });
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await addDoc("emailVerifications", { email, code, expiresAt, used: false });
    const lang = language || req.lang || "ko";
    await sendVerificationEmail(email, code, lang);
    const passwordHash = await bcrypt.hash(password, 12);
    res.status(200).json({
      message: lang === "ko" ? "인증 코드가 이메일로 발송되었습니다." : lang === "zh" ? "验证码已发送到您的邮箱。" : lang === "ja" ? "認証コードがメールに送信されました。" : "Verification code sent to your email.",
      pendingUser: { email, username, passwordHash, language: lang }, requiresVerification: true,
    });
  } catch (err) { console.error("Signup error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/verify", async (req, res) => {
  const { email, code, username, passwordHash, language } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code are required." });
  try {
    const now = new Date();
    const verifications = await db.collection("emailVerifications").where("email", "==", email).where("code", "==", code).where("used", "==", false).where("expiresAt", ">", now).orderBy("expiresAt", "desc").limit(1).get();
    if (verifications.empty) return res.status(400).json({ error: req.lang === "ko" ? "인증 코드가 올바르지 않거나 만료되었습니다." : "Invalid or expired verification code." });
    await db.collection("emailVerifications").doc(verifications.docs[0].id).update({ used: true });
    const lang = language || req.lang || "ko";
    const firebaseUser = await auth.createUser({ email, password: "temp_" + Date.now(), displayName: username, emailVerified: true });
    await db.collection("users").doc(firebaseUser.uid).set({ email, passwordHash, username, language: lang, emailVerified: true, oauthProvider: null, oauthId: null, billingKey: null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const customToken = await auth.createCustomToken(firebaseUser.uid);
    res.status(201).json({ message: t(lang, "auth_signup_success"), customToken, user: { id: firebaseUser.uid, email, username, language: lang } });
  } catch (err) {
    if (err.code === "auth/email-already-exists") return res.status(409).json({ error: t(req.lang, "auth_email_exists") });
    console.error("Verify error:", err); res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

router.post("/resend-code", async (req, res) => {
  const { email, language } = req.body;
  try { const code = generateCode(); await addDoc("emailVerifications", { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000), used: false }); await sendVerificationEmail(email, code, language || req.lang); res.json({ message: "Verification code resent." }); }
  catch (err) { console.error("Resend error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let firebaseUser; try { firebaseUser = await auth.getUserByEmail(email); } catch { return res.status(401).json({ error: t(req.lang, "auth_invalid_credentials") }); }
    const userDoc = await db.collection("users").doc(firebaseUser.uid).get();
    if (!userDoc.exists) return res.status(401).json({ error: t(req.lang, "auth_invalid_credentials") });
    const userData = userDoc.data();
    if (!userData.passwordHash && userData.oauthProvider) { const pn = { google: "Google", microsoft: "Microsoft", apple: "Apple" }[userData.oauthProvider] || userData.oauthProvider; return res.status(401).json({ error: req.lang === "ko" ? `이 계정은 ${pn}(으)로 가입되었습니다. ${pn} 로그인을 사용하세요.` : `This account was created with ${pn}. Please use ${pn} login.` }); }
    if (!userData.passwordHash || !(await bcrypt.compare(password, userData.passwordHash))) return res.status(401).json({ error: t(req.lang, "auth_invalid_credentials") });
    if (!userData.emailVerified) return res.status(403).json({ error: req.lang === "ko" ? "이메일 인증이 필요합니다." : "Email verification required.", requiresVerification: true, email: userData.email });
    const customToken = await auth.createCustomToken(firebaseUser.uid);
    res.json({ message: t(userData.language || req.lang, "auth_login_success"), customToken, user: { id: firebaseUser.uid, email: userData.email, username: userData.username, language: userData.language } });
  } catch (err) { console.error("Login error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/forgot-password", async (req, res) => {
  const { email, language } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    try { await auth.getUserByEmail(email); } catch { return res.status(404).json({ error: req.lang === "ko" ? "등록되지 않은 이메일입니다." : "This email is not registered." }); }
    const code = generateCode(); await addDoc("emailVerifications", { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000), used: false }); await sendVerificationEmail(email, code, language || req.lang);
    const isDev = !process.env.SMTP_HOST; res.json({ message: "Reset code sent.", ...(isDev && { devCode: code }) });
  } catch (err) { console.error("Forgot password error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: "Email, code, and new password required." });
  if (newPassword.length < 4) return res.status(400).json({ error: "Password too short." });
  try {
    const now = new Date();
    const verifications = await db.collection("emailVerifications").where("email", "==", email).where("code", "==", code).where("used", "==", false).where("expiresAt", ">", now).orderBy("expiresAt", "desc").limit(1).get();
    if (verifications.empty) return res.status(400).json({ error: req.lang === "ko" ? "잘못된 코드이거나 만료되었습니다." : "Invalid or expired code." });
    await db.collection("emailVerifications").doc(verifications.docs[0].id).update({ used: true });
    const firebaseUser = await auth.getUserByEmail(email);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.collection("users").doc(firebaseUser.uid).update({ passwordHash: hash, emailVerified: true });
    res.json({ message: req.lang === "ko" ? "비밀번호가 변경되었습니다." : "Password has been reset." });
  } catch (err) { console.error("Reset password error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/logout", authMiddleware, (req, res) => { res.json({ message: "Logged out." }); });

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    const d = userDoc.data();
    res.json({ user: { id: req.user.id, email: d.email, username: d.username, language: d.language, email_verified: d.emailVerified, created_at: d.createdAt } });
  } catch (err) { res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.patch("/language", authMiddleware, async (req, res) => {
  const { language } = req.body;
  if (!["ko","en","zh","ja"].includes(language)) return res.status(400).json({ error: "Supported: ko, en, zh, ja" });
  await db.collection("users").doc(req.user.id).update({ language });
  res.json({ language });
});

router.get("/providers", (req, res) => {
  const providers = [];
  if (process.env.GOOGLE_CLIENT_ID) providers.push({ id: "google", icon: "G", name: "Google" });
  if (process.env.MICROSOFT_CLIENT_ID) providers.push({ id: "microsoft", icon: "M", name: "Microsoft" });
  if (process.env.APPLE_CLIENT_ID) providers.push({ id: "apple", name: "Apple" });
  res.json({ providers });
});

module.exports = router;
