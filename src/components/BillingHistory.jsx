import { useState, useMemo } from "react";
import { Search, Receipt, Calendar, CreditCard, Banknote, QrCode, AlertCircle, Eye, RefreshCw, XCircle, RotateCcw, X, ShieldAlert } from "lucide-react";
import { Card, PrimaryButton, IconButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function BillingHistory({ 
  orderHistory = [], 
  refunds = [],
  currentUser = null,
  onSelectBill, 
  onUpdateBillStatus,
  onProcessRefund 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Paid, Pending, Cancelled, Refunded
  
  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState(null); // { bill, refundableAmount }
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundReasonInput, setRefundReasonInput] = useState("Customer Return");
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");

  // Calculate Daily Revenue Summary stats (PART 18)
  const dailySummary = useMemo(() => {
    let totalRev = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let pendingTotal = 0;
    let discountTotal = 0;
    let cancelledTotal = 0;
    let refundedTotal = 0;

    orderHistory.forEach((bill) => {
      const amt = bill.grandTotal || 0;
      discountTotal += bill.discount || 0;

      if (bill.status === "Cancelled") {
        cancelledTotal += amt;
        return;
      }
      if (bill.status === "Refunded") {
        refundedTotal += amt;
        return;
      }
      if (bill.status === "Pending") {
        pendingTotal += amt;
        return;
      }

      // Paid Revenue
      totalRev += amt;

      const pm = (bill.paymentMode || bill.paymentMethod || "").toLowerCase();
      if (pm.includes("cash")) cashTotal += amt;
      else if (pm.includes("upi") || pm.includes("qr")) upiTotal += amt;
      else if (pm.includes("card")) cardTotal += amt;
      else cashTotal += amt; // Fallback default
    });

    return {
      totalRev,
      cashTotal,
      upiTotal,
      cardTotal,
      pendingTotal,
      discountTotal,
      cancelledTotal,
      refundedTotal
    };
  }, [orderHistory]);

  // Filter & Search Orders
  const filteredHistory = useMemo(() => {
    return orderHistory.filter((bill) => {
      // Status Filter
      if (statusFilter !== "All" && (bill.status || "Paid") !== statusFilter) {
        return false;
      }

      // Multi-Field Search (Bill #, Customer, Phone, Source/Table, Date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(bill.id || "").toLowerCase().includes(q);
        const matchCust = String(bill.customerName || "").toLowerCase().includes(q);
        const matchPhone = String(bill.phone || "").toLowerCase().includes(q);
        const matchSource = String(bill.source || "").toLowerCase().includes(q);
        const matchDate = String(bill.paidAt || bill.createdAt || "").toLowerCase().includes(q);
        return matchId || matchCust || matchPhone || matchSource || matchDate;
      }

      return true;
    }).sort((a, b) => new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0));
  }, [orderHistory, statusFilter, searchQuery]);

  // Open Refund Modal for a Bill
  const handleOpenRefundModal = (bill) => {
    const originalPaid = Number(bill.grandTotal || bill.total || 0);
    const existingRefunds = (refunds || []).filter(r => r.orderId === bill.id);
    const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0) + Number(bill.refundedAmount || 0);
    const remaining = Math.max(0, originalPaid - alreadyRefunded);

    setRefundTarget({ bill, originalPaid, alreadyRefunded, refundableAmount: remaining });
    setRefundAmountInput(String(remaining));
    setRefundReasonInput("Customer Return");
    setRefundError("");
  };

  // Submit Server Refund
  const handleConfirmRefund = async () => {
    if (!refundTarget || isRefunding) return;

    const amt = parseFloat(refundAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setRefundError("Please enter a valid refund amount greater than ₹0.");
      return;
    }

    if (amt > refundTarget.refundableAmount) {
      setRefundError(`Refund amount cannot exceed remaining balance of ${currency(refundTarget.refundableAmount)}.`);
      return;
    }

    if (!refundReasonInput.trim()) {
      setRefundError("Please enter a reason for the refund.");
      return;
    }

    setIsRefunding(true);
    setRefundError("");

    try {
      if (onProcessRefund) {
        await onProcessRefund({
          orderId: refundTarget.bill.id,
          refundAmount: amt,
          reason: refundReasonInput.trim()
        });
      }
      setRefundTarget(null);
    } catch (err) {
      console.error("[BillingHistory] Refund error:", err);
      setRefundError(err.message || "Server refund failed. Order remains un-refunded.");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Revenue Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Revenue</span>
          <span className="text-lg font-bold text-amber-400 font-serif">{currency(dailySummary.totalRev)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
            <DollarSign size={12} /> Cash
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.cashTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1 uppercase tracking-wider">
            <QrCode size={12} /> UPI
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.upiTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1 uppercase tracking-wider">
            <CreditCard size={12} /> Card
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.cardTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
            <Receipt size={12} /> Pending
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.pendingTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 uppercase tracking-wider">
            <XCircle size={12} /> Cancelled
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.cancelledTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-pink-400 flex items-center gap-1 uppercase tracking-wider">
            <RotateCcw size={12} /> Refunded
          </span>
          <span className="text-sm font-bold text-stone-200 font-mono">{currency(dailySummary.refundedTotal)}</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bill #, table, customer..."
            className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {["All", "Paid", "Partially Refunded", "Pending", "Cancelled", "Refunded"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Grid */}
      {filteredHistory.length === 0 ? (
        <Card className="p-12 text-center text-stone-500 bg-stone-900/50 border-stone-800 flex flex-col items-center gap-2">
          <Receipt size={36} className="opacity-30" />
          <p className="text-sm font-semibold">No bills found</p>
          <p className="text-xs text-stone-600">Try adjusting your search query or filter criteria</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredHistory.map((bill) => {
            const st = bill.status || "Paid";
            return (
              <Card key={bill.id} className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-3 hover:border-stone-700 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400 block">#{bill.id}</span>
                    <span className="text-[11px] text-stone-400">
                      {bill.paidAt ? new Date(bill.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(bill.createdAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    st === "Paid" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    st === "Partially Refunded" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                    st === "Pending" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    st === "Refunded" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" :
                    "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}>
                    {st}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-stone-300 border-y border-stone-800/60 py-2 my-1">
                  <span>{bill.source || "POS"} · {bill.customerName || "Walk-in"}</span>
                  <span className="font-mono font-bold text-stone-100">{currency(bill.grandTotal || 0)}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-stone-400 font-medium">{bill.paymentMode || bill.paymentMethod || "Cash"}</span>

                  <div className="flex gap-1.5">
                    {st === "Pending" && onUpdateBillStatus && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateBillStatus(bill.id, "Paid")}
                          data-testid={`pay-pending-${bill.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Mark Pending Bill as Paid"
                        >
                          <RefreshCw size={12} /> Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBillStatus(bill.id, "Cancelled")}
                          data-testid={`cancel-pending-${bill.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Cancel Pending Bill"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      </>
                    )}

                    {(st === "Paid" || st === "Partially Refunded") && onProcessRefund && (
                      <button
                        type="button"
                        onClick={() => handleOpenRefundModal(bill)}
                        data-testid={`refund-bill-${bill.id}`}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Process Server Refund"
                      >
                        <RotateCcw size={12} /> Refund
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectBill(bill)}
                      data-testid={`view-bill-${bill.id}`}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye size={14} /> View
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Server Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-stone-900 border-stone-800 shadow-2xl rounded-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
                  <RotateCcw size={18} className="text-purple-400" /> Process Server Refund
                </h3>
                <p className="text-xs text-stone-400">Order #{refundTarget.bill.id} · {refundTarget.bill.customerName || "Walk-in"}</p>
              </div>
              <IconButton onClick={() => setRefundTarget(null)} aria-label="Close refund modal">
                <X size={16} />
              </IconButton>
            </div>

            {/* Error Banner */}
            {refundError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            {/* Balance Details */}
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Original Bill Total</span>
                <span className="font-mono text-stone-200">{currency(refundTarget.originalPaid)}</span>
              </div>
              {refundTarget.alreadyRefunded > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Already Refunded</span>
                  <span className="font-mono">-{currency(refundTarget.alreadyRefunded)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400 font-bold border-t border-stone-800 pt-1.5">
                <span>Maximum Refundable</span>
                <span className="font-mono">{currency(refundTarget.refundableAmount)}</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  data-testid="refund-amount-input"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  placeholder={`Max ${refundTarget.refundableAmount}`}
                  max={refundTarget.refundableAmount}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Reason for Refund</label>
                <input
                  type="text"
                  data-testid="refund-reason-input"
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="e.g. Customer returned item, Billing error"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="py-2.5 rounded-xl border border-stone-700 text-stone-300 text-xs font-bold hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleConfirmRefund}
                disabled={isRefunding || Number(refundAmountInput) <= 0 || Number(refundAmountInput) > refundTarget.refundableAmount}
                data-testid="confirm-refund-btn"
                className="py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isRefunding ? (
                  <RefreshCw size={14} className="animate-spin mx-auto" />
                ) : (
                  `Confirm Refund (${currency(parseFloat(refundAmountInput) || 0)})`
                )}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
