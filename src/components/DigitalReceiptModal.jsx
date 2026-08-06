import { Share2, Printer, CheckCircle } from "lucide-react";
import { Modal, ModalHeader, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export function DigitalReceiptModal({ table, order, menuItems, onClose, t }) {
  const items = order?.items || table?.items || [];
  const grandTotal = order?.grandTotal || items.reduce((sum, item) => {
    const mi = menuItems.find(m => m.id === item.menuItemId);
    return sum + (mi?.price || 0) * item.qty;
  }, 0);

  const receiptText = `*Kado Cafe Receipt*%0ATable: ${table.number}%0ATotal Amount: ₹${grandTotal}%0ATank you for dining with us!`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${receiptText}`;

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={t.digitalReceipt} icon={CheckCircle} onClose={onClose} />
      <div className="flex flex-col gap-4 mt-4 text-xs text-stone-300">
        <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex flex-col gap-2 font-mono">
          <div className="text-center font-bold text-stone-100 border-b border-stone-800 pb-2">
            Kado Cafe
            <p className="text-[10px] text-stone-500 font-sans font-normal">Table {table.number}</p>
          </div>
          {items.map((it, i) => {
            const mi = menuItems.find(m => m.id === it.menuItemId);
            return (
              <div key={i} className="flex justify-between">
                <span>{mi?.name || it.menuItemId} × {it.qty}</span>
                <span>{currency((mi?.price || 0) * it.qty)}</span>
              </div>
            );
          })}
          <div className="border-t border-stone-800 pt-2 flex justify-between font-bold text-amber-400 text-sm">
            <span>Total</span>
            <span>{currency(grandTotal)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Share2 size={16} />
            <span>{t.shareWhatsApp}</span>
          </a>

          <PrimaryButton onClick={() => window.print()} className="w-full">
            <Printer size={16} />
            <span>{t.printReceipt}</span>
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
