const express = require("express");
const { db, addDoc } = require("../config/firebase");
const authMiddleware = require("../middleware/auth");
const { t } = require("../config/i18n");
const LateService = require("../services/lateService");

const router = express.Router();
function getLate() { return new LateService(process.env.LATE_API_KEY); }

router.get("/accounts", authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection("socialAccounts").where("userId", "==", req.user.id).orderBy("connectedAt", "desc").get();
    res.json({ accounts: snap.docs.map(d => ({ id: d.id, platform: d.data().platform, platform_username: d.data().platformUsername, late_account_id: d.data().lateAccountId, is_active: d.data().isActive, connected_at: d.data().connectedAt })) });
  } catch (err) { console.error("Accounts query error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const late = getLate();
    const old = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("platform", "in", ["x", "google_business"]).get();
    const b1 = db.batch(); old.docs.forEach(d => b1.delete(d.ref)); if (!old.empty) await b1.commit();
    const profiles = await late.getProfiles(); const profileList = profiles.profiles || profiles;
    if (!profileList?.length) return res.status(400).json({ error: req.lang === "ko" ? "Late에 프로필이 없습니다." : "No profiles found in Late." });
    let allAccounts = [];
    for (const profile of profileList) { const pid = profile._id || profile.id; const accounts = await late.getAccounts(pid); allAccounts = allAccounts.concat((Array.isArray(accounts) ? accounts : []).map(a => ({ ...a, profileId: pid }))); }
    for (const account of allAccounts) {
      const platform = account.platform; const username = account.username || account.displayName || account.name || account._id; const accountId = account._id || account.id;
      const existing = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("platform", "==", platform).where("lateAccountId", "==", accountId).limit(1).get();
      if (existing.empty) { await addDoc("socialAccounts", { userId: req.user.id, platform, platformUsername: username, lateAccountId: accountId, isActive: true, profileData: account, connectedAt: new Date().toISOString() }); }
      else { await db.collection("socialAccounts").doc(existing.docs[0].id).update({ platformUsername: username, profileData: account }); }
    }
    const activeSnap = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("isActive", "==", true).get();
    res.json({ message: t(req.lang, "social_synced"), accounts: activeSnap.docs.map(d => ({ id: d.id, platform: d.data().platform, platform_username: d.data().platformUsername, is_active: true })), synced: allAccounts.length });
  } catch (err) { console.error("Sync error:", err); res.status(500).json({ error: t(req.lang, "social_sync_error") }); }
});

router.get("/connect/:platform", authMiddleware, async (req, res) => {
  const { platform } = req.params;
  if (!LateService.getPlatforms().includes(platform)) return res.status(400).json({ error: `Unsupported: ${platform}` });
  try {
    const late = getLate(); const profiles = await late.getProfiles(); const profileList = profiles.profiles || profiles;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    if (!profileList?.length) return res.redirect(`${frontendUrl}/accounts?error=no_profile`);
    const profileId = profileList[0]._id || profileList[0].id;
    const redirectUrl = `${frontendUrl}/accounts?connected=${platform}`;
    const disconnected = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("platform", "==", platform).where("isActive", "==", false).get();
    const batch = db.batch(); disconnected.docs.forEach(d => batch.update(d.ref, { isActive: true })); if (!disconnected.empty) await batch.commit();
    res.redirect(late.getConnectUrl(platform, profileId, redirectUrl));
  } catch (err) { console.error("Connect error:", err); res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/accounts?error=connect_failed`); }
});

router.delete("/accounts/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection("socialAccounts").doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== req.user.id) return res.status(404).json({ error: t(req.lang, "social_not_found") });
    await db.collection("socialAccounts").doc(req.params.id).update({ isActive: false });
    const activeSnap = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("isActive", "==", true).get();
    res.json({ message: t(req.lang, "social_disconnected"), accounts: activeSnap.docs.map(d => ({ id: d.id, platform: d.data().platform, platform_username: d.data().platformUsername, is_active: true })) });
  } catch (err) { console.error("Disconnect error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.post("/accounts/:id/reconnect", authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection("socialAccounts").doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== req.user.id || doc.data().isActive) return res.status(404).json({ error: "Account not found or already active." });
    await db.collection("socialAccounts").doc(req.params.id).update({ isActive: true });
    const activeSnap = await db.collection("socialAccounts").where("userId", "==", req.user.id).where("isActive", "==", true).get();
    res.json({ message: req.lang === "ko" ? "계정이 다시 연결되었습니다." : "Account reconnected.", accounts: activeSnap.docs.map(d => ({ id: d.id, platform: d.data().platform, platform_username: d.data().platformUsername, is_active: true })) });
  } catch (err) { console.error("Reconnect error:", err); res.status(500).json({ error: t(req.lang, "error_server") }); }
});

router.get("/profiles", authMiddleware, async (req, res) => { try { res.json({ profiles: await getLate().getProfiles() }); } catch (err) { res.status(500).json({ error: t(req.lang, "error_server") }); } });
router.get("/platforms", (req, res) => { res.json({ platforms: LateService.getPlatforms(), features: LateService.getAllPlatformFeatures() }); });

module.exports = router;
