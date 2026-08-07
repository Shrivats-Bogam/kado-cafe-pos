import { User, Phone, FileText } from "lucide-react";

export default function ParcelCustomerPanel({ 
  customerName, 
  setCustomerName, 
  phone, 
  setPhone, 
  notes, 
  setNotes,
  customers = []
}) {
  const handleSelectCustomer = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const found = customers.find((c) => c.id === selectedId);
    if (found) {
      setCustomerName(found.name || "");
      setPhone(found.phone || "");
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <User size={16} className="text-amber-500" /> Customer Details
        </h3>
        {customers.length > 0 && (
          <select
            onChange={handleSelectCustomer}
            className="rounded-xl bg-stone-800 border border-stone-700 text-xs px-2.5 py-1.5 text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            defaultValue=""
          >
            <option value="" disabled>Lookup Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || "No phone"})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            className="w-full rounded-xl bg-stone-950 border border-stone-800 pl-9 pr-3 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[44px]"
          />
        </div>

        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Phone Number"
            className="w-full rounded-xl bg-stone-950 border border-stone-800 pl-9 pr-3 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[44px]"
          />
        </div>
      </div>

      <div className="relative">
        <FileText size={16} className="absolute left-3 top-3 text-stone-500" />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special Instructions / Order Notes"
          className="w-full rounded-xl bg-stone-950 border border-stone-800 pl-9 pr-3 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[44px]"
        />
      </div>
    </div>
  );
}
