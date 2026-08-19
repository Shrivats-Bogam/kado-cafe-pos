import { useState } from "react";
import { Package, BookOpen, History, PlusCircle } from "lucide-react";
import InventoryDashboard from "../components/InventoryDashboard.jsx";
import InventoryMaster from "../components/InventoryMaster.jsx";
import RecipeBuilder from "../components/RecipeBuilder.jsx";
import StockAdjustmentModal from "../components/StockAdjustmentModal.jsx";
import InventoryHistory from "../components/InventoryHistory.jsx";

export default function InventoryView({ 
  inventory = [], 
  recipes = {}, 
  inventoryLogs = [], 
  menuItems = [], 
  onAddInventory, 
  onEditInventory, 
  onDeleteInventory, 
  onSaveRecipe, 
  onAddPurchase, 
  onAdjustStock 
}) {
  const [activeTab, setActiveTab] = useState("stock"); // "stock", "recipes", "history"
  const [showStockModal, setShowStockModal] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <Package className="text-amber-500" size={22} /> Inventory & Recipe Management
          </h2>
          <p className="text-xs text-stone-400">Track stock levels, configure ingredient recipes & automate inventory deduction</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0">
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "stock" 
                  ? "bg-amber-500 text-stone-950 shadow-md" 
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Package size={15} /> Stock Master
            </button>
            
            <button
              onClick={() => setActiveTab("recipes")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "recipes" 
                  ? "bg-amber-500 text-stone-950 shadow-md" 
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <BookOpen size={15} /> Recipe Builder
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "history" 
                  ? "bg-amber-500 text-stone-950 shadow-md" 
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <History size={15} /> Stock Logs
            </button>
          </div>

          <button
            onClick={() => setShowStockModal(true)}
            data-testid="purchase-adjust-modal-btn"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition shrink-0"
          >
            <PlusCircle size={16} /> Purchase / Adjust
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "stock" && (
        <div className="flex flex-col gap-5">
          <InventoryDashboard inventory={inventory} inventoryLogs={inventoryLogs} />
          <InventoryMaster 
            inventory={inventory} 
            onAdd={onAddInventory} 
            onEdit={onEditInventory} 
            onDelete={onDeleteInventory} 
          />
        </div>
      )}

      {activeTab === "recipes" && (
        <RecipeBuilder 
          menuItems={menuItems} 
          inventory={inventory} 
          recipes={recipes} 
          onSaveRecipe={onSaveRecipe} 
        />
      )}

      {activeTab === "history" && (
        <InventoryHistory inventoryLogs={inventoryLogs} />
      )}

      {/* Purchase / Stock Adjustment Modal */}
      {showStockModal && (
        <StockAdjustmentModal 
          inventory={inventory} 
          onAddPurchase={onAddPurchase} 
          onAdjustStock={onAdjustStock} 
          onClose={() => setShowStockModal(false)} 
        />
      )}
    </div>
  );
}
