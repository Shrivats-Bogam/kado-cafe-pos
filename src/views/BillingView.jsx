import { useState } from "react";
import { Receipt, History, ShoppingBag } from "lucide-react";
import MenuPicker from "../components/MenuPicker.jsx";
import CheckoutPanel from "../components/CheckoutPanel.jsx";
import InvoicePreview from "../components/InvoicePreview.jsx";
import BillingHistory from "../components/BillingHistory.jsx";

export default function BillingView({ 
  orderHistory = [], 
  menuItems = [], 
  customers = [], 
  onCreateBill, 
  onUpdateBillStatus 
}) {
  const [activeTab, setActiveTab] = useState("history"); // "checkout", "history"
  const [counterCart, setCounterCart] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  const handleCompleteCounterCheckout = (billData) => {
    if (onCreateBill) {
      onCreateBill(billData);
    }
    setCounterCart([]);
    setSelectedBill(billData);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <Receipt className="text-amber-500" size={22} /> Commercial Billing & Checkout
          </h2>
          <p className="text-xs text-stone-400">Manage cashier billing, split payments, invoices & daily revenue</p>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "history" 
                ? "bg-amber-500 text-stone-950 shadow-md" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <History size={15} /> Bill History
          </button>
          
          <button
            onClick={() => setActiveTab("checkout")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "checkout" 
                ? "bg-amber-500 text-stone-950 shadow-md" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ShoppingBag size={15} /> Direct Counter Bill
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "history" && (
        <BillingHistory 
          orderHistory={orderHistory}
          onSelectBill={(bill) => setSelectedBill(bill)}
          onUpdateBillStatus={onUpdateBillStatus}
        />
      )}

      {activeTab === "checkout" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Menu Selection Side */}
          <div className="lg:col-span-5 bg-stone-900 p-4 rounded-2xl border border-stone-800 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-stone-200">Select Counter Items</h3>
            <MenuPicker menuItems={menuItems} cart={counterCart} setCart={setCounterCart} />
          </div>

          {/* Checkout Panel Side */}
          <div className="lg:col-span-7">
            {counterCart.length === 0 ? (
              <div className="h-full min-h-[350px] bg-stone-900 border border-stone-800 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <ShoppingBag size={48} className="text-stone-700 mb-3" />
                <h4 className="text-lg font-serif text-stone-300">Counter Cart is Empty</h4>
                <p className="text-xs text-stone-500 max-w-xs mt-1">
                  Select menu items from the left panel to begin a direct counter checkout.
                </p>
              </div>
            ) : (
              <CheckoutPanel 
                cart={counterCart}
                menuItems={menuItems}
                customers={customers}
                sourceTitle="Counter"
                onCompleteCheckout={handleCompleteCounterCheckout}
                onCancel={() => setCounterCart([])}
              />
            )}
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedBill && (
        <InvoicePreview 
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
