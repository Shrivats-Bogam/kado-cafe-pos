import { useMemo } from "react";
import { Package, AlertTriangle, XCircle, DollarSign, TrendingDown, ShoppingCart, AlertCircle, UtensilsCrossed } from "lucide-react";
import { Card } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function InventoryDashboard({ 
  inventory = [], 
  recipes = {}, 
  menuItems = [],
  inventoryLogs = [],
  onEditMenuItem
}) {
  const kpis = useMemo(() => {
    let totalProducts = inventory.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;

    inventory.forEach((item) => {
      const stock = item.currentStock || 0;
      const min = item.minStock || 0;
      const price = item.costPrice || 0;

      totalValue += stock * price;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= min) {
        lowStockCount++;
      }
    });

    // Consumption Today
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayConsumptionCost = 0;
    
    // Purchases Last 7 Days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let purchasesThisWeekCost = 0;

    inventoryLogs.forEach((log) => {
      const logDate = (log.date || "").slice(0, 10);
      if (logDate === todayStr && log.type === "Sale") {
        todayConsumptionCost += Math.abs(log.cost || 0);
      }

      if (log.type === "Purchase" && log.date >= sevenDaysAgo) {
        purchasesThisWeekCost += Math.abs(log.cost || 0);
      }
    });

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalValue,
      todayConsumptionCost,
      purchasesThisWeekCost
    };
  }, [inventory, inventoryLogs]);

  // Shortage Intelligence: Find Menu 3.0 items affected by low/out-of-stock ingredients (PART 16, 17, 18)
  const affectedMenuItems = useMemo(() => {
    const outOfStockIds = new Set(inventory.filter((i) => (i.currentStock || 0) <= 0).map((i) => i.id));
    const lowStockIds = new Set(inventory.filter((i) => (i.currentStock || 0) > 0 && (i.currentStock || 0) <= (i.minStock || 0)).map((i) => i.id));

    if (outOfStockIds.size === 0 && lowStockIds.size === 0) return [];

    const affected = [];
    menuItems.forEach((m) => {
      const itemRecipe = recipes[m.id];
      if (itemRecipe && Array.isArray(itemRecipe)) {
        const hasOut = itemRecipe.some((r) => outOfStockIds.has(r.ingredientId));
        const hasLow = itemRecipe.some((r) => lowStockIds.has(r.ingredientId));

        if (hasOut || hasLow) {
          affected.push({
            menuItem: m,
            status: hasOut ? "Out of Stock Shortage" : "Low Stock Warning",
            isSevere: hasOut
          });
        }
      }
    });

    return affected;
  }, [inventory, recipes, menuItems]);

  return (
    <div className="flex flex-col gap-4">
      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Products</span>
            <Package size={16} className="text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-stone-50 font-serif">{kpis.totalProducts}</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle size={16} />
          </div>
          <span className="text-2xl font-bold text-amber-400 font-serif">{kpis.lowStockCount}</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
            <XCircle size={16} />
          </div>
          <span className="text-2xl font-bold text-rose-400 font-serif">{kpis.outOfStockCount}</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Value</span>
            <DollarSign size={16} />
          </div>
          <span className="text-lg font-bold text-emerald-400 font-serif">{currency(kpis.totalValue)}</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Usage</span>
            <TrendingDown size={16} />
          </div>
          <span className="text-lg font-bold text-sky-300 font-mono">{currency(kpis.todayConsumptionCost)}</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Purchases (7d)</span>
            <ShoppingCart size={16} />
          </div>
          <span className="text-lg font-bold text-purple-300 font-mono">{currency(kpis.purchasesThisWeekCost)}</span>
        </Card>
      </div>

      {/* Shortage Intelligence Panel (PART 16, 17, 18) */}
      {affectedMenuItems.length > 0 && (
        <Card className="p-4 bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3 rounded-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <AlertCircle size={16} /> Menu Shortage Intelligence ({affectedMenuItems.length} Menu Items Affected)
            </h3>
            <span className="text-[11px] text-amber-400/90 italic">Review affected items below</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {affectedMenuItems.map(({ menuItem, status, isSevere }) => (
              <div
                key={menuItem.id}
                className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-stone-100 flex items-center gap-1">
                    <UtensilsCrossed size={12} className="text-amber-400" /> {menuItem.name}
                  </span>
                  <span className={`text-[10px] font-bold block mt-0.5 ${isSevere ? "text-rose-400" : "text-amber-400"}`}>
                    {status}
                  </span>
                </div>

                {onEditMenuItem && menuItem.available && (
                  <button
                    type="button"
                    onClick={() => onEditMenuItem(menuItem.id, { available: false })}
                    className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold transition cursor-pointer"
                    title="Mark unavailable in Menu Management"
                  >
                    Mark Unavailable
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
