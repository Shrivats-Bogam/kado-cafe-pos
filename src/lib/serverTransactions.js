// src/lib/serverTransactions.js
// Server-Authoritative Transaction Engine Client Library (Phase 4B.1)
// Connects POS checkout to PostgreSQL B4A Financial Foundation RPCs

/**
 * Generate a collision-resistant idempotency key for financial transactions
 * @param {string} prefix 
 * @returns {string} Unique idempotency key
 */
export function createTransactionIdempotencyKey(prefix = "tx") {
  return `idem_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Execute server-authoritative payment settlement transaction
 * @param {object} params
 * @param {object} params.supabaseClient
 * @param {string} params.orderId
 * @param {string} [params.paymentMethod='Cash']
 * @param {number} params.amount
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Transaction result { success: true, payment_id, ledger_id, amount, status: 'PAID', ... }
 */
export async function executeServerPayment({
  supabaseClient = null,
  orderId,
  paymentMethod = "Cash",
  amount,
  idempotencyKey = null,
  isOffline = false
}) {
  const key = idempotencyKey || createTransactionIdempotencyKey("pay");

  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("INVALID_ORDER_ID: order_id is required for payment settlement.");
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("INVALID_AMOUNT: Payment amount must be a valid number greater than zero.");
  }

  // FINANCIAL SAFETY RULE: Block payment settlement if client is offline
  if (isOffline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    throw new Error("OFFLINE_PAYMENT_BLOCKED: Financial transactions cannot be settled while offline. Reconnect to proceed.");
  }

  // Execute B4A RPC if Supabase client available
  if (supabaseClient && typeof supabaseClient.rpc === "function") {
    const { data, error } = await supabaseClient.rpc("record_server_payment", {
      p_order_id: orderId.trim(),
      p_amount: numAmount,
      p_payment_method: paymentMethod || "Cash",
      p_idempotency_key: key
    });

    if (error) {
      throw new Error(`SERVER_PAYMENT_FAILED: ${error.message}`);
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || "Server payment settlement failed.");
    }

    return {
      ...data,
      idempotency_key: key
    };
  }

  // Local/Offline test fallback when no Supabase client is configured
  return {
    success: true,
    status: "PAID",
    payment_id: `pay_${orderId}_${Date.now()}`,
    ledger_id: `led_${orderId}_${Date.now()}`,
    order_id: orderId,
    amount: numAmount,
    payment_method: paymentMethod,
    idempotency_key: key,
    simulated: true
  };
}

/**
 * Execute server-authoritative split payment transaction
 * @param {object} params
 * @param {object} params.supabaseClient
 * @param {string} params.orderId
 * @param {Array<{method: string, amount: number}>} params.splitPayments
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Split transaction result
 */
export async function executeServerSplitPayment({
  supabaseClient = null,
  orderId,
  splitPayments = [],
  idempotencyKey = null,
  isOffline = false
}) {
  const key = idempotencyKey || createTransactionIdempotencyKey("split");

  if (!orderId || !orderId.trim()) {
    throw new Error("INVALID_ORDER_ID: order_id is required for split payment settlement.");
  }

  if (!Array.isArray(splitPayments) || splitPayments.length === 0) {
    throw new Error("INVALID_SPLIT_PAYMENTS: splitPayments array must contain at least one payment entry.");
  }

  if (splitPayments.some(s => isNaN(Number(s.amount)) || Number(s.amount) <= 0)) {
    throw new Error("INVALID_SPLIT_ENTRY: All split payment amounts must be numbers greater than zero.");
  }

  if (isOffline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    throw new Error("OFFLINE_PAYMENT_BLOCKED: Financial transactions cannot be settled while offline. Reconnect to proceed.");
  }

  const results = [];
  let totalSettled = 0;

  for (let i = 0; i < splitPayments.length; i++) {
    const split = splitPayments[i];
    const subKey = `${key}_${split.method || "Cash"}_${i + 1}`;
    const legResult = await executeServerPayment({
      supabaseClient,
      orderId,
      paymentMethod: split.method || "Cash",
      amount: Number(split.amount),
      idempotencyKey: subKey,
      isOffline
    });
    results.push(legResult);
    totalSettled += Number(split.amount);
  }

  return {
    success: true,
    status: "PAID_SPLIT",
    order_id: orderId,
    total_settled: totalSettled,
    splits_count: results.length,
    splits: results,
    idempotency_key: key
  };
}

/**
 * Execute server-authoritative refund transaction
 * @param {object} params
 * @param {object} params.supabaseClient
 * @param {string} params.orderId
 * @param {number} params.refundAmount
 * @param {string} [params.reason='Customer Return']
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Refund result
 */
export async function executeServerRefund({
  supabaseClient = null,
  orderId,
  refundAmount,
  reason = "Customer Return",
  idempotencyKey = null,
  isOffline = false
}) {
  const key = idempotencyKey || createTransactionIdempotencyKey("ref");

  if (!orderId || !orderId.trim()) {
    throw new Error("INVALID_ORDER_ID: order_id is required for refund.");
  }

  const numRefund = Number(refundAmount);
  if (isNaN(numRefund) || numRefund <= 0) {
    throw new Error("INVALID_REFUND_AMOUNT: Refund amount must be a valid number greater than zero.");
  }

  if (isOffline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    throw new Error("OFFLINE_REFUND_BLOCKED: Refunds cannot be processed while offline. Reconnect to proceed.");
  }

  if (supabaseClient && typeof supabaseClient.rpc === "function") {
    const { data, error } = await supabaseClient.rpc("record_server_refund", {
      p_order_id: orderId.trim(),
      p_refund_amount: numRefund,
      p_reason: reason || "Customer Return",
      p_idempotency_key: key
    });

    if (error) {
      throw new Error(`SERVER_REFUND_FAILED: ${error.message}`);
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || "Server refund failed.");
    }

    return {
      ...data,
      idempotency_key: key
    };
  }

  return {
    success: true,
    status: "REFUNDED",
    refund_id: `ref_${orderId}_${Date.now()}`,
    ledger_id: `led_ref_${orderId}_${Date.now()}`,
    order_id: orderId,
    amount: numRefund,
    reason,
    idempotency_key: key,
    simulated: true
  };
}
