const express = require("express");
const { admin, db, addDoc, countDocs, monthStart } = require("../config/firebase");
const authMiddleware = require("../middleware/auth");
const { PaymentService, PLANS } = require("../services/paymentService");

const router = express.Router();
function getPayment() { return new PaymentService({ apiSecret: process.env.PORTONE_API_SECRET, storeId: process.env.PORTONE_STORE_ID, channelKey: process.env.PORTONE_CHANNEL_KEY }); }

router.get("/plans", (req, res) => { res.json({ plans: PLANS }); });

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection("subscriptions").where("userId", "==", req.user.id).where("status", "==", "active").orderBy("createdAt", "desc").limit(1).get();
    if (snap.empty) return res.json({ plan: "free", plan_info: PLANS.free, status: "active", billing_key: null, current_period_end: null });
    const sub = { id: snap.docs[0].id, ...snap.docs[0].data() };
    res.json({ id: sub.id, plan: sub.plan, plan_info: PLANS[sub.plan], status: sub.status, current_period_start: sub.currentPeriodStart, current_period_end: sub.currentPeriodEnd, created_at: sub.createdAt });
  } catch (err) { console.error("구독 조회 오류:", err); res.status(500).json({ error: "구독 정보 조회 중 오류가 발생했습니다." }); }
});

router.get("/usage", authMiddleware, async (req, res) => {
  try {
    const start = monthStart();
    const postCount = await countDocs("posts", [["userId", "==", req.user.id], ["createdAt", ">=", start]]);
    const aiCount = await countDocs("aiUsageLog", [["userId", "==", req.user.id], ["createdAt", ">=", start]]);
    const snap = await db.collection("subscriptions").where("userId", "==", req.user.id).where("status", "==", "active").orderBy("createdAt", "desc").limit(1).get();
    const plan = snap.empty ? "free" : snap.docs[0].data().plan;
    res.json({ plan, posts: { used: postCount, limit: PLANS[plan].posts_per_month }, ai_suggestions: { used: aiCount, limit: PLANS[plan].ai_suggestions_per_month } });
  } catch (err) { console.error("사용량 조회 오류:", err); res.status(500).json({ error: "사용량 조회 중 오류가 발생했습니다." }); }
});

router.post("/billing-key", authMiddleware, async (req, res) => {
  const { billingKey } = req.body;
  if (!billingKey) return res.status(400).json({ error: "빌링키가 필요합니다." });
  try { await db.collection("users").doc(req.user.id).update({ billingKey }); res.json({ message: "결제 수단이 등록되었습니다." }); }
  catch (err) { res.status(500).json({ error: "결제 수단 등록 중 오류가 발생했습니다." }); }
});

router.post("/subscribe", authMiddleware, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan] || plan === "free") return res.status(400).json({ error: "유효한 유료 플랜을 선택해주세요." });
  try {
    const payment = getPayment();
    const userDoc = await db.collection("users").doc(req.user.id).get(); const userData = userDoc.data();
    if (!userData?.billingKey) return res.status(400).json({ error: "결제 수단을 먼저 등록해주세요.", action: "register_billing_key" });
    const planInfo = PLANS[plan]; const orderId = `sub_${req.user.id}_${Date.now()}`; const now = new Date(); const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1);
    await payment.payWithBillingKey({ billingKey: userData.billingKey, orderId, orderName: `Social Hub ${planInfo.name} 구독`, amount: planInfo.price, customerEmail: userData.email });
    const activeSubs = await db.collection("subscriptions").where("userId", "==", req.user.id).where("status", "==", "active").get();
    const batch = db.batch(); activeSubs.docs.forEach(d => batch.update(d.ref, { status: "cancelled" })); if (!activeSubs.empty) await batch.commit();
    const sub = await addDoc("subscriptions", { userId: req.user.id, plan, status: "active", billingKey: userData.billingKey, portonePaymentId: orderId, amount: planInfo.price, currentPeriodStart: now.toISOString(), currentPeriodEnd: periodEnd.toISOString() });
    await payment.scheduleBilling({ billingKey: userData.billingKey, orderId: `sub_${req.user.id}_${Date.now()+1}`, orderName: `Social Hub ${planInfo.name} 구독 (자동갱신)`, amount: planInfo.price, customerEmail: userData.email, scheduledAt: periodEnd.toISOString() });
    res.status(201).json({ subscription: sub, plan_info: planInfo, message: `${planInfo.name} 플랜 구독이 시작되었습니다!` });
  } catch (err) { console.error("구독 시작 오류:", err); res.status(500).json({ error: `구독 처리 중 오류: ${err.message}` }); }
});

router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const payment = getPayment();
    const snap = await db.collection("subscriptions").where("userId", "==", req.user.id).where("status", "==", "active").orderBy("createdAt", "desc").limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "활성 구독이 없습니다." });
    const subDoc = snap.docs[0]; const sub = subDoc.data();
    await db.collection("subscriptions").doc(subDoc.id).update({ status: "cancelling", cancelledAt: new Date().toISOString() });
    try { await payment.cancelSchedule(sub.portonePaymentId); } catch (e) { console.warn("예약 결제 취소 실패:", e.message); }
    res.json({ message: `구독이 취소되었습니다. ${new Date(sub.currentPeriodEnd).toLocaleDateString("ko-KR")}까지 현재 플랜을 이용할 수 있습니다.`, effective_until: sub.currentPeriodEnd });
  } catch (err) { console.error("구독 취소 오류:", err); res.status(500).json({ error: "구독 취소 중 오류가 발생했습니다." }); }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { type, data } = body;
    if (type === "Transaction.Paid" && data?.paymentId) {
      const payment = getPayment();
      const snap = await db.collection("subscriptions").where("portonePaymentId", "==", data.paymentId).limit(1).get();
      if (!snap.empty) {
        const subDoc = snap.docs[0]; const sub = subDoc.data(); const newEnd = new Date(); newEnd.setMonth(newEnd.getMonth() + 1);
        await db.collection("subscriptions").doc(subDoc.id).update({ currentPeriodStart: new Date().toISOString(), currentPeriodEnd: newEnd.toISOString(), status: "active" });
        const userDoc = await db.collection("users").doc(sub.userId).get();
        await payment.scheduleBilling({ billingKey: sub.billingKey, orderId: `sub_${sub.userId}_${Date.now()}`, orderName: `Social Hub ${PLANS[sub.plan]?.name} 구독 (자동갱신)`, amount: sub.amount, customerEmail: userDoc.data().email, scheduledAt: newEnd.toISOString() });
      }
    }
    res.status(200).json({ received: true });
  } catch (err) { console.error("웹훅 처리 오류:", err); res.status(200).json({ received: true }); }
});

module.exports = router;
