import { useState } from "react";
import { QrCode, Printer, RefreshCw } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";
import QRCode from "./QRCode.jsx";

export function QRCodeManager({ tables }) {
  const [selectedTable, setSelectedTable] = useState(tables[0] || null);

  const getUrl = (tId) => `${window.location.origin}${window.location.pathname}?table=${tId}`;

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
            <QrCode size={18} className="text-amber-500" />
            Table QR Code Manager
          </h3>
          <p className="text-xs text-stone-400">Generate, print, and manage scan-to-order QR codes for every table.</p>
        </div>
        <PrimaryButton onClick={() => window.print()}>
          <Printer size={16} />
          <span>Print All QRs</span>
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Table Selector List */}
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar border-r border-stone-800 pr-2">
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTable(t)}
              className={`p-3 rounded-xl border text-left flex justify-between items-center transition ${
                selectedTable?.id === t.id
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800/40"
              }`}
            >
              <span className="font-bold text-xs">Table {t.number}</span>
              <span className="text-[10px] text-stone-500">{t.capacity} seats</span>
            </button>
          ))}
        </div>

        {/* Selected Table Preview */}
        {selectedTable && (
          <div className="md:col-span-2 flex flex-col items-center justify-center gap-3 p-4 bg-stone-950 border border-stone-800 rounded-2xl">
            <h4 className="font-serif text-base font-bold text-stone-100">Table {selectedTable.number} QR</h4>
            <div className="p-3 bg-white rounded-xl shadow-lg">
              <QRCode value={getUrl(selectedTable.id)} size={180} />
            </div>
            <p className="text-xs text-stone-400 font-mono break-all text-center max-w-sm">
              {getUrl(selectedTable.id)}
            </p>
            <div className="flex gap-2 mt-2">
              <PrimaryButton onClick={() => window.print()} className="py-2">
                <Printer size={15} /> Print Table {selectedTable.number}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
