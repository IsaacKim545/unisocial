const fetch = require("node-fetch");

// ─── 구독 플랜 정의 ──────────────────────────────────────────
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    posts_per_month: 5,
    ai_suggestions_per_month: 3,
    max_platforms: 2,
    scheduled_posting: false,
    history_days: 7,
    max_band_groups: 1,
  },
  basic: {
    name: "Basic",
    price: 3900, // KRW
    posts_per_month: 50,
    ai_suggestions_per_month: 30,
    max_platforms: 3,
    scheduled_posting: true,
    history_days: 30,
    max_band_groups: 3,
  },
  pro: {
    name: "Pro",
    price: 9900, // KRW
    posts_per_month: -1, // 무제한
    ai_suggestions_per_month: -1,
    max_platforms: 3,
    scheduled_posting: true,
    history_days: -1, // 무제한
    max_band_groups: -1,
  },
};

class PaymentService {
  constructor({ apiSecret, storeId, channelKey }) {
    this.apiSecret = apiSecret; // 포트원 V2 API Secret
    this.storeId = storeId;
    this.channelKey = channelKey; // 결제 채널 키
    this.baseUrl = "https://api.portone.io";
  }

  // ─── 빌링키 발급 (프론트에서 결제창 호출 후 서버에서 확인) ──
  // 프론트엔드에서 PortOne SDK로 빌링키를 발급받고,
  // 콜백으로 billingKey를 서버에 전달하는 구조입니다.

  // ─── 정기결제 예약 (schedule) ──────────────────────────────
  async scheduleBilling({ billingKey, orderId, orderName, amount, customerEmail, scheduledAt }) {
    const res = await fetch(`${this.baseUrl}/payments/${orderId}/schedule`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${this.apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          billingKey,
          orderName,
          customer: { email: customerEmail },
          amount: { total: amount },
          currency: "KRW",
        },
        timeToPay: scheduledAt, // ISO 8601 형식
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`결제 예약 실패: ${err.message || res.status}`);
    }

    return await res.json();
  }

  // ─── 즉시 결제 (빌링키로) ──────────────────────────────────
  async payWithBillingKey({ billingKey, orderId, orderName, amount, customerEmail }) {
    const res = await fetch(`${this.baseUrl}/payments/${orderId}/billing-key`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${this.apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billingKey,
        orderName,
        customer: { email: customerEmail },
        amount: { total: amount },
        currency: "KRW",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`결제 실패: ${err.message || res.status}`);
    }

    return await res.json();
  }

  // ─── 결제 조회 ─────────────────────────────────────────────
  async getPayment(paymentId) {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: {
        Authorization: `PortOne ${this.apiSecret}`,
      },
    });

    if (!res.ok) {
      throw new Error(`결제 조회 실패 (${res.status})`);
    }

    return await res.json();
  }

  // ─── 결제 취소 (환불) ──────────────────────────────────────
  async cancelPayment(paymentId, reason) {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${this.apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      throw new Error(`결제 취소 실패 (${res.status})`);
    }

    return await res.json();
  }

  // ─── 예약 결제 취소 ────────────────────────────────────────
  async cancelSchedule(paymentId) {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}/schedule/revoke`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${this.apiSecret}`,
      },
    });

    if (!res.ok) {
      throw new Error(`예약 취소 실패 (${res.status})`);
    }

    return await res.json();
  }

  // ─── 플랜 정보 조회 ────────────────────────────────────────
  static getPlan(planId) {
    return PLANS[planId] || PLANS.free;
  }

  static getAllPlans() {
    return PLANS;
  }

  // ─── 사용량 체크 ───────────────────────────────────────────
  static isWithinLimit(plan, field, currentUsage) {
    const limit = PLANS[plan]?.[field];
    if (limit === undefined) return false;
    if (limit === -1) return true; // 무제한
    return currentUsage < limit;
  }
}

module.exports = { PaymentService, PLANS };
