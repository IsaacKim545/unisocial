const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");
const auth = require("../middleware/auth");
const { checkPostLimit, checkSchedulePermission } = require("../middleware/usageLimit");
const { pool } = require("../config/database");
const { t } = require("../config/i18n");
const LateService = require("../services/lateService");

const router = express.Router();
const late = new LateService(process.env.LATE_API_KEY);

// ─── 로컬 파일 → 공개 URL 변환 (catbox.moe) ─────────────────
async function uploadToPublic(localUrl) {
  try {
    const filename = localUrl.split("/uploads/")[1];
    if (!filename) return localUrl;
    const filePath = path.join(__dirname, "..", "public", "uploads", filename);
    if (!fs.existsSync(filePath)) return localUrl;

    const ext = path.extname(filename).toLowerCase();
    const mimeMap = {
      ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".gif":"image/gif",".webp":"image/webp",
      ".mp4":"video/mp4",".mov":"video/quicktime",".avi":"video/x-msvideo",".webm":"video/webm",
    };
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath), {
      filename, contentType: mimeMap[ext] || "application/octet-stream",
    });

    const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) {
        console.log(`✅ Public upload: ${filename} → ${url}`);
        return url;
      }
    }
    console.error(`❌ Catbox failed (${res.status})`);
  } catch (err) {
    console.error("❌ Public upload error:", err.message);
  }
  return localUrl;
}

// ─── 게시 ───────────────────────────────────────────────────
router.post("/", auth, checkPostLimit, checkSchedulePermission, async (req, res) => {
  const { content, mediaItems, platforms, scheduledFor, platformSpecific } = req.body;

  if ((!content && (!mediaItems || mediaItems.length === 0)) || !platforms || platforms.length === 0) {
    return res.status(400).json({ error: t(req.lang, "post_content_required") });
  }

  try {
    const accountsResult = await pool.query(
      `SELECT platform, late_account_id FROM social_accounts
       WHERE user_id = $1 AND platform = ANY($2) AND is_active = true`,
      [req.user.id, platforms]
    );
    const lateAccounts = accountsResult.rows
      .filter(a => a.late_account_id)
      .map(a => ({ platform: a.platform, accountId: a.late_account_id }));

    if (lateAccounts.length === 0) {
      return res.status(400).json({
        error: req.lang === "ko" ? "연결된 계정이 없습니다. 먼저 계정을 동기화해주세요."
             : req.lang === "zh" ? "没有已连接的账户。请先同步账户。"
             : req.lang === "ja" ? "接続されたアカウントがありません。先にアカウントを同期してください。"
             : "No connected accounts found. Please sync your accounts first.",
      });
    }

    // 로컬 미디어 → 공개 URL 변환
    let publicMedia = [];
    if (mediaItems && mediaItems.length > 0) {
      console.log("📎 Uploading media to public host...");
      publicMedia = await Promise.all(
        mediaItems.map(async item => {
          if (item.url && item.url.includes("localhost")) {
            return { ...item, url: await uploadToPublic(item.url) };
          }
          return item;
        })
      );
      console.log("📎 Media URLs:", publicMedia.map(m => m.url));
    }

    const postPayload = {
      content: content || "",
      platforms: lateAccounts,
      mediaItems: publicMedia,
      scheduledFor,
      platformSpecific: platformSpecific || {},
    };
    console.log("📤 Late API Request:", JSON.stringify(postPayload, null, 2));

    const lateResult = await late.createPost(postPayload);
    console.log("📥 Late API Response:", JSON.stringify(lateResult, null, 2));

    const status = scheduledFor ? "scheduled" : "published";
    const dbResult = await pool.query(
      `INSERT INTO posts (user_id, content, media_urls, platforms, platform_specific, platform_results, late_post_id, status, scheduled_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, content||"", JSON.stringify(mediaItems||[]), JSON.stringify(platforms),
       JSON.stringify(platformSpecific||{}), JSON.stringify(lateResult),
       lateResult?.post?._id || lateResult?.post?.id || null, status,
       scheduledFor || null, scheduledFor ? null : new Date().toISOString()]
    );

    res.status(201).json({
      message: t(req.lang, scheduledFor ? "post_scheduled" : "post_created"),
      post: dbResult.rows[0], late: lateResult,
    });
  } catch (err) {
    console.error("Posting error:", err);
    res.status(500).json({ error: t(req.lang, "post_error"), detail: err.message });
  }
});

// ─── 게시물 목록 ────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;
  try {
    let query = "SELECT * FROM posts WHERE user_id = $1";
    const params = [req.user.id];
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);
    const cnt = await pool.query("SELECT COUNT(*) FROM posts WHERE user_id = $1", [req.user.id]);
    res.json({ posts: result.rows, total: parseInt(cnt.rows[0].count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error("Posts query error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── 단일 게시물 조회 ────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: t(req.lang, "post_not_found") });
    res.json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

// ─── 예약 게시물 수정 ───────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
  const { content, mediaItems, platforms, scheduledFor, platformSpecific } = req.body;
  try {
    // 기존 게시물 조회
    const existing = await pool.query(
      "SELECT * FROM posts WHERE id = $1 AND user_id = $2 AND status = 'scheduled'",
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      return res.status(400).json({
        error: req.lang === "ko" ? "예약된 게시물만 수정할 수 있습니다."
             : req.lang === "zh" ? "只能编辑预约中的帖子。"
             : req.lang === "ja" ? "予約投稿のみ編集可能です。"
             : "Only scheduled posts can be edited.",
      });
    }

    // Late에서 기존 게시물 삭제
    const oldLateId = existing.rows[0].late_post_id;
    if (oldLateId) { try { await late.deletePost(oldLateId); } catch (e) { console.log("Old Late post delete:", e.message); } }

    // 계정 조회
    const accountsResult = await pool.query(
      `SELECT platform, late_account_id FROM social_accounts
       WHERE user_id = $1 AND platform = ANY($2) AND is_active = true`,
      [req.user.id, platforms]
    );
    const lateAccounts = accountsResult.rows
      .filter(a => a.late_account_id)
      .map(a => ({ platform: a.platform, accountId: a.late_account_id }));

    if (lateAccounts.length === 0) {
      return res.status(400).json({ error: "No connected accounts." });
    }

    // 로컬 미디어 → 공개 URL
    let publicMedia = [];
    if (mediaItems && mediaItems.length > 0) {
      publicMedia = await Promise.all(
        mediaItems.map(async item => {
          if (item.url && item.url.includes("localhost")) {
            return { ...item, url: await uploadToPublic(item.url) };
          }
          return item;
        })
      );
    }

    // Late API로 새로 게시
    const lateResult = await late.createPost({
      content: content || "",
      platforms: lateAccounts,
      mediaItems: publicMedia,
      scheduledFor,
      platformSpecific: platformSpecific || {},
    });

    // DB 업데이트
    const dbResult = await pool.query(
      `UPDATE posts SET content=$1, media_urls=$2, platforms=$3, platform_specific=$4,
       platform_results=$5, late_post_id=$6, scheduled_at=$7, updated_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [
        content || "", JSON.stringify(mediaItems || []), JSON.stringify(platforms),
        JSON.stringify(platformSpecific || {}), JSON.stringify(lateResult),
        lateResult?.post?._id || lateResult?.post?.id || null,
        scheduledFor || null, req.params.id, req.user.id,
      ]
    );

    res.json({
      message: req.lang === "ko" ? "예약 게시물이 수정되었습니다." : "Scheduled post updated.",
      post: dbResult.rows[0], late: lateResult,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: t(req.lang, "post_error"), detail: err.message });
  }
});

// ─── 게시물 삭제 ────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *", [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: t(req.lang, "post_not_found") });
    const latePostId = result.rows[0].late_post_id;
    if (latePostId) { try { await late.deletePost(latePostId); } catch {} }
    res.json({ message: t(req.lang, "post_deleted") });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: t(req.lang, "error_server") });
  }
});

module.exports = router;
