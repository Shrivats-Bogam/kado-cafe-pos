import { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { getState, setState } from "../lib/storage.js";
import { defaultState } from "../data/defaults.js";
import { TRANSLATIONS } from "../components/CustomerTranslations.js";

import { CustomerHeader } from "../components/CustomerHeader.jsx";
import { CustomerMenuPicker } from "../components/CustomerMenuPicker.jsx";
import { CustomerCartDrawer } from "../components/CustomerCartDrawer.jsx";
import { OrderStatusTracker } from "../components/OrderStatusTracker.jsx";
import { CustomerFeedback } from "../components/CustomerFeedback.jsx";
import { DigitalReceiptModal } from "../components/DigitalReceiptModal.jsx";

export default function CustomerOrderPage({ tableId }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  
  // Customization state
  const [lang, setLang] = useState("EN");
  const [theme, setTheme] = useState("dark");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;

  // Poll state every 4 seconds so customer sees live kitchen status & billing status updates
  useEffect(() => {
    let timer;
    const fetchState = async () => {
      try {
        const json = await getState();
        const parsed = json ? { ...defaultState(), ...JSON.parse(json) } : defaultState();
        setSnapshot(parsed);
      } catch {
        setError("Couldn't sync state.");
      }
      setLoading(false);
    };

    fetchState();
    timer = setInterval(fetchState, 4000);
    return () => clearInterval(timer);
  }, []);

  const table = snapshot?.tables?.find((t) => t.id === tableId);

  // Submit cart order to existing Kitchen workflow
  const handleSubmitOrder = async () => {
    setError("");
    if (!cart.length || !table) return;

    try {
      const json = await getState();
      const fresh = json ? { ...defaultState(), ...JSON.parse(json) } : snapshot;
      const targetTable = fresh.tables.find((t) => t.id === tableId);
      if (!targetTable) {
        setError("Table is no longer available.");
        return;
      }

      // Merge cart items with notes into table items
      const mergedItems = [...targetTable.items];
      cart.forEach((c) => {
        const existingIndex = mergedItems.findIndex((i) => i.menuItemId === c.menuItemId && i.notes === c.notes);
        if (existingIndex > -1) {
          mergedItems[existingIndex].qty += c.qty;
        } else {
          mergedItems.push({ ...c });
        }
      });

      // Calculate incremental tickets if needed
      const existingTicketItems = targetTable.kitchenTickets || [];
      const newTicket = {
        id: `kt_${Date.now()}`,
        tableNumber: targetTable.number,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, qty: c.qty, notes: c.notes || "" })),
        status: "New",
        timestamp: new Date().toISOString()
      };

      const updated = {
        ...fresh,
        tables: fresh.tables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                items: mergedItems,
                status: t.status === "available" ? "preparing" : t.status,
                startedAt: t.startedAt || new Date().toISOString(),
                kitchenStatus: "New",
                kitchenTickets: [...(t.kitchenTickets || []), newTicket],
              }
            : t
        ),
      };

      await setState(JSON.stringify(updated));
      setSnapshot(updated);
      setCart([]);
      setSuccessToast("Order sent to Kitchen!");
      setTimeout(() => setSuccessToast(""), 3000);
    } catch (err) {
      setError("Couldn't send order to kitchen. Please inform staff.");
    }
  };

  // Call Waiter trigger
  const handleCallWaiter = async () => {
    if (!table) return;
    try {
      const json = await getState();
      const fresh = json ? { ...defaultState(), ...JSON.parse(json) } : snapshot;
      const newReq = {
        id: `req_${Date.now()}`,
        tableId,
        tableNumber: table.number,
        type: "waiter",
        message: `Table ${table.number} requests assistance.`,
        timestamp: new Date().toISOString(),
        cleared: false,
      };
      const updated = {
        ...fresh,
        assistanceRequests: [newReq, ...(fresh.assistanceRequests || [])]
      };
      await setState(JSON.stringify(updated));
      setSnapshot(updated);
      setSuccessToast(t.assistanceSent);
      setTimeout(() => setSuccessToast(""), 3000);
    } catch {
      setError("Failed to call waiter.");
    }
  };

  // Request Bill trigger
  const handleRequestBill = async () => {
    if (!table) return;
    try {
      const json = await getState();
      const fresh = json ? { ...defaultState(), ...JSON.parse(json) } : snapshot;
      const newReq = {
        id: `req_${Date.now()}`,
        tableId,
        tableNumber: table.number,
        type: "bill",
        message: `Table ${table.number} requested billing.`,
        timestamp: new Date().toISOString(),
        cleared: false,
      };
      const updated = {
        ...fresh,
        tables: fresh.tables.map(t => t.id === tableId ? { ...t, status: "billing" } : t),
        assistanceRequests: [newReq, ...(fresh.assistanceRequests || [])]
      };
      await setState(JSON.stringify(updated));
      setSnapshot(updated);
      setShowReceiptModal(true);
      setSuccessToast(t.billRequested);
      setTimeout(() => setSuccessToast(""), 3000);
    } catch {
      setError("Failed to request bill.");
    }
  };

  // Submit Feedback trigger
  const handleSubmitFeedback = async (feedbackData) => {
    try {
      const json = await getState();
      const fresh = json ? { ...defaultState(), ...JSON.parse(json) } : snapshot;
      const newFb = {
        id: `fb_${Date.now()}`,
        ...feedbackData,
        timestamp: new Date().toISOString()
      };
      const updated = {
        ...fresh,
        customerFeedback: [newFb, ...(fresh.customerFeedback || [])]
      };
      await setState(JSON.stringify(updated));
      setSnapshot(updated);
      setSuccessToast("Thank you for your feedback!");
      setTimeout(() => setSuccessToast(""), 3000);
    } catch {
      setError("Failed to submit feedback.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-500 text-sm">
        Loading menu & order system...
      </div>
    );
  }

  if (!snapshot || !table) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-2 p-6 text-center text-stone-400">
        <AlertCircle size={40} className="text-rose-500" />
        <h2 className="font-serif text-lg font-bold text-stone-100">Invalid Table QR Code</h2>
        <p className="text-xs">Please ask a staff member for assistance.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-stone-950 text-stone-100" : "bg-stone-100 text-stone-900"} pb-32 max-w-md mx-auto relative`}>
      {/* Customer Header */}
      <CustomerHeader
        cafeName={snapshot.cafeName}
        tableNumber={table.number}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        t={t}
      />

      {/* Notifications / Toast Banner */}
      {successToast && (
        <div className="mx-4 mt-3 p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Order Progress & Self-Service Bar */}
      <div className="p-4">
        <OrderStatusTracker
          table={table}
          onCallWaiter={handleCallWaiter}
          onRequestBill={handleRequestBill}
          t={t}
        />
      </div>

      {/* Menu & Customization Picker */}
      <div className="px-4">
        <CustomerMenuPicker
          menuItems={snapshot.menuItems || []}
          cart={cart}
          setCart={setCart}
          t={t}
        />
      </div>

      {/* Cart Drawer */}
      <CustomerCartDrawer
        cart={cart}
        menuItems={snapshot.menuItems || []}
        onSubmit={handleSubmitOrder}
        t={t}
      />

      {/* Digital Receipt Modal */}
      {showReceiptModal && (
        <DigitalReceiptModal
          table={table}
          menuItems={snapshot.menuItems || []}
          onClose={() => {
            setShowReceiptModal(false);
            setShowFeedbackModal(true); // Prompt feedback after viewing receipt
          }}
          t={t}
        />
      )}

      {/* Customer Feedback Rating Modal */}
      {showFeedbackModal && (
        <CustomerFeedback
          tableId={tableId}
          onSubmitFeedback={handleSubmitFeedback}
          onClose={() => setShowFeedbackModal(false)}
          t={t}
        />
      )}
    </div>
  );
}
