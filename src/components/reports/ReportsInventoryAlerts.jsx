import { Package, AlertCircle, TrendingDown, DollarSign } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { aggregateInventoryIntelligence } from "../../lib/reportsAggregate.js";

export function ReportsInventoryAlerts({ inventory = [], recipes = {}, inventoryLogs = [], menuItems = [] }) {
  const { totalValuation, lowStockCount, outOfStockCount, purchases7dCost, wastage7dCost, affectedMenuItems } =
    aggregateInventoryIntelligence(inventory, recipes, inventoryLogs, menuItems);

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <Package size={16} className="text-amber-500" /> Inventory & Shortage Intelligence
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Stock Valuation</span>
          <span className="text-sm font-bold text-emerald-400 font-serif">{currency(totalValuation)}</span>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Wastage (7d)</span>
          <span className="text-sm font-bold text-rose-400 font-mono">{currency(wastage7dCost)}</span>
        </div>
      </div>

      <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-stone-500">Stock Alerts</span>
          <span className="text-[10px] text-stone-400 font-mono">
            🟡 {lowStockCount} Low • 🔴 {outOfStockCount} Out
          </span>
        </div>

        {affectedMenuItems.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg text-[11px] text-rose-300 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>{affectedMenuItems.length} Menu 3.0 items affected by stock shortages</span>
          </div>
        )}
      </div>
    </Card>
  );
}
