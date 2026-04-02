const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const express = require("express");
const cors = require("cors");
const Busboy = require("busboy");
const path = require("path");
const { admin, db, storage } = require("./config/firebase");
const { detectLanguage } = require("./config/i18n");
const LateService = require("./services/lateService");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(detectLanguage);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/social", require("./routes/social"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/subscription", require("./routes/subscription"));

app.get("/api/health", (req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString(), language: req.lang, platform: "firebase" }); });
app.get("/api/platforms", (req, res) => { res.json({ platforms: LateService.getPlatforms(), features: LateService.getAllPlatformFeatures() }); });

app.post("/api/upload", authMiddleware, (req, res) => {
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024, files: 10 } });
  const uploads = [];
  const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i;
  busboy.on("file", (fieldname, file, info) => {
    const { filename, mimeType } = info;
    if (!allowed.test(filename)) { file.resume(); return; }
    const ext = path.extname(filename);
    const newFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = `uploads/${req.user.id}/${newFilename}`;
    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);
    const chunks = [];
    file.on("data", (chunk) => chunks.push(chunk));
    file.on("end", () => {
      const buffer = Buffer.concat(chunks);
      uploads.push(fileRef.save(buffer, { metadata: { contentType: mimeType }, public: true }).then(() => ({
        filename: newFilename, originalName: filename, size: buffer.length, mimetype: mimeType,
        url: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
        type: mimeType.startsWith("video") ? "video" : "image",
      })));
    });
  });
  busboy.on("finish", async () => { try { const files = await Promise.all(uploads); if (!files.length) return res.status(400).json({ error: "No files uploaded." }); res.json({ files }); } catch (err) { res.status(500).json({ error: "File upload failed." }); } });
  busboy.on("error", () => { res.status(500).json({ error: "File upload failed." }); });
  if (req.rawBody) busboy.end(req.rawBody); else req.pipe(busboy);
});

app.use((err, req, res, next) => { console.error("Server error:", err); const { t } = require("./config/i18n"); res.status(500).json({ error: t(req.lang, "error_server") }); });

exports.api = onRequest({ region: "asia-northeast3", timeoutSeconds: 120, memory: "512MiB", minInstances: 0, maxInstances: 100 }, app);

exports.onUserCreated = onDocumentCreated({ document: "users/{userId}", region: "asia-northeast3" }, async (event) => {
  const userId = event.params.userId;
  try {
    const existing = await db.collection("subscriptions").where("userId", "==", userId).limit(1).get();
    if (existing.empty) {
      await db.collection("subscriptions").add({ userId, plan: "free", status: "active", billingKey: null, portonePaymentId: null, amount: 0, currentPeriodStart: null, currentPeriodEnd: null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  } catch (err) { console.error("Auto subscription error:", err); }
});
