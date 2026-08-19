import { useState, useMemo } from "react";
import { 
  Plus, Check, X, Trash2, Edit3, Copy, ArrowUp, ArrowDown, 
  Search, UtensilsCrossed, Tag, AlertCircle, Layers
} from "lucide-react";
import { Card, IconButton, PrimaryButton, ConfirmDialog } from "../components/ui.jsx";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../data/menu.js";
import { currency } from "../lib/currency.js";

export default function MenuManageView({ 
  menuItems = [], 
  categories = DEFAULT_CATEGORIES,
  onAdd, 
  onEdit, 
  onDelete,
  onDuplicate,
  onReorderItems,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories
}) {
  const activeCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  }, [categories]);

  const [selectedCat, setSelectedCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Available, Unavailable

  // Modals & Confirmation States
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [editingCatName, setEditingCatName] = useState(null);
  const [deleteCatConfirmName, setDeleteCatConfirmName] = useState(null);

  // Filter items by category, search query, and availability status
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (selectedCat !== "All" && item.category !== selectedCat) {
        return false;
      }
      // Status filter
      if (statusFilter === "Available" && !item.available) return false;
      if (statusFilter === "Unavailable" && item.available) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        return matchName || matchCat || matchDesc;
      }

      return true;
    });
  }, [menuItems, selectedCat, statusFilter, searchQuery]);

  // Reorder Item Up / Down within current menuItems array
  const handleMoveItem = (id, direction) => {
    if (!onReorderItems) return;
    const index = menuItems.findIndex((m) => m.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;

    const nextItems = [...menuItems];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;
    onReorderItems(nextItems);
  };

  // Reorder Category Up / Down
  const handleMoveCategory = (catName, direction) => {
    if (!onReorderCategories) return;
    const index = activeCategories.findIndex((c) => c === catName);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeCategories.length) return;

    const nextCats = [...activeCategories];
    const temp = nextCats[index];
    nextCats[index] = nextCats[targetIndex];
    nextCats[targetIndex] = temp;
    onReorderCategories(nextCats);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <UtensilsCrossed className="text-amber-500" size={22} /> Commercial Menu Management
          </h2>
          <p className="text-xs text-stone-400">Manage categories, item pricing, stock availability & order sequencing</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="add-category-btn"
            onClick={() => setShowNewCatModal(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
          >
            <Layers size={15} /> Add Category
          </button>
          <PrimaryButton
            onClick={() => setShowNewItem(true)}
            data-testid="add-menu-item-btn"
            className="min-h-[44px] px-4 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus size={16} /> Add Menu Item
          </PrimaryButton>
        </div>
      </div>

      {/* Main Commercial 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Category Navigation & Management */}
        <div className="lg:col-span-4 bg-stone-900 p-4 rounded-2xl border border-stone-800 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-stone-800">
            <h3 className="text-xs uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <Tag size={14} /> Categories ({activeCategories.length})
            </h3>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setSelectedCat("All")}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer ${
                selectedCat === "All"
                  ? "bg-amber-500 text-stone-950 shadow-md"
                  : "bg-stone-950/60 text-stone-300 hover:bg-stone-800 border border-stone-800/80"
              }`}
            >
              <span>All Categories</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${selectedCat === "All" ? "bg-stone-950 text-amber-400 font-bold" : "bg-stone-800 text-stone-400"}`}>
                {menuItems.length}
              </span>
            </button>

            {activeCategories.map((cat, idx) => {
              const catItemCount = menuItems.filter((m) => m.category === cat).length;
              const isSelected = selectedCat === cat;

              return (
                <div
                  key={cat}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                      : "bg-stone-950/60 border-stone-800/80 text-stone-300 hover:bg-stone-800/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className="flex-1 text-left text-xs font-semibold truncate py-0.5 cursor-pointer"
                  >
                    {cat}
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-800 text-stone-400">
                      {catItemCount}
                    </span>

                    {/* Reorder Category Up / Down */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(cat, "up")}
                      className="p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                      title="Move Category Up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === activeCategories.length - 1}
                      onClick={() => handleMoveCategory(cat, "down")}
                      className="p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                      title="Move Category Down"
                    >
                      <ArrowDown size={12} />
                    </button>

                    {/* Delete Category */}
                    {onDeleteCategory && (
                      <button
                        type="button"
                        onClick={() => setDeleteCatConfirmName(cat)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition"
                        title="Delete Category"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Menu Items Management */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items by name, category, description..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 min-h-[44px]"
              />
            </div>

            <div className="flex gap-1.5 shrink-0">
              {["All", "Available", "Unavailable"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer ${
                    statusFilter === st
                      ? "bg-amber-500 text-stone-950 shadow-md"
                      : "bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            /* Purposeful Empty State (PART 26) */
            <div className="flex flex-col items-center justify-center p-12 bg-stone-900/60 border border-stone-800 rounded-3xl text-center select-none pointer-events-none my-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
                <UtensilsCrossed size={32} />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-200 mb-1">No Menu Items Found</h3>
              <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
                {selectedCat !== "All"
                  ? `No items in category "${selectedCat}". Click Add Menu Item to add one.`
                  : "No items match your search or availability filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item, idx) => (
                <Card
                  key={item.id}
                  className={`p-4 flex flex-col justify-between gap-3 border transition ${
                    item.available
                      ? "bg-stone-900 border-stone-800 hover:border-stone-700"
                      : "bg-stone-950/80 border-stone-800/80 opacity-75"
                  }`}
                >
                  {/* Top Item Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <h4 className={`font-bold text-sm leading-tight ${item.available ? "text-stone-100" : "text-stone-400 line-through"}`}>
                          {item.name}
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-400/90 block mt-0.5">{item.category}</span>
                      {item.description && (
                        <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-base font-serif font-bold text-stone-100 font-mono">
                        {currency(item.price)}
                      </span>
                      
                      {/* Availability Badge & Fast Toggle (PART 6, 8) */}
                      <button
                        type="button"
                        onClick={() => onEdit(item.id, { available: !item.available })}
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border transition cursor-pointer ${
                          item.available
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                        }`}
                        title="Click to toggle availability"
                      >
                        {item.available ? "🟢 Available" : "🔴 Unavailable"}
                      </button>
                    </div>
                  </div>

                  {/* Actions Toolbar (PART 13) */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 mt-1 text-xs">
                    {/* Item Sequence Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveItem(item.id, "up")}
                        className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === filteredItems.length - 1}
                        onClick={() => handleMoveItem(item.id, "down")}
                        className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Edit, Duplicate & Delete */}
                    <div className="flex items-center gap-1.5">
                      {onDuplicate && (
                        <button
                          type="button"
                          onClick={() => onDuplicate(item.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Duplicate Item"
                        >
                          <Copy size={13} /> Duplicate
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        data-testid={`edit-menu-${item.name}`}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Item Modal */}
      {showNewItem && (
        <MenuItemFormModal
          categories={activeCategories}
          defaultCategory={selectedCat !== "All" ? selectedCat : activeCategories[0]}
          onClose={() => setShowNewItem(false)}
          onSubmit={(itemData) => {
            onAdd(itemData);
            setShowNewItem(false);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <MenuItemFormModal
          item={editingItem}
          categories={activeCategories}
          onClose={() => setEditingItem(null)}
          onSubmit={(patchData) => {
            onEdit(editingItem.id, patchData);
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete Item Confirm Dialog */}
      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Menu Item"
          message="Are you sure you want to delete this menu item? Historical bills and kitchen records will remain unchanged."
          confirmText="Delete Item"
          onConfirm={() => {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {/* Add Category Modal */}
      {showNewCatModal && (
        <AddCategoryModal
          onClose={() => setShowNewCatModal(false)}
          onAdd={(catName) => {
            if (onAddCategory) onAddCategory(catName);
            setShowNewCatModal(false);
          }}
        />
      )}

      {/* Delete Category Confirm Dialog */}
      {deleteCatConfirmName && (
        <ConfirmDialog
          title="Delete Category"
          message={`Are you sure you want to delete category "${deleteCatConfirmName}"?`}
          confirmText="Delete Category"
          onConfirm={() => {
            if (onDeleteCategory) onDeleteCategory(deleteCatConfirmName);
            setDeleteCatConfirmName(null);
          }}
          onCancel={() => setDeleteCatConfirmName(null)}
        />
      )}
    </div>
  );
}

// Subcomponent: Add / Edit Menu Item Form Modal
function MenuItemFormModal({ item, categories = [], defaultCategory, onClose, onSubmit }) {
  const [name, setName] = useState(item ? item.name : "");
  const [category, setCategory] = useState(item ? item.category : defaultCategory || categories[0] || "General");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [description, setDescription] = useState(item ? item.description || "" : "");
  const [available, setAvailable] = useState(item ? item.available !== false : true);
  const [isVeg, setIsVeg] = useState(item ? item.isVeg !== false : true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || Number(price) < 0) return;

    onSubmit({
      name: name.trim(),
      category,
      price: Number(price) || 0,
      description: description.trim(),
      available,
      isVeg
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-md p-5 flex flex-col gap-4 bg-stone-900 border border-stone-800 shadow-2xl rounded-2xl my-auto">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <h3 className="font-serif text-lg font-bold text-stone-50">
            {item ? "Edit Menu Item" : "New Menu Item"}
          </h3>
          <IconButton onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Item Name *</label>
            <input
              type="text"
              data-testid="menu-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masala Chai, Cheese Burger"
              required
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Category *</label>
              <select
                data-testid="menu-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-stone-400 font-semibold block mb-1">Price (₹) *</label>
              <input
                type="number"
                data-testid="menu-price-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 50"
                required
                min="0"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 font-semibold block mb-1">Description / Recipe Note</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short item details or preparation instructions..."
              rows={2}
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-stone-200 font-semibold">Vegetarian Item</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span className="text-stone-200 font-semibold">Available for Order</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" data-testid="menu-submit-btn" className="min-h-[44px] px-5 text-xs font-bold cursor-pointer">
              {item ? "Save Changes" : "Create Item"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Subcomponent: Add Category Modal
function AddCategoryModal({ onClose, onAdd }) {
  const [catName, setCatName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAdd(catName.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-sm p-5 flex flex-col gap-4 bg-stone-900 border border-stone-800 shadow-2xl rounded-2xl">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <h3 className="font-serif text-lg font-bold text-stone-50">New Category</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Category Name *</label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Desserts, Mocktails"
              required
              autoFocus
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" className="min-h-[44px] px-5 text-xs font-bold cursor-pointer">
              Add Category
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
