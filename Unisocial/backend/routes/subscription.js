const express = require("express");
const auth = require("../middleware/auth");
const { pool } = require("../config/database");
const { PaymentService, PLANS } = require("../services/paymentService");

const router = express.Router();

const payment = new PaymentService({
  apiSecret: process.env.PORTONE_API_SECRET,
  storeId: process.env.PORTONE_STORE_ID,
  channelKey: process.env.PORTONE_CHANNEL_KEY,
});

// ─── 플랜 목록 조회 (공개) ───────────────────────────────────
router.get("/plans", (req, res) => {
  res.json({ plans: PLANS });
});

// ─── 내 구독 정보 조회 ──────────────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.email, u.username
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // 구독 없으면 Free 플랜
      return res.json({
        plan: "free",
        plan_info: PLANS.free,
        status: "active",
        billing_key: null,
        current_period_end: null,
      });
    }

    const sub = result.rows[0];
    res.json({
      id: sub.id,
      plan: sub.plan,
      plan_info: PLANS[sub.plan],
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      created_at: sub.created_at,
    });
  } catch (err) {
    console.error("구독 조회 오류:", err);
    res.status(500).json({ error: "구독 정보 조회 중 오류가 발생했습니다." });
  }
});

// ─── 내 사용량 조회 ─────────────────────────────────────────
router.get("/usage", auth, async (req, res) => {
  try {
    // 이번 달 게시물 수
    const postCount = await pool.query(
      `SELECT COUNT(*) FROM posts
       WHERE user_id = $1
       AND created_at >= date_trunc('month', NOW())`,
      [req.user.id]
    );

    // 이번 달 AI 추천 사용 수
    const aiCount = await pool.query(
      `SELECT COUNT(*) FROM ai_usage_log
       WHERE user_id = $1
       AND created_at >= date_trunc('month', NOW())`,
      [req.user.id]
    );

    // 현재 플랜
    const subResult = await pool.query(
      `SELECT plan FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const plan = subResult.rows[0]?.plan || "free";
    const planInfo = PLANS[plan];

    res.json({
      plan,
      posts: {
        used: parseInt(postCount.rows[0].count),
        limit: planInfo.posts_per_month,
      },
      ai_suggestions: {
        used: parseInt(aiCount.rows[0].count),
        limit: planInfo.ai_suggestions_per_month,
      },
    });
  } catch (err) {
    console.error("사용량 조회 오류:", err);
    res.status(500).json({ error: "사용량 조회 중 오류가 발생했습니다." });
  }
});

// ─── 빌링키 등록 (프론트에서 발급 후 전달) ──────────────────
router.post("/billing-key", auth, async (req, res) => {
  const { billingKey } = req.body;

  if (!billingKey) {
    return res.status(400).json({ error: "빌링키가 필요합니다." });
  }

  try {
    await pool.query(
      `UPDATE users SET billing_key = $1 WHERE id = $2`,
      [billingKey, req.user.id]
    );

    res.json({ message: "결제 수단이 등록되었습니다." });
  } catch (err) {
    console.error("빌링키 등록 오류:", err);
    res.status(500).json({ error: "결제 수단 등록 중 오류가 발생했습니다." });
  }
});

// ─── 구독 시작 / 플랜 변경 ──────────────────────────────────
router.post("/subscribe", auth, async (req, res) => {
  const { plan } = req.body;

  if (!PLANS[plan] || plan === "free") {
    return res.status(400).json({ error: "유효한 유료 플랜을 선택해주세요." });
  }

  try {
    // 빌링키 확인
    const userResult = await pool.query(
      "SELECT billing_key, email FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user?.billing_key) {
      return res.status(400).json({
        error: "결제 수단을 먼저 등록해주세요.",
        action: "register_billing_key",
      });
    }

    const planInfo = PLANS[plan];
    const orderId = `sub_${req.user.id}_${Date.now()}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // 즉시 첫 결제
    const payResult = await payment.payWithBillingKey({
      billingKey: user.billing_key,
      orderId,
      orderName: `Social Hub ${planInfo.name} 구독`,
      amount: planInfo.price,
      customerEmail: user.email,
    });

    // 기존 구독 비활성화
    await pool.query(
      `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    // 새 구독 생성
    const subResult = await pool.query(
      `INSERT INTO subscriptions
         (user_id, plan, status, billing_key, portone_payment_id, amount,
          current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, plan, user.billing_key, orderId, planInfo.price, now, periodEnd]
    );

    // 다음 달 자동결제 예약
    const nextOrderId = `sub_${req.user.id}_${Date.now() + 1}`;
    await payment.scheduleBilling({
      billingKey: user.billing_key,
      orderId: nextOrderId,
      orderName: `Social Hub ${planInfo.name} 구독 (자동갱신)`,
      amount: planInfo.price,
      customerEmail: user.email,
      scheduledAt: periodEnd.toISOString(),
    });

    res.status(201).json({
      subscription: subResult.rows[0],
      plan_info: planInfo,
      message: `${planInfo.name} 플랜 구독이 시작되었습니다!`,
    });
  } catch (err) {
    console.error("구독 시작 오류:", err);
    res.status(500).json({ error: `구독 처리 중 오류: ${err.message}` });
  }
});

// ─── 구독 취소 ───────────────────────────────────────────────
router.post("/cancel", auth, async (req, res) => {
  try {
    const subResult = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: "활성 구독이 없습니다." });
    }

    const sub = subResult.rows[0];

    // 구독 상태 변경 (현재 기간 끝까지 유지)
    await pool.query(
      `UPDATE subscriptions
       SET status = 'cancelling', cancelled_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );

    // 예약 결제 취소 시도
    try {
      await payment.cancelSchedule(sub.portone_payment_id);
    } catch (schedErr) {
      console.warn("예약 결제 취소 실패 (이미 처리됨):", schedErr.message);
    }

    res.json({
      message: `구독이 취소되었습니다. ${new Date(sub.current_period_end).toLocaleDateString("ko-KR")}까지 현재 플랜을 이용할 수 있습니다.`,
      effective_until: sub.current_period_end,
    });
  } catch (err) {
    console.error("구독 취소 오류:", err);
    res.status(500).json({ error: "구독 취소 중 오류가 발생했습니다." });
  }
});

// ─── 포트원 웹훅 (결제 완료/실패 수신) ──────────────────────
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  // 포트원 V2 웹훅 처리
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { type, data } = body;

    console.log(`[웹훅] 이벤트: ${type}`, data?.paymentId);

    switch (type) {
      case "Transaction.Paid": {
        // 정기결제 성공
        const paymentId = data?.paymentId;
        if (!paymentId) break;

        // 해당 결제의 구독 찾기
        const sub = await pool.query(
          `SELECT s.*, u.email, u.billing_key FROM subscriptions s
           JOIN users u ON u.id = s.user_id
           WHERE s.portone_payment_id = $1 OR s.user_id IN (
             SELECT user_id FROM subscriptions WHERE portone_payment_id LIKE $2
           )
           ORDER BY s.created_at DESC LIMIT 1`,
          [paymentId, `sub_%`]
        );

        if (sub.rows.length > 0) {
          const subscription = sub.rows[0];
          const newPeriodEnd = new Date();
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

          // 구독 갱신
          await pool.query(
            `UPDATE subscriptions
             SET current_period_start = NOW(),
                 current_period_end = $1,
                 status = 'active'
             WHERE id = $2`,
            [newPeriodEnd, subscription.id]
          );

          // 다음 달 결제 예약
          const nextOrderId = `sub_${subscription.user_id}_${Date.now()}`;
          await payment.scheduleBilling({
            billingKey: subscription.billing_key,
            orderId: nextOrderId,
            orderName: `Social Hub ${PLANS[subscription.plan]?.name} 구독 (자동갱신)`,
            amount: subscription.amount,
            customerEmail: subscription.email,
            scheduledAt: newPeriodEnd.toISOString(),
          });
        }
        break;
      }

      case "Transaction.Failed": {
        // 결제 실패 → 재시도 또는 다운그레이드
        const paymentId = data?.paymentId;
        console.error(`[웹훅] 결제 실패: ${paymentId}`);

        // TODO: 재시도 로직 (3일 후 재시도, 3회 실패 시 Free 다운그레이드)
        break;
      }

      default:
        console.log(`[웹훅] 미처리 이벤트: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("웹훅 처리 오류:", err);
    res.status(200).json({ received: true }); // 웹훅은 항상 200 반환
  }
});

module.exports = router;
