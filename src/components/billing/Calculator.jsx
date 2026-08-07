import { useState } from "react";
import { Calculator as CalculatorIcon, Delete } from "lucide-react";
import { Card, IconButton } from "../ui/index.js";

// Quick side calculator for the staff. No eval — each operator is explicit.

export default function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState(null); // { value, operator }
  const [overwrite, setOverwrite] = useState(true);

  const apply = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "\u00D7": return a * b;
      case "\u00F7": return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const pressDigit = (d) => {
    setDisplay((cur) => {
      if (overwrite) return d === "." ? "0." : d;
      if (d === "." && cur.includes(".")) return cur;
      if (cur.length >= 12) return cur;
      return cur === "0" && d !== "." ? d : cur + d;
    });
    setOverwrite(false);
  };

  const pressOperator = (op) => {
    const current = parseFloat(display);
    if (stored && !overwrite) {
      const result = apply(stored.value, current, stored.operator);
      setStored({ value: result, operator: op });
      setDisplay(String(result));
    } else {
      setStored({ value: current, operator: op });
    }
    setOverwrite(true);
  };

  const pressEquals = () => {
    if (!stored) return;
    const current = parseFloat(display);
    const result = apply(stored.value, current, stored.operator);
    setDisplay(String(Number.isFinite(result) ? Math.round(result * 100) / 100 : 0));
    setStored(null);
    setOverwrite(true);
  };

  const clear = () => { setDisplay("0"); setStored(null); setOverwrite(true); };
  const backspace = () => setDisplay((cur) => (cur.length <= 1 || overwrite ? "0" : cur.slice(0, -1)));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className="w-full sm:max-w-xs p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg text-stone-50 flex items-center gap-2">
            <CalculatorIcon size={17} className="text-amber-500" /> Calculator
          </h3>
          <IconButton onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </div>

        <div className="rounded-xl bg-stone-800 px-4 py-4 text-right">
          <p className="text-3xl font-semibold text-stone-50 truncate">{display}</p>
          {stored && <p className="text-xs text-stone-500">{stored.value} {stored.operator}</p>}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={clear} className="rounded-xl py-3 text-sm font-medium bg-stone-800 text-rose-400">C</button>
          <button onClick={backspace} className="rounded-xl py-3 flex items-center justify-center bg-stone-800 text-stone-300"><Delete size={16} /></button>
          <button onClick={() => pressOperator("\u00F7")} className="rounded-xl py-3 text-sm font-medium bg-stone-800 text-amber-400">{"\u00F7"}</button>
          <button onClick={() => pressOperator("\u00D7")} className="rounded-xl py-3 text-sm font-medium bg-stone-800 text-amber-400">{"\u00D7"}</button>

          {["7", "8", "9"].map((d) => (
            <button key={d} onClick={() => pressDigit(d)} className="rounded-xl py-3 text-sm font-medium bg-stone-800/70 text-stone-100">{d}</button>
          ))}
          <button onClick={() => pressOperator("-")} className="rounded-xl py-3 text-sm font-medium bg-stone-800 text-amber-400">-</button>

          {["4", "5", "6"].map((d) => (
            <button key={d} onClick={() => pressDigit(d)} className="rounded-xl py-3 text-sm font-medium bg-stone-800/70 text-stone-100">{d}</button>
          ))}
          <button onClick={() => pressOperator("+")} className="rounded-xl py-3 text-sm font-medium bg-stone-800 text-amber-400">+</button>

          {["1", "2", "3"].map((d) => (
            <button key={d} onClick={() => pressDigit(d)} className="rounded-xl py-3 text-sm font-medium bg-stone-800/70 text-stone-100">{d}</button>
          ))}
          <button onClick={pressEquals} className="row-span-2 rounded-xl text-sm font-medium bg-amber-500 text-stone-950">=</button>

          <button onClick={() => pressDigit("0")} className="col-span-2 rounded-xl py-3 text-sm font-medium bg-stone-800/70 text-stone-100">0</button>
          <button onClick={() => pressDigit(".")} className="rounded-xl py-3 text-sm font-medium bg-stone-800/70 text-stone-100">.</button>
        </div>
      </Card>
    </div>
  );
}
