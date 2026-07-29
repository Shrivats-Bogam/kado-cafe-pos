import { useState, useCallback, useRef, useEffect } from "react";

// Tiny toast manager + Toaster component.
// Usage:
//   const toaster = useToaster();
//   toaster.push("Hello", "info");
//   <Toaster toaster={toaster} />
//
// Toasts auto-dismiss after 4s. The "rush" tone stays for 6s so it's not missed.

const TONE_STYLES = {
  info:    "bg-stone-800 border-stone-700 text-stone-100",
  success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
  rush:    "bg-rose-900/90 border-rose-700 text-rose-100 animate-pulse",
  warn:    "bg-amber-900/90 border-amber-700 text-amber-100",
};

export function useToaster() {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((message, tone = "info", autoMs) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    const ms = autoMs ?? (tone === "rush" ? 6000 : 4000);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), ms);
    return id;
  }, []);
  const dismiss = useCallback((id) => setItems((prev) => prev.filter((t) => t.id !== id)), []);
  return { items, push, dismiss };
}

export default function Toaster({ toaster }) {
  const { items, dismiss } = toaster;
  // Keep a fully-stable render so doesn't thrash when localStorage is busy
  return (
    <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none w-full px-3 sm:w-auto sm:px-0">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto w-full sm:w-auto sm:min-w-[260px] sm:max-w-md rounded-xl px-4 py-2.5 text-sm border shadow-lg backdrop-blur ${TONE_STYLES[t.tone] || TONE_STYLES.info}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
