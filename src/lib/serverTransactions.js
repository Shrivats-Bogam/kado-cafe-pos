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
 * Safe development auth session diagnostics helper
 * @param {object} supabaseClient 
 * @returns {Promise<{hasSession: boolean, userId: string|null, sessionExpiresAt: number|null}>}
 */
export async function getAuthDiagnostics(supabaseClient = null) {
  if (!supabaseClient || typeof supabaseClient.auth?.getSession !== "function") {
    return { hasSession: false, userId: null, sessionExpiresAt: null };
  }
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
      return { hasSession: false, userId: null, sessionExpiresAt: null };
    }
    return {
      hasSession: true,
      userId: session.user?.id || null,
      sessionExpiresAt: session.expires_at || null,
    };
  } catch {
    return { hasSession: false, userId: null, sessionExpiresAt: null };
  }
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
    // Development auth session check
    if (typeof supabaseClient.auth?.getSession === "function") {
      const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        throw new Error("AUTH_SESSION_MISSING: Authentication session required before executing server financial transactions.");
      }
    }

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

  // Execute B4A RPC for each split if Supabase client available
  if (supabaseClient && typeof supabaseClient.rpc === "function") {
    // Development auth session check
    if (typeof supabaseClient.auth?.getSession === "function") {
      const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        throw new Error("AUTH_SESSION_MISSING: Authentication session required before executing server financial transactions.");
      }
    }

    const results = [];
    let totalSettled = 0;

    for (let i = 0; i < splitPayments.length; i++) {
      const entry = splitPayments[i];
      const entryAmount = Number(entry.amount);
      const splitKey = `${key}_part${i + 1}`;

      const { data, error } = await supabaseClient.rpc("record_server_payment", {
        p_order_id: orderId.trim(),
        p_amount: entryAmount,
        p_payment_method: entry.method || "Cash",
        p_idempotency_key: splitKey
      });

      if (error) {
        throw new Error(`SERVER_SPLIT_PAYMENT_FAILED [${entry.method}]: ${error.message}`);
      }

      if (!data || data.success === false) {
        throw new Error(data?.error || `Split payment failed for ${entry.method}`);
      }

      results.push(data);
      totalSettled += entryAmount;
    }

    return {
      success: true,
      status: "PAID_SPLIT",
      order_id: orderId,
      total_settled: totalSettled,
      total_amount: totalSettled,
      splits: results,
      ledger_id: results[0]?.ledger_id || null,
      payment_id: results[0]?.payment_id || null,
      idempotency_key: key
    };
  }

  // Local/Offline fallback
  const simulatedTotal = splitPayments.reduce((s, p) => s + Number(p.amount), 0);
  return {
    success: true,
    status: "PAID_SPLIT",
    order_id: orderId,
    total_settled: simulatedTotal,
    total_amount: simulatedTotal,
    splits: splitPayments.map((p, i) => ({
      payment_id: `pay_split_${orderId}_${i + 1}`,
      ledger_id: `led_split_${orderId}_${i + 1}`,
      amount: Number(p.amount),
      method: p.method
    })),
    ledger_id: `led_split_${orderId}_1`,
    idempotency_key: key,
    simulated: true
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
    // Development auth session check
    if (typeof supabaseClient.auth?.getSession === "function") {
      const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        throw new Error("AUTH_SESSION_MISSING: Authentication session required before executing server financial transactions.");
      }
    }

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
