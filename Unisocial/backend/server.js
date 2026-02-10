require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDB } = require("./config/database");
const { detectLanguage } = require("./config/i18n");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const socialRoutes = require("./routes/social");
const aiRoutes = require("./routes/ai");
const subscriptionRoutes = require("./routes/subscription");

const path = require("path");
const multer = require("multer");
const app = express();
const PORT = process.env.PORT || 3001;

// ─── File Upload Setup ──────────────────────────────────────
const fs = require("fs");
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error("Unsupported file type"), false);
  },
});

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(detectLanguage); // 다국어 감지

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/subscription", subscriptionRoutes);

// ─── OAuth ──────────────────────────────────────────────────
const { initOAuth } = require("./services/oauthService");
const oauthRoutes = initOAuth(app);
app.use("/api/auth", oauthRoutes);

// ─── Health Check ───────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    language: req.lang,
  });
});

// ─── Platform Info ──────────────────────────────────────────
app.get("/api/platforms", (req, res) => {
  const LateService = require("./services/lateService");
  res.json({
    platforms: LateService.getPlatforms(),
    features: LateService.getAllPlatformFeatures(),
  });
});

// ─── File Upload ────────────────────────────────────────────
const authMiddleware = require("./middleware/auth");
app.post("/api/upload", authMiddleware, upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const files = req.files.map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
    url: `${baseUrl}/uploads/${f.filename}`,
    type: f.mimetype.startsWith("video") ? "video" : "image",
  }));
  res.json({ files });
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  const { t } = require("./config/i18n");
  res.status(500).json({ error: t(req.lang, "error_server") });
});

// ─── Start ──────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🚀 Social Hub Server                       ║
║   📡 http://localhost:${PORT}                   ║
║   📋 API: /api/health                        ║
║   🌐 Languages: ko, en, zh, ja               ║
║   📱 Platforms: 13 (via Late API)             ║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
