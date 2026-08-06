import { useState } from "react";
import { Printer, Copy, Share2, Check, X } from "lucide-react";
import { Card, IconButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function InvoicePreview({ bill, onClose }) {
  const [printWidth, setPrintWidth] = useState("80mm");
  const [copied, setCopied] = useState(false);

  if (!bill) return null;

  const invoiceNo = bill.id || bill.billNo || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = bill.paidAt || bill.createdAt || new Date().toLocaleString();

  // Generate plain text receipt format for clipboard & WhatsApp
  const generateFormattedText = () => {
    let text = `☕ *KADO CAFE RECEIPT*\n`;
    text += `Bill #: ${invoiceNo}\n`;
    text += `Date: ${new Date(dateStr).toLocaleString()}\n`;
    text += `Source: ${bill.source || "POS"}\n`;
    if (bill.customerName) text += `Customer: ${bill.customerName}\n`;
    text += `--------------------------------\n`;

    (bill.items || []).forEach((item) => {
      text += `${item.name || item.menuItemId} x${item.qty} - ₹${(item.price || 0) * item.qty}\n`;
      if (item.notes) text += `  Note: ${item.notes}\n`;
    });

    text += `--------------------------------\n`;
    text += `Subtotal: ₹${bill.subtotal || 0}\n`;
    if (bill.discount > 0) text += `Discount: -₹${bill.discount}\n`;
    if (bill.gst > 0) text += `GST (5%): ₹${bill.gst}\n`;
    if (bill.roundOff) text += `Round Off: ₹${bill.roundOff}\n`;
    text += `*GRAND TOTAL: ₹${bill.grandTotal || 0}*\n`;
    text += `Payment: ${bill.paymentMode || bill.paymentMethod || "Paid"}\n`;
    text += `Status: ${bill.status || "Paid"}\n`;
    text += `--------------------------------\n`;
    text += `Thank you for visiting Kado Cafe! 🙏`;
    return text;
  };

  const handleCopy = () => {
    const text = generateFormattedText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = generateFormattedText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5 flex flex-col gap-4 bg-stone-900 border border-stone-800 no-print my-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg text-stone-50 font-bold">Invoice Preview</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                bill.status === "Paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                bill.status === "Pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                bill.status === "Cancelled" ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
                bill.status === "Refunded" ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
                "bg-stone-800 text-stone-300 border-stone-700"
              }`}>
                {bill.status || "Paid"}
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">{invoiceNo} · {new Date(dateStr).toLocaleString()}</p>
          </div>
          {onClose && (
            <IconButton onClick={onClose}>
              <X size={18} />
            </IconButton>
          )}
        </div>

        {/* Invoice Meta */}
        <div className="text-xs text-stone-300 flex justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <div>
            <span className="text-stone-500 block">Source</span>
            <span className="font-medium">{bill.source || "POS Order"}</span>
          </div>
          {bill.customerName && (
            <div className="text-right">
              <span className="text-stone-500 block">Customer</span>
              <span className="font-medium text-amber-400">{bill.customerName}</span>
            </div>
          )}
        </div>

        {/* Item List */}
        <div className="flex flex-col gap-2 text-xs border-y border-stone-800 py-3 max-h-48 overflow-y-auto">
          {(bill.items || []).map((it, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex justify-between text-stone-200 font-medium">
                <span>{it.name || it.menuItemId || "Item"} ×{it.qty}</span>
                <span>{currency((it.price || 0) * it.qty)}</span>
              </div>
              {it.notes && (
                <span className="text-[11px] text-amber-400/90 italic pl-3">Note: {it.notes}</span>
              )}
            </div>
          ))}
        </div>

        {/* Summary Breakdown */}
        <div className="flex flex-col gap-1.5 text-xs text-stone-300 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
          <div className="flex justify-between text-stone-400">
            <span>Subtotal</span>
            <span>{currency(bill.subtotal || 0)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-rose-400 font-medium">
              <span>Discount {bill.discountReason ? `(${bill.discountReason})` : ""}</span>
              <span>-{currency(bill.discount)}</span>
            </div>
          )}
          {bill.gst > 0 && (
            <div className="flex justify-between text-stone-400">
              <span>GST (5%)</span>
              <span>{currency(bill.gst)}</span>
            </div>
          )}
          {bill.roundOff !== 0 && bill.roundOff !== undefined && (
            <div className="flex justify-between text-stone-500">
              <span>Round Off</span>
              <span>{bill.roundOff > 0 ? `+${currency(bill.roundOff)}` : currency(bill.roundOff)}</span>
            </div>
          )}
          {bill.pointsRedeemed > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Points Redeemed</span>
              <span>-{currency(bill.pointsRedeemed)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-stone-50 pt-2 border-t border-stone-800">
            <span>Grand Total</span>
            <span className="text-amber-400">{currency(bill.grandTotal || 0)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-stone-400 pt-1">
            <span>Payment Method</span>
            <span className="font-semibold text-stone-200">{bill.paymentMode || bill.paymentMethod || "Cash"}</span>
          </div>
        </div>

        {/* Thermal Print Width Toggle */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
          <span>Thermal Printer Width</span>
          <div className="flex gap-1">
            {["58mm", "80mm"].map((w) => (
              <button
                key={w}
                onClick={() => setPrintWidth(w)}
                className={`rounded-lg px-2.5 py-1 font-medium transition text-[11px] ${
                  printWidth === w ? "bg-amber-500 text-stone-950 font-bold" : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => window.print()}
            className="min-h-[48px] rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label="Print receipt"
          >
            <Printer size={15} /> Print
          </button>
          
          <button
            onClick={handleCopy}
            className="min-h-[48px] rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label="Copy bill text"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-900/30"
            aria-label="Share via WhatsApp"
          >
            <Share2 size={15} /> WhatsApp
          </button>
        </div>
      </Card>

      {/* Printable Receipt (CSS Hidden except @media print) */}
      <div className="receipt-print p-2 font-mono text-xs text-black bg-white" style={{ width: printWidth === "58mm" ? "58mm" : "80mm" }}>
        <p className="text-center font-bold text-sm">KADO CAFE</p>
        <p className="text-center text-[10px] mb-1">{invoiceNo} · {new Date(dateStr).toLocaleString()}</p>
        <p className="text-[11px] font-semibold">{bill.source || "POS Order"}{bill.customerName ? ` · ${bill.customerName}` : ""}</p>
        <div className="border-t border-black my-1" />
        
        {(bill.items || []).map((it, idx) => (
          <div key={idx} className="flex justify-between py-0.5">
            <span>{it.name || it.menuItemId || "Item"} ×{it.qty}</span>
            <span>{currency((it.price || 0) * it.qty)}</span>
          </div>
        ))}
        
        <div className="border-t border-black my-1" />
        <div className="flex justify-between"><span>Subtotal</span><span>{currency(bill.subtotal || 0)}</span></div>
        {bill.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{currency(bill.discount)}</span></div>}
        {bill.gst > 0 && <div className="flex justify-between"><span>GST (5%)</span><span>{currency(bill.gst)}</span></div>}
        {bill.roundOff !== 0 && bill.roundOff !== undefined && <div className="flex justify-between"><span>Round Off</span><span>{currency(bill.roundOff)}</span></div>}
        {bill.pointsRedeemed > 0 && <div className="flex justify-between"><span>Points</span><span>-{currency(bill.pointsRedeemed)}</span></div>}
        
        <div className="border-t border-black my-1" />
        <div className="flex justify-between font-bold text-sm"><span>GRAND TOTAL</span><span>{currency(bill.grandTotal || 0)}</span></div>
        <p className="mt-1 text-[11px]">Paid via: {bill.paymentMode || bill.paymentMethod || "Cash"}</p>
        <p className="text-center mt-3 font-semibold">Thank you! Visit again! ☕</p>
      </div>
    </div>
  );
}
