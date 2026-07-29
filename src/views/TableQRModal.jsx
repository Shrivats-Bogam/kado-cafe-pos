import { Printer, X } from "lucide-react";
import { Card, IconButton, PrimaryButton } from "../components/ui.jsx";
import QRCode from "../components/QRCode.jsx";

// Shows a printable QR code that opens the customer-facing ordering page for this table.
export default function TableQRModal({ table, onClose }) {
  const url = `${window.location.origin}${window.location.pathname}?table=${table.id}`;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-xs p-5 flex flex-col items-center gap-3 my-4 sm:my-0">
        <div className="flex justify-between items-center w-full">
          <h3 className="font-serif text-lg text-stone-50">Table {table.number} QR</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>
        <QRCode value={url} size={200} />
        <p className="text-xs text-stone-500 text-center">
          Customers scan this to open the menu for Table {table.number} and send their order
          straight to the kitchen. Print and place it on the table.
        </p>
        <PrimaryButton onClick={() => window.print()} className="w-full flex items-center justify-center gap-2">
          <Printer size={15} /> Print QR
        </PrimaryButton>
      </Card>
    </div>
  );
}
