import { useState, useMemo } from "react";
import { Search, DollarSign, CreditCard, QrCode, AlertCircle, RefreshCw, XCircle, Eye, Receipt } from "lucide-react";
import { Card } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function BillingHistory({ orderHistory = [], onSelectBill, onUpdateBillStatus }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Paid, Pending, Cancelled, Refunded

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

  // Filter & Search Orders (PART 17)
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

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Revenue Summary Metrics Cards (PART 18) */}
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
            <AlertCircle size={12} /> Pending
          </span>
          <span className="text-sm font-bold text-amber-300 font-mono">{currency(dailySummary.pendingTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 uppercase tracking-wider">
            Discounts
          </span>
          <span className="text-sm font-bold text-stone-300 font-mono">-{currency(dailySummary.discountTotal)}</span>
        </Card>

        <Card className="p-3 bg-stone-900 border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Cancelled
          </span>
          <span className="text-sm font-bold text-stone-400 font-mono">{currency(dailySummary.cancelledTotal)}</span>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill #, Customer, Table, Phone, or Date..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {["All", "Paid", "Pending", "Cancelled", "Refunded"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition min-h-[44px] cursor-pointer ${
                statusFilter === st
                  ? "bg-amber-500 text-stone-950 shadow-md"
                  : "bg-stone-950 border border-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bill History Grid */}
      {filteredHistory.length === 0 ? (
        /* Purposeful Empty State (PART 23) */
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/60 border border-stone-800 rounded-3xl text-center select-none pointer-events-none my-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
            <Receipt size={32} />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-200 mb-1">No Bills Found</h3>
          <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
            Completed, pending, or historical transactions will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredHistory.map((bill) => {
            const st = bill.status || "Paid";
            return (
              <Card key={bill.id} className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-3 shadow-sm hover:border-stone-700 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400">{bill.id}</span>
                    <span className="text-[11px] text-stone-400 block mt-0.5 font-mono">
                      {new Date(bill.paidAt || bill.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    st === "Paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                    st === "Pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                    st === "Cancelled" ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
                    "bg-purple-500/15 text-purple-400 border-purple-500/30"
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
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Mark Pending Bill as Paid"
                        >
                          <RefreshCw size={12} /> Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBillStatus(bill.id, "Cancelled")}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Cancel Pending Bill"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectBill(bill)}
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
    </div>
  );
}
