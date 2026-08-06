import { useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import ParcelCustomerPanel from "./ParcelCustomerPanel.jsx";
import ParcelPaymentPanel from "./ParcelPaymentPanel.jsx";
import ParcelMenu from "./ParcelMenu.jsx";
import ParcelCart from "./ParcelCart.jsx";
import { currency, orderTotal } from "../lib/currency.js";
import { makeId } from "../lib/id.js";

export default function ParcelOrderScreen({ 
  menuItems, 
  customers = [],
  initialParcel = null, 
  onClose, 
  onSave 
}) {
  const [cart, setCart] = useState(
    initialParcel?.items ? initialParcel.items.map((i) => ({ ...i })) : []
  );
  const [customerName, setCustomerName] = useState(initialParcel?.customerName || "");
  const [phone, setPhone] = useState(initialParcel?.phone || "");
  const [notes, setNotes] = useState(initialParcel?.notes || "");
  const [isPaid, setIsPaid] = useState(initialParcel?.paymentStatus === "Paid" || initialParcel?.isPaid || false);
  const [paymentMethod, setPaymentMethod] = useState(initialParcel?.paymentMethod || "Cash");
  const [showMobileCart, setShowMobileCart] = useState(false);

  const { grandTotal } = orderTotal(cart, menuItems);
  const totalItemsCount = cart.reduce((acc, i) => acc + i.qty, 0);

  const handleSave = () => {
    if (cart.length === 0) return;
    
    const parcelPayload = {
      id: initialParcel?.id || makeId("p"),
      customerName,
      phone,
      items: cart,
      status: initialParcel?.status || "Preparing",
      paymentStatus: isPaid ? "Paid" : "Unpaid",
      paymentMethod: isPaid ? paymentMethod : "Pending",
      notes,
      createdAt: initialParcel?.createdAt || new Date().toISOString(),
    };

    onSave(parcelPayload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col overflow-hidden">
      {/* Top Bar Header */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-stone-300 hover:text-stone-100 bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl text-sm font-medium transition min-h-[44px]"
          >
            <ArrowLeft size={18} /> Back to Parcels
          </button>
          <h2 className="text-lg font-bold text-stone-100 hidden sm:block">
            {initialParcel ? `Edit Takeaway ${initialParcel.id}` : "New Takeaway Order"}
          </h2>
        </div>

        <div className="text-right">
          <span className="text-xs text-stone-400 block">Total Amount</span>
          <span className="text-lg font-bold text-amber-500">{currency(grandTotal)}</span>
        </div>
      </div>

      {/* Main Container - Split View for Desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Menu, Customer, Payment */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Customer & Payment Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ParcelCustomerPanel
              customerName={customerName}
              setCustomerName={setCustomerName}
              phone={phone}
              setPhone={setPhone}
              notes={notes}
              setNotes={setNotes}
              customers={customers}
            />
            <ParcelPaymentPanel
              isPaid={isPaid}
              setIsPaid={setIsPaid}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
            />
          </div>

          {/* Interactive Menu Grid */}
          <ParcelMenu 
            menuItems={menuItems} 
            cart={cart} 
            setCart={setCart} 
          />
        </div>

        {/* Right Column: Sticky Cart (Desktop) */}
        <div className="hidden md:block w-80 lg:w-96 shrink-0 h-full">
          <ParcelCart
            cart={cart}
            setCart={setCart}
            menuItems={menuItems}
            onSave={handleSave}
            isEdit={Boolean(initialParcel)}
          />
        </div>
      </div>

      {/* Mobile Bottom Sticky Bar & Drawer */}
      <div className="md:hidden sticky bottom-0 bg-stone-900 border-t border-stone-800 p-3 flex items-center justify-between shadow-2xl z-20">
        <button
          onClick={() => setShowMobileCart(true)}
          className="flex items-center gap-3 text-left"
        >
          <div className="relative bg-amber-500/20 text-amber-400 p-2.5 rounded-xl border border-amber-500/30">
            <ShoppingBag size={20} />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </div>
          <div>
            <span className="text-xs text-stone-400 block">{totalItemsCount} items</span>
            <span className="text-base font-bold text-stone-100">{currency(grandTotal)}</span>
          </div>
        </button>

        <button
          disabled={cart.length === 0}
          onClick={handleSave}
          className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold px-6 py-3 rounded-xl text-sm transition min-h-[48px]"
        >
          {initialParcel ? "Update" : "Checkout"}
        </button>
      </div>

      {/* Mobile Cart Full Sheet Overlay */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end md:hidden animate-fadeIn">
          <div className="bg-stone-950 border-t border-stone-800 rounded-t-3xl p-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-stone-800">
              <h3 className="font-bold text-stone-100 text-base">Cart Review</h3>
              <button 
                onClick={() => setShowMobileCart(false)}
                className="text-stone-400 text-sm bg-stone-800 px-3 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ParcelCart
                cart={cart}
                setCart={setCart}
                menuItems={menuItems}
                onSave={() => {
                  setShowMobileCart(false);
                  handleSave();
                }}
                isEdit={Boolean(initialParcel)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
