import { useState, useMemo } from "react";
import { Search, Plus, Users, BarChart3, UserX, Award, Sparkles } from "lucide-react";
import { PrimaryButton, Pill } from "../components/ui.jsx";
import { CustomerCard, getCustomerTier } from "../components/CustomerCard.jsx";
import { CustomerProfileDrawer } from "../components/CustomerProfileDrawer.jsx";
import { CustomerModal } from "../components/CustomerModal.jsx";
import { CRMAnalytics } from "../components/CRMAnalytics.jsx";

export default function CustomersView({
  customers = [],
  orderHistory = [],
  menuItems = [],
  onAdd,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState("list"); // "list" | "analytics"
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All"); // "All" | "Silver" | "Gold" | "Platinum" | "Top Customers"

  // Drawer and Modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Pre-calculate customer spend map from order history for accurate tier filtering
  const customerSpends = useMemo(() => {
    const map = {};
    orderHistory.forEach((o) => {
      const cId = o.customerId;
      const phone = o.phone;
      const amount = o.grandTotal || o.total || 0;
      if (cId) {
        map[cId] = (map[cId] || 0) + amount;
      } else if (phone) {
        const found = customers.find((c) => c.phone === phone);
        if (found) {
          map[found.id] = (map[found.id] || 0) + amount;
        }
      }
    });
    return map;
  }, [customers, orderHistory]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search query filter
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q);

      if (!matchesQuery) return false;

      // Tier filter
      if (tierFilter === "All") return true;

      const spend = customerSpends[c.id] || 0;
      const tier = getCustomerTier(spend, c.points || 0);

      if (tierFilter === "Top Customers") {
        return spend >= 5000 || (c.points || 0) >= 200;
      }

      return tier.name.toLowerCase() === tierFilter.toLowerCase();
    });
  }, [customers, query, tierFilter, customerSpends]);

  // Keep selectedCustomer updated if customer array updates
  const activeCustomer = useMemo(() => {
    if (!selectedCustomer) return null;
    return customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer;
  }, [selectedCustomer, customers]);

  // Save handler for Add / Edit
  const handleSaveCustomer = (customerData) => {
    if (editingCustomer) {
      // Delete old version then add updated version to preserve state contract
      onDelete(editingCustomer.id);
      onAdd(customerData);
      setEditingCustomer(null);
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer(customerData);
      }
    } else {
      onAdd(customerData);
      setShowAddModal(false);
    }
  };

  // Inline Note Update handler
  const handleUpdateNotes = (customerId, newNotes) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) return;
    const updated = { ...target, notes: newNotes };
    onDelete(customerId);
    onAdd(updated);
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(updated);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Users size={22} className="text-amber-400" /> Customer & CRM Center
          </h1>
          <p className="text-xs text-stone-400">
            Manage customer profiles, loyalty points, and purchase analytics
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "list"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Users size={14} /> Customers List
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <BarChart3 size={14} /> Analytics
          </button>
        </div>
      </div>

      {/* Tab 1: Customer List */}
      {activeTab === "list" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Controls Bar: Sticky Search, Filters & Add Button */}
          <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md pb-2 pt-1 space-y-3">
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer by name or phone..."
                  className="w-full rounded-xl bg-stone-850 border border-stone-750 pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition-colors shadow-inner"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Add Customer Button */}
              <PrimaryButton
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs shrink-0 shadow-md"
              >
                <Plus size={16} /> Add Customer
              </PrimaryButton>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-stone-500 font-medium mr-1 text-[11px] shrink-0">Filter Tier:</span>
              {["All", "Silver", "Gold", "Platinum", "Top Customers"].map((filter) => {
                const isActive = tierFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setTierFilter(filter)}
                    className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 border ${
                      isActive
                        ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs"
                        : "bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Cards Grid */}
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl text-center my-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-400">
                <UserX size={26} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-200 text-base">No Customers Found</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm">
                  {query || tierFilter !== "All"
                    ? "No customers match your current search or tier filter criteria."
                    : "Add your first customer to begin tracking loyalty points and order history."}
                </p>
              </div>
              <PrimaryButton
                onClick={() => {
                  setQuery("");
                  setTierFilter("All");
                  setShowAddModal(true);
                }}
                className="mt-2 text-xs flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Customer
              </PrimaryButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  lifetimeSpend={customerSpends[customer.id] || 0}
                  onClick={() => setSelectedCustomer(customer)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Analytics */}
      {activeTab === "analytics" && (
        <CRMAnalytics
          customers={customers}
          orderHistory={orderHistory}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c);
            setActiveTab("list");
          }}
        />
      )}

      {/* Customer Profile Slide-over Drawer */}
      {activeCustomer && (
        <CustomerProfileDrawer
          customer={activeCustomer}
          orderHistory={orderHistory}
          menuItems={menuItems}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(c) => setEditingCustomer(c)}
          onDelete={onDelete}
          onUpdateNotes={handleUpdateNotes}
        />
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <CustomerModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={handleSaveCustomer}
        />
      )}
    </div>
  );
}
