import { useState, useMemo } from "react";
import { Plus, Trash2, Check, BookOpen, Utensils, AlertCircle } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";

export default function RecipeBuilder({ 
  menuItems = [], 
  inventory = [], 
  recipes = {}, 
  onSaveRecipe 
}) {
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0]?.id || "");
  
  // Current recipe ingredients list for selected menu item
  const [currentIngredients, setCurrentIngredients] = useState(() => {
    return recipes[menuItems[0]?.id] ? [...recipes[menuItems[0]?.id]] : [];
  });
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedMenuItem = menuItems.find(m => m.id === selectedMenuId);

  const handleSelectMenu = (id) => {
    setSelectedMenuId(id);
    setCurrentIngredients(recipes[id] ? [...recipes[id]] : []);
    setSavedSuccess(false);
  };

  const handleAddIngredientRow = () => {
    if (inventory.length === 0) return;
    setCurrentIngredients([
      ...currentIngredients,
      { ingredientId: inventory[0].id, qty: 1 }
    ]);
  };

  const handleUpdateRow = (index, field, value) => {
    const next = [...currentIngredients];
    next[index] = {
      ...next[index],
      [field]: value
    };
    setCurrentIngredients(next);
  };

  const handleRemoveRow = (index) => {
    setCurrentIngredients(currentIngredients.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedMenuId) return;
    // Filter out rows with invalid/0 qty and cast qty to Number
    const cleanIngredients = currentIngredients
      .map((r) => ({ ...r, qty: Math.max(0.001, Number(r.qty) || 0) }))
      .filter((r) => r.qty > 0 && r.ingredientId);
    onSaveRecipe(selectedMenuId, cleanIngredients);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Menu Item Selector Panel */}
      <Card className="lg:col-span-4 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
          <BookOpen size={16} className="text-amber-500" /> Select Menu Item
        </h3>

        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {menuItems.map((m) => {
            const hasRecipe = Boolean(recipes[m.id] && recipes[m.id].length > 0);
            const isSelected = m.id === selectedMenuId;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMenu(m.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs flex justify-between items-center transition cursor-pointer ${
                  isSelected
                    ? "bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md"
                    : "bg-stone-950 text-stone-200 border-stone-800 hover:bg-stone-800"
                }`}
              >
                <span className="font-semibold truncate pr-2">{m.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-mono ${
                  hasRecipe 
                    ? (isSelected ? "bg-stone-950 text-amber-400 font-bold" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30") 
                    : "bg-stone-800 text-stone-500"
                }`}>
                  {hasRecipe ? `${recipes[m.id].length} ingr` : "No recipe"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Recipe Builder Editor Panel */}
      <Card className="lg:col-span-8 p-5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-4">
        <div>
          <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-50">
                Recipe for: <span className="text-amber-400">{selectedMenuItem?.name || "Select an Item"}</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Define ingredient portion sizes deducted automatically when billed</p>
            </div>
            
            <button
              type="button"
              onClick={handleAddIngredientRow}
              data-testid="recipe-add-ingredient-btn"
              disabled={inventory.length === 0}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              <Plus size={15} /> Add Ingredient
            </button>
          </div>

          {currentIngredients.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl flex flex-col items-center gap-2">
              <Utensils size={28} className="text-stone-700" />
              <span>No ingredients configured for this recipe yet. Click "Add Ingredient" to begin.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {currentIngredients.map((row, idx) => {
                const matchedInv = inventory.find(i => i.id === row.ingredientId);

                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="flex-1">
                      <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Ingredient Product</label>
                      <select
                        data-testid={`recipe-ingredient-select-${idx}`}
                        value={row.ingredientId}
                        onChange={(e) => handleUpdateRow(idx, "ingredientId", e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      >
                        {inventory.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit}) - Stock: {i.currentStock} {i.unit}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-36">
                      <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">
                        Qty per Portion ({matchedInv?.unit || "units"})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        data-testid={`recipe-ingredient-qty-${idx}`}
                        value={row.qty}
                        onChange={(e) => handleUpdateRow(idx, "qty", e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="pt-2 sm:pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-950 text-rose-400 transition cursor-pointer"
                        title="Remove ingredient"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Portion Stock Deduction Preview */}
        {currentIngredients.length > 0 && (
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              ⚡ Portion Stock Deduction Preview (per 1 order of {selectedMenuItem?.name})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentIngredients.map((row, idx) => {
                const matched = inventory.find((i) => i.id === row.ingredientId);
                if (!matched) return null;
                const portionQty = Number(row.qty) || 0;
                const currentStock = Number(matched.currentStock) || 0;
                const afterStock = Math.max(0, Math.round((currentStock - portionQty) * 1000) / 1000);

                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800/80">
                    <span className="font-medium text-stone-200">{matched.name}</span>
                    <span className="font-mono text-[11px]">
                      <span className="text-rose-400 font-bold">-{portionQty} {matched.unit}</span>{" "}
                      <span className="text-stone-500">({currentStock} → {afterStock} {matched.unit})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {currentIngredients.length} ingredient{currentIngredients.length !== 1 ? "s" : ""} in recipe
            </span>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse">
                <Check size={13} /> Recipe saved successfully.
              </span>
            )}
          </div>

          <PrimaryButton
            onClick={handleSave}
            data-testid="recipe-save-btn"
            disabled={!selectedMenuId}
            className="min-h-[44px] px-6 text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            {savedSuccess ? <Check size={16} className="text-emerald-400" /> : null}
            {savedSuccess ? "Recipe Saved!" : "Save Recipe"}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
