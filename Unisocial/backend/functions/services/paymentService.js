const fetch = require("node-fetch");

const PLANS = {
  free: { name: "Free", price: 0, posts_per_month: 5, ai_suggestions_per_month: 3, max_platforms: 2, scheduled_posting: false, history_days: 7, max_band_groups: 1 },
  basic: { name: "Basic", price: 3900, posts_per_month: 50, ai_suggestions_per_month: 30, max_platforms: 3, scheduled_posting: true, history_days: 30, max_band_groups: 3 },
  pro: { name: "Pro", price: 9900, posts_per_month: -1, ai_suggestions_per_month: -1, max_platforms: 3, scheduled_posting: true, history_days: -1, max_band_groups: -1 },
};

class PaymentService {
  constructor({ apiSecret, storeId, channelKey }) { this.apiSecret = apiSecret; this.storeId = storeId; this.channelKey = channelKey; this.baseUrl = "https://api.portone.io"; }

  async scheduleBilling({ billingKey, orderId, orderName, amount, customerEmail, scheduledAt }) {
    const res = await fetch(`${this.baseUrl}/payments/${orderId}/schedule`, { method: "POST", headers: { Authorization: `PortOne ${this.apiSecret}`, "Content-Type": "application/json" }, body: JSON.stringify({ payment: { billingKey, orderName, customer: { email: customerEmail }, amount: { total: amount }, currency: "KRW" }, timeToPay: scheduledAt }) });
    if (!res.ok) { const err = await res.json(); throw new Error(`결제 예약 실패: ${err.message || res.status}`); } return await res.json();
  }

  async payWithBillingKey({ billingKey, orderId, orderName, amount, customerEmail }) {
    const res = await fetch(`${this.baseUrl}/payments/${orderId}/billing-key`, { method: "POST", headers: { Authorization: `PortOne ${this.apiSecret}`, "Content-Type": "application/json" }, body: JSON.stringify({ billingKey, orderName, customer: { email: customerEmail }, amount: { total: amount }, currency: "KRW" }) });
    if (!res.ok) { const err = await res.json(); throw new Error(`결제 실패: ${err.message || res.status}`); } return await res.json();
  }

  async getPayment(paymentId) { const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, { headers: { Authorization: `PortOne ${this.apiSecret}` } }); if (!res.ok) throw new Error(`결제 조회 실패 (${res.status})`); return await res.json(); }
  async cancelPayment(paymentId, reason) { const res = await fetch(`${this.baseUrl}/payments/${paymentId}/cancel`, { method: "POST", headers: { Authorization: `PortOne ${this.apiSecret}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); if (!res.ok) throw new Error(`결제 취소 실패 (${res.status})`); return await res.json(); }
  async cancelSchedule(paymentId) { const res = await fetch(`${this.baseUrl}/payments/${paymentId}/schedule/revoke`, { method: "POST", headers: { Authorization: `PortOne ${this.apiSecret}` } }); if (!res.ok) throw new Error(`예약 취소 실패 (${res.status})`); return await res.json(); }

  static getPlan(planId) { return PLANS[planId] || PLANS.free; }
  static getAllPlans() { return PLANS; }
  static isWithinLimit(plan, field, currentUsage) { const limit = PLANS[plan]?.[field]; if (limit === undefined) return false; if (limit === -1) return true; return currentUsage < limit; }
}

module.exports = { PaymentService, PLANS };
