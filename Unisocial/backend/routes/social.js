const express = require("express");
const auth = require("../middleware/auth");
const { pool } = require("../config/database");
const { t } = require("../config/i18n");
const LateService = require("../services/lateService");

const router = express.Router();

const late = new LateService(process.env.LATE_API_KEY);

// ─── 연결된 계정 목록 ───────────────────────────────────────
router.get("/accounts", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, platform, platform_username, late_account_id, is_active, connected_at
       FROM social_accounts WHERE user_id = $1 ORDER BY connected_at DESC`,
      [req.user.id]
    );
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("Accounts query error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Late 계정 동기화 (모든 플랫폼) ─────────────────────────
router.post("/sync", auth, async (req, res) => {
  try {
    // 0. 이전 플랫폼 ID 정리 (x→twitter, google_business→googlebusiness)
    await pool.query(
      "DELETE FROM social_accounts WHERE user_id = $1 AND platform IN ('x', 'google_business')",
      [req.user.id]
    );

    // 1. 프로필 목록 가져오기
    const profiles = await late.getProfiles();
    const profileList = profiles.profiles || profiles;

    if (!profileList || profileList.length === 0) {
      return res.status(400).json({
        error: req.lang === "ko"
          ? "Late에 프로필이 없습니다. Late 대시보드에서 프로필을 먼저 만들어주세요."
          : "No profiles found in Late. Create a profile in Late dashboard first.",
        action: "https://getlate.dev → Dashboard → Profiles",
      });
    }

    console.log(`🔄 Sync: Found ${profileList.length} profile(s) for user ${req.user.id}`);

    // 2. 각 프로필의 계정 가져오기
    let allAccounts = [];
    for (const profile of profileList) {
      const profileId = profile._id || profile.id;
      const accounts = await late.getAccounts(profileId);
      const accountList = Array.isArray(accounts) ? accounts : [];
      console.log(`🔄 Profile ${profileId}: ${accountList.length} account(s) — [${accountList.map(a => a.platform).join(", ")}]`);
      allAccounts = allAccounts.concat(
        accountList.map(a => ({ ...a, profileId }))
      );
    }

    // 3. Late에서 가져온 계정 → DB 저장
    //    ⚠️ 기존에 사용자가 연결 해제한 계정(is_active=false)은 그대로 유지
    for (const account of allAccounts) {
      const platform = account.platform;
      const username = account.username || account.displayName || account.name || account._id;
      const accountId = account._id || account.id;

      console.log(`🔄 Syncing: ${platform} — @${username} (${accountId})`);

      await pool.query(
        `INSERT INTO social_accounts (user_id, platform, platform_username, late_account_id, is_active, profile_data)
         VALUES ($1, $2, $3, $4, true, $5)
         ON CONFLICT (user_id, platform, late_account_id)
         DO UPDATE SET platform_username = $3, profile_data = $5`,
        [req.user.id, platform, username, accountId, JSON.stringify(account)]
      );
    }

    const result = await pool.query(
      "SELECT id, platform, platform_username, is_active FROM social_accounts WHERE user_id = $1 AND is_active = true",
      [req.user.id]
    );

    console.log(`✅ Sync complete: ${result.rows.length} active account(s) — [${result.rows.map(r => r.platform).join(", ")}]`);

    res.json({
      message: t(req.lang, "social_synced"),
      accounts: result.rows,
      synced: allAccounts.length,
    });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: t(req.lang, "social_sync_error") });
  }
});

// ─── 플랫폼 연결 (원클릭) ────────────────────────────────────
router.get("/connect/:platform", auth, async (req, res) => {
  const { platform } = req.params;

  const supported = LateService.getPlatforms();
  if (!supported.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}`, supported });
  }

  try {
    // Late 프로필 자동 탐색 (첫 번째 프로필 사용)
    const profiles = await late.getProfiles();
    const profileList = profiles.profiles || profiles;

    if (!profileList || profileList.length === 0) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/accounts?error=no_profile`);
    }

    const profileId = profileList[0]._id || profileList[0].id;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/accounts?connected=${platform}`;
    const connectUrl = late.getConnectUrl(platform, profileId, redirectUrl);

    console.log(`🔗 Connect ${platform}: profile=${profileId}, redirect=${redirectUrl}`);

    // 해당 플랫폼이 이전에 연결 해제된 상태면 다시 활성화
    await pool.query(
      `UPDATE social_accounts SET is_active = true
       WHERE user_id = $1 AND platform = $2 AND is_active = false`,
      [req.user.id, platform]
    );

    res.redirect(connectUrl);
  } catch (err) {
    console.error("Connect URL error:", err);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/accounts?error=connect_failed`);
  }
});

// ─── 계정 연결 해제 ─────────────────────────────────────────
router.delete("/accounts/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE social_accounts SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: t(req.lang, "social_not_found") });
    }

    console.log(`🔌 Disconnected: ${result.rows[0].platform} — @${result.rows[0].platform_username}`);

    // 현재 활성 계정 목록 반환
    const active = await pool.query(
      "SELECT id, platform, platform_username, is_active FROM social_accounts WHERE user_id = $1 AND is_active = true",
      [req.user.id]
    );

    res.json({
      message: t(req.lang, "social_disconnected"),
      accounts: active.rows,
    });
  } catch (err) {
    console.error("Disconnect error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── 계정 재연결 (연결 해제된 계정 다시 활성화) ──────────────
router.post("/accounts/:id/reconnect", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE social_accounts SET is_active = true WHERE id = $1 AND user_id = $2 AND is_active = false RETURNING *",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found or already active." });
    }

    console.log(`🔗 Reconnected: ${result.rows[0].platform} — @${result.rows[0].platform_username}`);

    const active = await pool.query(
      "SELECT id, platform, platform_username, is_active FROM social_accounts WHERE user_id = $1 AND is_active = true",
      [req.user.id]
    );

    res.json({
      message: req.lang === "ko" ? "계정이 다시 연결되었습니다." : "Account reconnected.",
      accounts: active.rows,
    });
  } catch (err) {
    console.error("Reconnect error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── Late 프로필 목록 ───────────────────────────────────────
router.get("/profiles", auth, async (req, res) => {
  try {
    const profiles = await late.getProfiles();
    res.json({ profiles });
  } catch (err) {
    console.error("Profiles error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── 플랫폼 정보 ────────────────────────────────────────────
router.get("/platforms", (req, res) => {
  res.json({
    platforms: LateService.getPlatforms(),
    features: LateService.getAllPlatformFeatures(),
  });
});

module.exports = router;
