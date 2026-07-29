import { useState, useEffect } from "react";
import { Coffee, Check } from "lucide-react";
import { PrimaryButton } from "../components/ui.jsx";
import MenuPicker from "../components/MenuPicker.jsx";
import CartSummary from "../components/CartSummary.jsx";
import { getState, setState } from "../lib/storage.js";
import { defaultState } from "../data/defaults.js";
import { orderTotal, currency } from "../lib/currency.js";

// Customer-facing scan-to-order page.
// Loaded when the URL contains ?table=<id> — typically reached via QR
// on the customer's own phone. Reads + writes the shared cafe state through
// the same storage layer so the staff tablet sees their order in near-realtime
// (Supabase realtime if configured, otherwise polls every ~20 seconds on the
// staff side).

export default function CustomerOrderPage({ tableId }) {
  const [cart, setCart] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null); // { menuItems, tables, cafeName }

  useEffect(() => {
    (async () => {
      try {
        const json = await getState();
        // Backfill missing keys with defaults so older saved state can't crash us.
        const parsed = json ? { ...defaultState(), ...JSON.parse(json) } : defaultState();
        setSnapshot(parsed);
      } catch {
        setError("Couldn't load the menu right now.");
      }
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    setError("");
    try {
      // Re-fetch immediately before writing, to shrink the overwrite window for
      // any staff edit made while this customer was browsing.
      const json = await getState();
      const fresh = json ? { ...defaultState(), ...JSON.parse(json) } : snapshot;
      const table = fresh.tables.find((t) => t.id === tableId);
      if (!table) {
        setError("This table isn't set up anymore — please ask staff.");
        return;
      }

      // Merge cart into existing table items (instead of clobbering).
      const mergedItems = [...table.items];
      cart.forEach((c) => {
        const existing = mergedItems.find((i) => i.menuItemId === c.menuItemId);
        if (existing) existing.qty += c.qty;
        else mergedItems.push({ ...c });
      });

      const updated = {
        ...fresh,
        tables: fresh.tables.map((t) =>
          t.id === tableId ? {
            ...t,
            items: mergedItems,
            status: t.status === "available" ? "preparing" : t.status,
            startedAt: t.startedAt || new Date().toISOString(),
            kitchenStatus: t.items.length === 0 ? "New" : t.kitchenStatus,
            priority: t.priority || "Normal",
            priorityAt: t.priorityAt || null,
          } : t
        ),
      };

      await setState(JSON.stringify(updated));
      setSnapshot(updated);
      setSubmitted(true);
    } catch {
      setError("Couldn't send your order — please tell a staff member.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-500 text-sm">
        Loading menu...
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400 text-sm p-6 text-center">
        Couldn't load this cafe's menu — please ask staff for help.
      </div>
    );
  }

  const table = snapshot.tables.find((t) => t.id === tableId);
  if (!table) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400 text-sm p-6 text-center">
        This table QR code doesn't match this cafe's current setup — please ask staff for help.
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Check size={40} className="text-emerald-500" />
        <h2 className="font-serif text-xl text-stone-50">Sent to the kitchen!</h2>
        <p className="text-sm text-stone-400">Staff will confirm your order for Table {table.number} shortly.</p>
      </div>
    );
  }

  const totals = orderTotal(cart, snapshot.menuItems);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-32">
      <div className="p-4 border-b border-stone-800 flex items-center gap-2 sticky top-0 bg-stone-950 z-10">
        <Coffee size={18} className="text-amber-500" />
        <div>
          <h1 className="font-serif text-lg text-stone-50">{snapshot.cafeName || "Kado Cafe"}</h1>
          <p className="text-xs text-stone-500">Table {table.number} · Scan-to-order</p>
        </div>
      </div>

      <div className="p-4">
        <MenuPicker menuItems={snapshot.menuItems} cart={cart} setCart={setCart} />
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-stone-950 border-t border-stone-800 p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <CartSummary
          cart={cart}
          menuItems={snapshot.menuItems}
          discountPct={0}
          setDiscountPct={() => {}}
          gstOn={false}
          setGstOn={() => {}}
        />
        <PrimaryButton disabled={cart.length === 0} onClick={submit}>
          Send to Kitchen · {currency(totals.grandTotal)}
        </PrimaryButton>
      </div>
    </div>
  );
}
