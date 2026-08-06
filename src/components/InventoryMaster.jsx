import { useState, useMemo } from "react";
import { Search, Plus, Edit2, Trash2, X } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function InventoryMaster({ 
  inventory = [], 
  onAdd, 
  onEdit, 
  onDelete 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSupplier, setSelectedSupplier] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    unit: "pcs",
    currentStock: "",
    minStock: "",
    costPrice: "",
    supplier: "",
    notes: ""
  });

  // Extract unique categories & suppliers
  const categories = useMemo(() => {
    const set = new Set(inventory.map(i => i.category || "General"));
    return ["All", ...Array.from(set)];
  }, [inventory]);

  const suppliers = useMemo(() => {
    const set = new Set(inventory.map(i => i.supplier).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [inventory]);

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      // Category Filter
      if (selectedCategory !== "All" && (item.category || "General") !== selectedCategory) return false;
      // Supplier Filter
      if (selectedSupplier !== "All" && item.supplier !== selectedSupplier) return false;
      
      // Status Filter
      const stock = item.currentStock || 0;
      const min = item.minStock || 0;
      if (selectedStatus === "Healthy" && stock <= min) return false;
      if (selectedStatus === "Low" && (stock === 0 || stock > min)) return false;
      if (selectedStatus === "Out of Stock" && stock > 0) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchSup = (item.supplier || "").toLowerCase().includes(q);
        return matchName || matchCat || matchSup;
      }

      return true;
    });
  }, [inventory, selectedCategory, selectedSupplier, selectedStatus, searchQuery]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "General",
      unit: "pcs",
      currentStock: "",
      minStock: "",
      costPrice: "",
      supplier: "",
      notes: ""
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      category: item.category || "General",
      unit: item.unit || "pcs",
      currentStock: item.currentStock ?? "",
      minStock: item.minStock ?? "",
      costPrice: item.costPrice ?? "",
      supplier: item.supplier || "",
      notes: item.notes || ""
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      onEdit(editingItem.id, {
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        currentStock: Number(formData.currentStock) || 0,
        minStock: Number(formData.minStock) || 0,
        costPrice: Number(formData.costPrice) || 0,
        supplier: formData.supplier.trim(),
        notes: formData.notes.trim()
      });
    } else {
      onAdd({
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        currentStock: Number(formData.currentStock) || 0,
        minStock: Number(formData.minStock) || 0,
        costPrice: Number(formData.costPrice) || 0,
        supplier: formData.supplier.trim(),
        notes: formData.notes.trim()
      });
    }

    setShowModal(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product name, category, or supplier..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
          >
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>

          {/* Supplier Dropdown */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
          >
            {suppliers.map(s => <option key={s} value={s}>{s === "All" ? "All Suppliers" : s}</option>)}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Stock Status</option>
            <option value="Healthy">Healthy Stock 🟢</option>
            <option value="Low">Low Stock 🟡</option>
            <option value="Out of Stock">Out of Stock 🔴</option>
          </select>

          <PrimaryButton
            onClick={openAddModal}
            className="min-h-[44px] px-4 text-xs font-bold shrink-0 active:scale-95"
          >
            <Plus size={16} /> Add Product
          </PrimaryButton>
        </div>
      </div>

      {/* Inventory Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 text-sm">
            No products found matching criteria.
          </div>
        ) : (
          filteredItems.map((item) => {
            const stock = item.currentStock || 0;
            const min = item.minStock || 0;
            const price = item.costPrice || 0;
            const itemVal = stock * price;

            let badgeTone = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            let badgeText = "Healthy 🟢";
            if (stock === 0) {
              badgeTone = "bg-rose-500/15 text-rose-400 border-rose-500/30";
              badgeText = "Out of Stock ⚫";
            } else if (stock <= min) {
              badgeTone = "bg-amber-500/15 text-amber-400 border-amber-500/30";
              badgeText = "Low Stock 🟡";
            }

            return (
              <Card key={item.id} className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-100 text-sm">{item.name}</h4>
                    <span className="text-[11px] text-stone-400 block">{item.category || "General"}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeTone}`}>
                    {badgeText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <div>
                    <span className="text-stone-500 text-[10px] block">Stock</span>
                    <span className="font-mono font-bold text-stone-200">{stock} {item.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 text-[10px] block">Min Stock</span>
                    <span className="font-mono text-stone-400">{min} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[10px] block">Cost Price</span>
                    <span className="font-mono text-stone-300">{currency(price)} / {item.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 text-[10px] block">Valuation</span>
                    <span className="font-mono font-bold text-amber-400">{currency(itemVal)}</span>
                  </div>
                </div>

                {item.supplier && (
                  <p className="text-[11px] text-stone-400 truncate">
                    <span className="text-stone-500 font-medium">Supplier:</span> {item.supplier}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-stone-800/80 pt-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 transition"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-rose-400 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-stone-900 border border-stone-800 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-stone-100 text-sm">{editingItem ? "Edit Product" : "Add New Ingredient"}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Milk, Coffee Beans, Bun..."
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Dairy, Beverages, Bakery..."
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {["kg", "g", "litre", "ml", "pcs", "bottle", "packet"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier / Vendor name"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes or specs..."
                  rows={2}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs text-stone-300 font-semibold"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" className="flex-1 min-h-[44px] text-xs font-bold">
                  {editingItem ? "Save Changes" : "Create Product"}
                </PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
