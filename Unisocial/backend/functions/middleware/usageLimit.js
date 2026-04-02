const { db, monthStart, countDocs } = require("../config/firebase");
const { PLANS } = require("../services/paymentService");

function checkUsageLimit(field, collection) {
  return async (req, res, next) => {
    try {
      const subsSnap = await db.collection("subscriptions")
        .where("userId", "==", req.user.id)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      const plan = subsSnap.empty ? "free" : subsSnap.docs[0].data().plan;
      const limit = PLANS[plan]?.[field];
      if (limit === -1) return next();
      const used = await countDocs(collection, [
        ["userId", "==", req.user.id],
        ["createdAt", ">=", monthStart()],
      ]);
      if (used >= limit) {
        return res.status(429).json({
          error: "이번 달 사용 한도에 도달했습니다.", plan, field, used, limit,
          upgrade_url: "/subscription/plans",
          message: `${PLANS[plan].name} 플랜의 월 ${limit}회 한도를 초과했습니다.`,
        });
      }
      res.setHeader("X-Usage-Used", used);
      res.setHeader("X-Usage-Limit", limit);
      res.setHeader("X-Usage-Remaining", limit - used);
      next();
    } catch (err) {
      console.error("사용량 체크 오류:", err);
      next();
    }
  };
}

const checkPostLimit = checkUsageLimit("posts_per_month", "posts");
const checkAILimit = checkUsageLimit("ai_suggestions_per_month", "aiUsageLog");

async function checkSchedulePermission(req, res, next) {
  if (!req.body.scheduledFor) return next();
  try {
    const subsSnap = await db.collection("subscriptions")
      .where("userId", "==", req.user.id)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    const plan = subsSnap.empty ? "free" : subsSnap.docs[0].data().plan;
    if (!PLANS[plan]?.scheduled_posting) {
      return res.status(403).json({ error: "예약 게시는 Basic 이상 플랜에서 사용 가능합니다.", plan, upgrade_url: "/subscription/plans" });
    }
    next();
  } catch (err) {
    console.error("예약 권한 체크 오류:", err);
    next();
  }
}

module.exports = { checkPostLimit, checkAILimit, checkSchedulePermission };
