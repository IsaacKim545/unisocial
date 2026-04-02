const express = require("express");
const { admin, db, addDoc, updateDoc, deleteDoc } = require("../config/firebase");
const authMiddleware = require("../middleware/auth");
const { checkPostLimit, checkSchedulePermission } = require("../middleware/usageLimit");
const { t } = require("../config/i18n");
const LateService = require("../services/lateService");
const fetch = require("node-fetch");
const FormData = require("form-data");

const router = express.Router();
function getLate() { return new LateService(process.env.LATE_API_KEY); }

async function uploadToPublic(localUrl) {
  try {
    if (localUrl.includes("firebasestorage.googleapis.com") || localUrl.includes("storage.googleapis.com")) return localUrl;
    const form = new FormData(); form.append("reqtype", "urlupload"); form.append("url", localUrl);
    const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
    if (res.ok) { const url = (await res.text()).trim(); if (url.startsWith("http")) return url; }
  } catch (err) { console.error("Public upload error:", err.message); }
  return localUrl;
}

router.post("/", authMiddleware, checkPostLimit, checkSchedulePermission, async (req, res) => {
  const { content, mediaItems, platforms, scheduledFor, platformSpecific } = req.body;
  if ((!content && (!mediaItems || mediaItems.length === 0)) || !platforms || platforms.length === 0) return res.status(400).json({ error: t(req.lang, "post_content_required") });
  try {
    const late = getLate();
    const accountsSnap = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("isActive", "==", true).get();
    const lateAccounts = accountsSnap.docs.map(d => d.data()).filter(a => platforms.includes(a.platform) && a.lateAccountId).map(a => ({ platform: a.platform, accountId: a.lateAccountId }));
    if (lateAccounts.length === 0) return res.status(400).json({ error: req.lang === "ko" ? "연결된 계정이 없습니다." : "No connected accounts found." });
    let publicMedia = [];
    if (mediaItems?.length > 0) { publicMedia = await Promise.all(mediaItems.map(async item => { if (item.url && (item.url.includes("localhost") || item.url.includes("127.0.0.1"))) return { ...item, url: await uploadToPublic(item.url) }; return item; })); }
    const lateResult = await late.createPost({ content: content || "", platforms: lateAccounts, mediaItems: publicMedia, scheduledFor, platformSpecific: platformSpecific || {} });
    const status = scheduledFor ? "scheduled" : "published";
    const post = await addDoc("posts", { userId: req.user.id, content: content || "", mediaUrls: mediaItems || [], platforms, platformSpecific: platformSpecific || {}, platformResults: lateResult, latePostId: lateResult?.post?._id || lateResult?.post?.id || null, status, scheduledAt: scheduledFor || null, publishedAt: scheduledFor ? null : new Date().toISOString() });
    res.status(201).json({ message: t(req.lang, scheduledFor ? "post_scheduled" : "post_created"), post, late: lateResult });
  } catch (err) { console.error("Posting error:", err); res.status(500).json({ error: t(req.lang, "post_error"), detail: err.message }); }
});

router.get("/", authMiddleware, async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;
  try {
    let ref = db.collection("posts").where("userId", "==", req.user.id);
    if (status) ref = ref.where("status", "==", status);
    ref = ref.orderBy("createdAt", "desc");
    const limitNum = parseInt(limit); const offsetNum = parseInt(offset);
    const countSnap = await db.collection("posts").where("userId", "==", req.user.id).count().get();
    const total = countSnap.data().count;
    const allSnap = await ref.limit(offsetNum + limitNum).get();
    const allDocs = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ posts: allDocs.slice(offsetNum, offsetNum + limitNum), total, limit: limitNum, offset: offsetNum });
  } catch (err) { console.error("Posts query error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try { const doc = await db.collection("posts").doc(req.params.id).get(); if (!doc.exists || doc.data().userId !== req.user.id) return res.status(404).json({ error: t(req.lang, "post_not_found") }); res.json({ post: { id: doc.id, ...doc.data() } }); }
  catch (err) { res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { content, mediaItems, platforms, scheduledFor, platformSpecific } = req.body;
  try {
    const late = getLate();
    const doc = await db.collection("posts").doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== req.user.id || doc.data().status !== "scheduled") return res.status(400).json({ error: req.lang === "ko" ? "예약된 게시물만 수정할 수 있습니다." : "Only scheduled posts can be edited." });
    const oldLateId = doc.data().latePostId; if (oldLateId) { try { await late.deletePost(oldLateId); } catch (e) {} }
    const accountsSnap = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("isActive", "==", true).get();
    const lateAccounts = accountsSnap.docs.map(d => d.data()).filter(a => platforms.includes(a.platform) && a.lateAccountId).map(a => ({ platform: a.platform, accountId: a.lateAccountId }));
    if (lateAccounts.length === 0) return res.status(400).json({ error: "No connected accounts." });
    let publicMedia = [];
    if (mediaItems?.length > 0) { publicMedia = await Promise.all(mediaItems.map(async item => { if (item.url && (item.url.includes("localhost") || item.url.includes("127.0.0.1"))) return { ...item, url: await uploadToPublic(item.url) }; return item; })); }
    const lateResult = await late.createPost({ content: content || "", platforms: lateAccounts, mediaItems: publicMedia, scheduledFor, platformSpecific: platformSpecific || {} });
    await updateDoc("posts", req.params.id, { content: content || "", mediaUrls: mediaItems || [], platforms, platformSpecific: platformSpecific || {}, platformResults: lateResult, latePostId: lateResult?.post?._id || lateResult?.post?.id || null, scheduledAt: scheduledFor || null });
    const updated = await db.collection("posts").doc(req.params.id).get();
    res.json({ message: req.lang === "ko" ? "예약 게시물이 수정되었습니다." : "Scheduled post updated.", post: { id: updated.id, ...updated.data() }, late: lateResult });
  } catch (err) { console.error("Update error:", err); res.status(500).json({ error: t(req.lang, "post_error"), detail: err.message }); }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection("posts").doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== req.user.id) return res.status(404).json({ error: t(req.lang, "post_not_found") });
    const latePostId = doc.data().latePostId; if (latePostId) { try { await getLate().deletePost(latePostId); } catch {} }
    await deleteDoc("posts", req.params.id);
    res.json({ message: t(req.lang, "post_deleted") });
  } catch (err) { console.error("Delete error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

module.exports = router;
