import { useMemo } from "react";
import { AlertTriangle, PackageX } from "lucide-react";
import { Card, Pill } from "../ui.jsx";

export function ReportsInventoryAlerts({ inventory }) {
  const alerts = useMemo(() => {
    const arr = [];
    inventory.forEach((item) => {
      if (item.stock <= 0) {
        arr.push({ id: item.id, name: item.name, status: "Out of Stock", level: "critical" });
      } else if (item.stock <= (item.lowStockThreshold || 10)) {
        arr.push({ id: item.id, name: item.name, status: "Low Stock", level: "warning" });
      }
    });
    return arr;
  }, [inventory]);

  return (
    <Card className="p-4 flex flex-col gap-4 overflow-hidden">
      <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        Inventory Alerts
      </h3>
      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-stone-500 text-sm">
          All stock levels are optimal.
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[250px]">
            <thead>
              <tr className="border-b border-stone-800">
                <th className="py-2 text-xs font-semibold text-stone-400">Ingredient</th>
                <th className="py-2 text-xs font-semibold text-stone-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <td className="py-3 text-sm text-stone-200">{alert.name}</td>
                  <td className="py-3 text-right">
                    <Pill tone={alert.level === "critical" ? "rose" : "amber"}>
                      {alert.status}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
