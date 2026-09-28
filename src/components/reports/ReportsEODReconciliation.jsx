import { useState, useMemo } from "react";
import { DollarSign, Landmark, ArrowDownLeft, ArrowUpRight, Scale, CheckCircle2, AlertTriangle, Printer, Download } from "lucide-react";
import { Card, Pill, PrimaryButton, SecondaryButton, TextInput } from "../ui.jsx";
import { calculateEODReconciliation, generateDoubleEntryForPayment } from "../../lib/ledgerDoubleEntry.js";

export function ReportsEODReconciliation({ orderHistory = [], refunds = [] }) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [openingFloat, setOpeningFloat] = useState(2000);
  const [countedCash, setCountedCash] = useState("");
  const [showJournalEntries, setShowJournalEntries] = useState(false);

  const eodReport = useMemo(() => {
    return calculateEODReconciliation({
      orderHistory,
      refunds,
      openingCash: Number(openingFloat) || 0,
      physicalCashCount: countedCash !== "" ? Number(countedCash) : null,
      filterDate: selectedDate
    });
  }, [orderHistory, refunds, openingFloat, countedCash, selectedDate]);

  // Sample double entry journal previews for the selected day's orders
  const sampleEntries = useMemo(() => {
    const dayOrders = orderHistory.filter(o => {
      const dt = o.paidAt || o.createdAt || "";
      return dt.startsWith(selectedDate) && (o.status === "Paid" || o.status === "refunded");
    }).slice(0, 5);

    return dayOrders.map(o => generateDoubleEntryForPayment({
      orderId: o.id,
      amount: o.grandTotal || o.total || 0,
      paymentMethod: o.paymentMode || o.paymentMethod || "Cash",
      gstRate: 5,
      taxExclusive: false
    }));
  }, [orderHistory, selectedDate]);

  const { cashReconciliation, breakdown } = eodReport;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls */}
      <Card className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2">
            <Scale size={20} className="text-amber-500" />
            End-of-Day (EOD) Register Reconciliation & Double-Entry Ledger
          </h3>
          <p className="text-xs text-stone-400">
            Reconcile physical cash till against recorded digital payments and generate balanced accounting journal entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-[40px] rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
          <SecondaryButton onClick={() => window.print()} className="min-h-[40px]">
            <Printer size={15} /> Print Report
          </SecondaryButton>
        </div>
      </Card>

      {/* Inputs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-400">Opening Till Float (₹)</label>
          <TextInput
            type="number"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="e.g. 2000"
          />
          <span className="text-[10px] text-stone-500">Initial cash placed in register at start of day.</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-400">Physical Cash Counted at Close (₹)</label>
          <TextInput
            type="number"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            placeholder="e.g. 15420"
          />
          <span className="text-[10px] text-stone-500">Total physical bills & coins in the drawer right now.</span>
        </Card>

        <Card className="p-4 flex flex-col justify-center items-center text-center gap-1">
          <span className="text-xs text-stone-400 font-semibold">Cash Till Status</span>
          {cashReconciliation.varianceStatus === "NOT_COUNTED" && (
            <Pill tone="stone">Awaiting Drawer Count</Pill>
          )}
          {cashReconciliation.varianceStatus === "EXACT" && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={16} /> Till Balanced (Exact Match)
            </div>
          )}
          {cashReconciliation.varianceStatus === "OVER" && (
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-sm">
              <AlertTriangle size={16} /> Cash Over: +₹{cashReconciliation.cashVariance}
            </div>
          )}
          {cashReconciliation.varianceStatus === "SHORT" && (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
              <AlertTriangle size={16} /> Cash Short: ₹{cashReconciliation.cashVariance}
            </div>
          )}
          <span className="text-[11px] text-stone-500 mt-1">
            Expected: ₹{cashReconciliation.expectedInDrawer.toLocaleString("en-IN")}
          </span>
        </Card>
      </div>

      {/* Key Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-stone-400">Gross Day Revenue</span>
          <strong className="text-lg font-bold text-stone-100 font-mono">
            ₹{eodReport.grossSales.toLocaleString("en-IN")}
          </strong>
          <span className="text-[10px] text-stone-500">{eodReport.totalTransactionsCount} Orders Settled</span>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-emerald-400">Cash Collections</span>
          <strong className="text-lg font-bold text-emerald-400 font-mono">
            ₹{breakdown.cashSales.toLocaleString("en-IN")}
          </strong>
          <span className="text-[10px] text-stone-500">Refunds: ₹{breakdown.cashRefunds}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-purple-400">UPI / QR Collections</span>
          <strong className="text-lg font-bold text-purple-400 font-mono">
            ₹{breakdown.upiSales.toLocaleString("en-IN")}
          </strong>
          <span className="text-[10px] text-stone-500">Direct Account Settlement</span>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-sky-400">Card POS Collections</span>
          <strong className="text-lg font-bold text-sky-400 font-mono">
            ₹{breakdown.cardSales.toLocaleString("en-IN")}
          </strong>
          <span className="text-[10px] text-stone-500">Bank Terminal Clearing</span>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Equation */}
      <Card className="p-4 flex flex-col gap-3">
        <h4 className="font-serif text-sm font-bold text-stone-200">
          Cash Drawer Balancing Equation (EOD Register Audit)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col">
            <span className="text-stone-500 text-[10px] uppercase font-bold">1. Opening Float</span>
            <strong className="text-stone-200 text-sm font-mono mt-1">₹{cashReconciliation.openingFloat}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col">
            <span className="text-emerald-500 text-[10px] uppercase font-bold">+ 2. Cash Inflow</span>
            <strong className="text-emerald-400 text-sm font-mono mt-1">₹{cashReconciliation.cashCollected}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col">
            <span className="text-rose-500 text-[10px] uppercase font-bold">- 3. Cash Refunds</span>
            <strong className="text-rose-400 text-sm font-mono mt-1">₹{cashReconciliation.cashRefundedOut}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-500/30 flex flex-col">
            <span className="text-amber-500 text-[10px] uppercase font-bold">= 4. Expected Drawer</span>
            <strong className="text-amber-400 text-sm font-mono mt-1">₹{cashReconciliation.expectedInDrawer}</strong>
          </div>
          <div className={`p-2.5 rounded-xl bg-stone-950 border flex flex-col ${
            cashReconciliation.varianceStatus === "EXACT" ? "border-emerald-500/30 text-emerald-400" :
            cashReconciliation.varianceStatus === "SHORT" ? "border-rose-500/30 text-rose-400" : "border-stone-800 text-stone-200"
          }`}>
            <span className="text-[10px] uppercase font-bold">5. Counted Variance</span>
            <strong className="text-sm font-mono mt-1">
              {cashReconciliation.physicalCashCount !== null
                ? `${cashReconciliation.cashVariance >= 0 ? "+" : ""}₹${cashReconciliation.cashVariance}`
                : "Not Counted"}
            </strong>
          </div>
        </div>
      </Card>

      {/* Double-Entry General Ledger Journal Preview */}
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-serif text-sm font-bold text-stone-200 flex items-center gap-1.5">
              <Landmark size={16} className="text-amber-500" />
              Double-Entry General Ledger Journal Entries
            </h4>
            <p className="text-[11px] text-stone-400">
              Balanced accounting entries generated for customer sales: Asset (Debit) = Revenue + Tax Payable (Credit).
            </p>
          </div>
          <button
            onClick={() => setShowJournalEntries(!showJournalEntries)}
            className="text-xs text-amber-500 font-semibold hover:underline cursor-pointer"
          >
            {showJournalEntries ? "Hide Entries" : "View Journal Entries"}
          </button>
        </div>

        {showJournalEntries && (
          <div className="overflow-x-auto no-scrollbar pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 text-[11px]">
                  <th className="py-2 px-2">Account Code & Name</th>
                  <th className="py-2 px-2">Transaction Description</th>
                  <th className="py-2 px-2 text-right">Debit (₹)</th>
                  <th className="py-2 px-2 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {sampleEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-stone-500 text-xs">
                      No transactions recorded for this date.
                    </td>
                  </tr>
                ) : (
                  sampleEntries.map((tx) => (
                    tx.entries.map((entry, idx) => (
                      <tr key={`${tx.transactionId}_${idx}`} className="border-b border-stone-800/40 hover:bg-stone-800/10">
                        <td className="py-2 px-2 font-mono text-stone-300">
                          <span className="text-amber-500 font-bold">{entry.accountCode}</span> - {entry.accountName}
                        </td>
                        <td className="py-2 px-2 text-stone-400">{entry.description}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-purple-400">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
