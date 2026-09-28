// src/lib/ledgerDoubleEntry.js
// Double-Entry Bookkeeping Ledger Engine & End-of-Day (EOD) Reconciliation for Kado Cafe POS.
// Conforms to standard accounting principles: Total Debits == Total Credits for all transactions.

export const CHART_OF_ACCOUNTS = {
  // ASSETS (1000 - 1999) - Normal balance: DEBIT
  CASH_DRAWER: { code: "1010", name: "Cash in Till / Register", type: "ASSET" },
  UPI_RECEIVABLES: { code: "1020", name: "UPI / Digital Wallet Clearing", type: "ASSET" },
  CARD_CLEARING: { code: "1030", name: "Card Terminal / Bank Clearing", type: "ASSET" },
  OTHER_CLEARING: { code: "1090", name: "Miscellaneous Payment Clearing", type: "ASSET" },

  // LIABILITIES (2000 - 2999) - Normal balance: CREDIT
  GST_PAYABLE: { code: "2010", name: "GST Output Tax Payable (CGST/SGST)", type: "LIABILITY" },

  // REVENUE (4000 - 4999) - Normal balance: CREDIT
  SALES_REVENUE: { code: "4010", name: "Food & Beverage Sales Revenue", type: "REVENUE" },
  DELIVERY_CHARGES: { code: "4020", name: "Delivery & Packaging Charges", type: "REVENUE" },

  // CONTRA-REVENUE / EXPENSES (5000 - 5999) - Normal balance: DEBIT
  SALES_RETURNS: { code: "5010", name: "Customer Refunds & Returns", type: "CONTRA_REVENUE" },
  DISCOUNTS_GIVEN: { code: "5020", name: "Promotional Discounts & Loyalty", type: "CONTRA_REVENUE" },
};

/**
 * Resolves the appropriate Asset account based on the payment method.
 * @param {string} method Payment method (Cash, UPI, Card, etc.)
 * @returns {object} Account definition
 */
export function getAssetAccountForMethod(method = "Cash") {
  const norm = String(method || "").toLowerCase().trim();
  if (norm.includes("cash")) return CHART_OF_ACCOUNTS.CASH_DRAWER;
  if (norm.includes("upi") || norm.includes("gpay") || norm.includes("phonepe") || norm.includes("paytm") || norm.includes("qr")) {
    return CHART_OF_ACCOUNTS.UPI_RECEIVABLES;
  }
  if (norm.includes("card") || norm.includes("pos") || norm.includes("debit") || norm.includes("credit")) {
    return CHART_OF_ACCOUNTS.CARD_CLEARING;
  }
  return CHART_OF_ACCOUNTS.OTHER_CLEARING;
}

/**
 * Generates balanced Double-Entry journal entries for a customer payment transaction.
 *
 * Accounting Equation:
 *   DEBIT:  Asset Account (Cash / UPI / Card) = Total Collected
 *   CREDIT: F&B Sales Revenue = Net Sales (Tax-exclusive)
 *   CREDIT: GST Output Tax Payable = Tax component
 *
 * @param {object} params
 * @param {string} params.orderId Order ID
 * @param {number} params.amount Total paid amount (gross)
 * @param {string} [params.paymentMethod='Cash'] Payment method
 * @param {number} [params.gstRate=5] GST percentage rate
 * @param {boolean} [params.taxExclusive=false] Whether tax is added on top
 * @returns {object} Balanced double-entry transaction record
 */
export function generateDoubleEntryForPayment({
  orderId,
  amount,
  paymentMethod = "Cash",
  gstRate = 5,
  taxExclusive = false,
  timestamp = null
}) {
  const total = Math.round(Number(amount) * 100) / 100;
  if (isNaN(total) || total <= 0) {
    throw new Error("INVALID_PAYMENT_AMOUNT: Amount must be greater than zero.");
  }

  const assetAccount = getAssetAccountForMethod(paymentMethod);
  const rate = Number(gstRate) || 0;

  let netRevenue = total;
  let taxAmount = 0;

  if (rate > 0) {
    if (taxExclusive) {
      taxAmount = Math.round((total * (rate / 100)) * 100) / 100;
      netRevenue = total;
    } else {
      // Tax-inclusive pricing (Indian restaurant standard)
      const base = total / (1 + rate / 100);
      netRevenue = Math.round(base * 100) / 100;
      taxAmount = Math.round((total - netRevenue) * 100) / 100;
    }
  }

  const entries = [
    {
      accountCode: assetAccount.code,
      accountName: assetAccount.name,
      debit: total,
      credit: 0,
      description: `Payment received for Order #${orderId} via ${paymentMethod}`
    },
    {
      accountCode: CHART_OF_ACCOUNTS.SALES_REVENUE.code,
      accountName: CHART_OF_ACCOUNTS.SALES_REVENUE.name,
      debit: 0,
      credit: netRevenue,
      description: `Net F&B sales revenue from Order #${orderId}`
    }
  ];

  if (taxAmount > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.GST_PAYABLE.code,
      accountName: CHART_OF_ACCOUNTS.GST_PAYABLE.name,
      debit: 0,
      credit: taxAmount,
      description: `Output GST (${rate}%) collected on Order #${orderId}`
    });
  }

  const totalDebits = Math.round(entries.reduce((s, e) => s + e.debit, 0) * 100) / 100;
  const totalCredits = Math.round(entries.reduce((s, e) => s + e.credit, 0) * 100) / 100;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return {
    transactionId: `tx_de_${orderId}_${Date.now()}`,
    orderId,
    type: "SALE_PAYMENT",
    paymentMethod,
    totalAmount: total,
    netRevenue,
    taxAmount,
    totalDebits,
    totalCredits,
    isBalanced,
    timestamp: timestamp || new Date().toISOString(),
    entries
  };
}

/**
 * Generates balanced Double-Entry journal entries for a refund transaction.
 *
 * Accounting Equation:
 *   DEBIT:  Sales Returns & Refunds = Net Refund Amount
 *   DEBIT:  GST Output Tax Payable = Tax Reversal
 *   CREDIT: Asset Account (Cash / UPI / Card) = Total Refund Paid Out
 *
 * @param {object} params
 * @param {string} params.orderId Order ID
 * @param {number} params.refundAmount Total refund amount
 * @param {string} [params.paymentMethod='Cash'] Refund method
 * @param {number} [params.gstRate=5] GST percentage rate
 * @returns {object} Balanced double-entry refund transaction record
 */
export function generateDoubleEntryForRefund({
  orderId,
  refundAmount,
  paymentMethod = "Cash",
  gstRate = 5,
  reason = "Customer Return",
  timestamp = null
}) {
  const total = Math.round(Number(refundAmount) * 100) / 100;
  if (isNaN(total) || total <= 0) {
    throw new Error("INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.");
  }

  const assetAccount = getAssetAccountForMethod(paymentMethod);
  const rate = Number(gstRate) || 0;

  let netRefund = total;
  let taxReversal = 0;

  if (rate > 0) {
    const base = total / (1 + rate / 100);
    netRefund = Math.round(base * 100) / 100;
    taxReversal = Math.round((total - netRefund) * 100) / 100;
  }

  const entries = [
    {
      accountCode: CHART_OF_ACCOUNTS.SALES_RETURNS.code,
      accountName: CHART_OF_ACCOUNTS.SALES_RETURNS.name,
      debit: netRefund,
      credit: 0,
      description: `Sales return on Order #${orderId}: ${reason}`
    }
  ];

  if (taxReversal > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.GST_PAYABLE.code,
      accountName: CHART_OF_ACCOUNTS.GST_PAYABLE.name,
      debit: taxReversal,
      credit: 0,
      description: `GST Output Tax reversal on Order #${orderId}`
    });
  }

  entries.push({
    accountCode: assetAccount.code,
    accountName: assetAccount.name,
    debit: 0,
    credit: total,
    description: `Refund paid out from ${assetAccount.name} for Order #${orderId}`
  });

  const totalDebits = Math.round(entries.reduce((s, e) => s + e.debit, 0) * 100) / 100;
  const totalCredits = Math.round(entries.reduce((s, e) => s + e.credit, 0) * 100) / 100;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return {
    transactionId: `tx_ref_de_${orderId}_${Date.now()}`,
    orderId,
    type: "REFUND",
    paymentMethod,
    totalAmount: total,
    netRefund,
    taxReversal,
    totalDebits,
    totalCredits,
    isBalanced,
    timestamp: timestamp || new Date().toISOString(),
    entries
  };
}

/**
 * Calculates complete End-of-Day (EOD) register closeout and reconciliation.
 *
 * @param {object} params
 * @param {Array} params.orderHistory Array of orders
 * @param {Array} [params.refunds=[]] Array of refunds
 * @param {number} [params.openingCash=0] Initial cash float in drawer
 * @param {number|null} [params.physicalCashCount=null] Actual counted cash in register
 * @param {string} [params.filterDate=null] Optional YYYY-MM-DD date filter
 * @returns {object} Complete EOD reconciliation report
 */
export function calculateEODReconciliation({
  orderHistory = [],
  refunds = [],
  openingCash = 0,
  physicalCashCount = null,
  filterDate = null
}) {
  const opening = Number(openingCash) || 0;

  // Filter orders by date if specified
  let relevantOrders = orderHistory.filter(o => o.status === "Paid" || o.status === "refunded");
  let relevantRefunds = refunds || [];

  if (filterDate) {
    relevantOrders = relevantOrders.filter(o => {
      const dt = o.paidAt || o.createdAt || "";
      return dt.startsWith(filterDate);
    });
    relevantRefunds = relevantRefunds.filter(r => {
      const dt = r.createdAt || r.timestamp || "";
      return dt.startsWith(filterDate);
    });
  }

  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;
  let otherSales = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;

  relevantOrders.forEach(o => {
    const total = Number(o.grandTotal || o.total || 0);
    const mode = String(o.paymentMode || o.paymentMethod || "Cash").toLowerCase();
    totalDiscounts += Number(o.discount || 0);
    totalTaxes += Number(o.gst || o.tax || 0);

    if (mode.includes("cash")) {
      cashSales += total;
    } else if (mode.includes("upi") || mode.includes("qr") || mode.includes("gpay") || mode.includes("phonepe")) {
      upiSales += total;
    } else if (mode.includes("card") || mode.includes("pos") || mode.includes("debit") || mode.includes("credit")) {
      cardSales += total;
    } else {
      otherSales += total;
    }
  });

  let cashRefunds = 0;
  let digitalRefunds = 0;

  relevantRefunds.forEach(r => {
    const amt = Number(r.amount || r.refundAmount || 0);
    const mode = String(r.paymentMethod || r.mode || "Cash").toLowerCase();
    if (mode.includes("cash")) {
      cashRefunds += amt;
    } else {
      digitalRefunds += amt;
    }
  });

  const grossSales = Math.round((cashSales + upiSales + cardSales + otherSales) * 100) / 100;
  const totalRefunds = Math.round((cashRefunds + digitalRefunds) * 100) / 100;
  const netSales = Math.round((grossSales - totalRefunds) * 100) / 100;

  const netCashCollected = Math.round((cashSales - cashRefunds) * 100) / 100;
  const expectedDrawerCash = Math.round((opening + netCashCollected) * 100) / 100;

  let cashVariance = 0;
  let varianceStatus = "NOT_COUNTED"; // "EXACT" | "OVER" | "SHORT" | "NOT_COUNTED"

  if (physicalCashCount !== null && !isNaN(Number(physicalCashCount))) {
    const actual = Number(physicalCashCount);
    cashVariance = Math.round((actual - expectedDrawerCash) * 100) / 100;
    if (Math.abs(cashVariance) < 0.01) varianceStatus = "EXACT";
    else if (cashVariance > 0) varianceStatus = "OVER";
    else varianceStatus = "SHORT";
  }

  return {
    openingCash: opening,
    grossSales,
    totalRefunds,
    netSales,
    breakdown: {
      cashSales: Math.round(cashSales * 100) / 100,
      upiSales: Math.round(upiSales * 100) / 100,
      cardSales: Math.round(cardSales * 100) / 100,
      otherSales: Math.round(otherSales * 100) / 100,
      cashRefunds: Math.round(cashRefunds * 100) / 100,
      digitalRefunds: Math.round(digitalRefunds * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
    },
    cashReconciliation: {
      openingFloat: opening,
      cashCollected: Math.round(cashSales * 100) / 100,
      cashRefundedOut: Math.round(cashRefunds * 100) / 100,
      netCashInflow: netCashCollected,
      expectedInDrawer: expectedDrawerCash,
      physicalCashCount: physicalCashCount !== null ? Number(physicalCashCount) : null,
      cashVariance,
      varianceStatus
    },
    totalTransactionsCount: relevantOrders.length,
    totalRefundsCount: relevantRefunds.length,
    generatedAt: new Date().toISOString()
  };
}
