const { pool } = require("../config/database");
const { PLANS } = require("../services/paymentService");

// ─── 사용량 체크 미들웨어 팩토리 ─────────────────────────────
// field: 'posts_per_month' | 'ai_suggestions_per_month'
// table: 'posts' | 'ai_usage_log'
function checkUsageLimit(field, table) {
  return async (req, res, next) => {
    try {
      // 사용자의 현재 플랜 조회
      const subResult = await pool.query(
        `SELECT plan FROM subscriptions
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );

      const plan = subResult.rows[0]?.plan || "free";
      const limit = PLANS[plan]?.[field];

      // 무제한이면 통과
      if (limit === -1) return next();

      // 이번 달 사용량 조회
      const usageResult = await pool.query(
        `SELECT COUNT(*) FROM ${table}
         WHERE user_id = $1
         AND created_at >= date_trunc('month', NOW())`,
        [req.user.id]
      );

      const used = parseInt(usageResult.rows[0].count);

      if (used >= limit) {
        return res.status(429).json({
          error: "이번 달 사용 한도에 도달했습니다.",
          plan,
          field,
          used,
          limit,
          upgrade_url: "/subscription/plans",
          message: `${PLANS[plan].name} 플랜의 월 ${limit}회 한도를 초과했습니다. 플랜을 업그레이드해주세요.`,
        });
      }

      // 남은 사용량을 헤더에 추가
      res.setHeader("X-Usage-Used", used);
      res.setHeader("X-Usage-Limit", limit);
      res.setHeader("X-Usage-Remaining", limit - used);

      next();
    } catch (err) {
      console.error("사용량 체크 오류:", err);
      next(); // 오류 시에는 통과 (서비스 중단 방지)
    }
  };
}

// 게시물 사용량 체크
const checkPostLimit = checkUsageLimit("posts_per_month", "posts");

// AI 추천 사용량 체크
const checkAILimit = checkUsageLimit("ai_suggestions_per_month", "ai_usage_log");

// 예약 게시 권한 체크
async function checkSchedulePermission(req, res, next) {
  if (!req.body.scheduledFor) return next(); // 예약이 아니면 통과

  try {
    const subResult = await pool.query(
      `SELECT plan FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const plan = subResult.rows[0]?.plan || "free";

    if (!PLANS[plan]?.scheduled_posting) {
      return res.status(403).json({
        error: "예약 게시는 Basic 이상 플랜에서 사용 가능합니다.",
        plan,
        upgrade_url: "/subscription/plans",
      });
    }

    next();
  } catch (err) {
    console.error("예약 권한 체크 오류:", err);
    next();
  }
}

module.exports = { checkPostLimit, checkAILimit, checkSchedulePermission };
