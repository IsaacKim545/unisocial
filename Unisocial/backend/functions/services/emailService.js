const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) { console.warn("SMTP not configured — dev mode"); return null; }
  return nodemailer.createTransport({ host, port: parseInt(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === "true", auth: { user, pass } });
}

let transporter = null;

function generateCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

async function sendVerificationEmail(email, code, lang = "ko") {
  if (!transporter) transporter = createTransporter();
  const subjects = { ko: "Social Hub 이메일 인증", en: "Social Hub Email Verification", zh: "Social Hub 邮箱验证", ja: "Social Hub メール認証" };
  const bodies = {
    ko: `인증 코드: <b style="font-size:28px;letter-spacing:4px">${code}</b><br><br>이 코드는 10분 후 만료됩니다.`,
    en: `Your verification code: <b style="font-size:28px;letter-spacing:4px">${code}</b><br><br>This code expires in 10 minutes.`,
    zh: `验证码: <b style="font-size:28px;letter-spacing:4px">${code}</b><br><br>此验证码将在10分钟后过期。`,
    ja: `認証コード: <b style="font-size:28px;letter-spacing:4px">${code}</b><br><br>このコードは10分後に期限切れになります。`,
  };
  const html = `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:30px;background:#f8f9fa;border-radius:12px"><h2 style="margin:0 0 8px">Social Hub</h2><p style="color:#666;font-size:13px;margin:0 0 24px">13 Platforms, One Dashboard</p><div style="background:#fff;padding:24px;border-radius:8px;text-align:center">${bodies[lang] || bodies.ko}</div></div>`;
  if (!transporter) { console.log(`[DEV MODE] Verification code for ${email}: ${code}`); return true; }
  await transporter.sendMail({ from: `"Social Hub" <${process.env.SMTP_USER}>`, to: email, subject: subjects[lang] || subjects.ko, html });
  return true;
}

module.exports = { generateCode, sendVerificationEmail };
