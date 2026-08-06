import { useMemo } from "react";
import { Package, AlertTriangle, XCircle, DollarSign, TrendingDown, ShoppingCart } from "lucide-react";
import { Card } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function InventoryDashboard({ inventory = [], inventoryLogs = [] }) {
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

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= min) {
        lowStockCount++;
      }
    });

    // Consumption Today
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayConsumptionCost = 0;
    
    // Purchases This Week (last 7 days)
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-stone-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Products</span>
          <Package size={16} className="text-amber-500" />
        </div>
        <span className="text-2xl font-bold text-stone-50 font-serif">{kpis.totalProducts}</span>
      </Card>

      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-amber-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock</span>
          <AlertTriangle size={16} />
        </div>
        <span className="text-2xl font-bold text-amber-400 font-serif">{kpis.lowStockCount}</span>
      </Card>

      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-rose-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
          <XCircle size={16} />
        </div>
        <span className="text-2xl font-bold text-rose-400 font-serif">{kpis.outOfStockCount}</span>
      </Card>

      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-emerald-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Value</span>
          <DollarSign size={16} />
        </div>
        <span className="text-xl font-bold text-emerald-400 font-serif">{currency(kpis.totalValue)}</span>
      </Card>

      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-sky-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Today's Usage</span>
          <TrendingDown size={16} />
        </div>
        <span className="text-xl font-bold text-sky-300 font-mono">{currency(kpis.todayConsumptionCost)}</span>
      </Card>

      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
        <div className="flex items-center justify-between text-purple-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Purchases (7d)</span>
          <ShoppingCart size={16} />
        </div>
        <span className="text-xl font-bold text-purple-300 font-mono">{currency(kpis.purchasesThisWeekCost)}</span>
      </Card>
    </div>
  );
}
