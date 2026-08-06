import { Activity, Clock } from "lucide-react";
import { Card, Pill } from "./ui.jsx";

const MODULE_TONES = {
  Auth: "amber",
  Billing: "emerald",
  Orders: "sky",
  Inventory: "purple",
  CRM: "rose",
  System: "stone"
};

export function ActivityLog({ activityLogs }) {
  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
        <Activity size={18} className="text-amber-500" />
        System Activity Log
      </h3>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-stone-800 text-xs font-semibold text-stone-400">
              <th className="py-2 px-2">Timestamp</th>
              <th className="py-2 px-2">Employee</th>
              <th className="py-2 px-2">Module</th>
              <th className="py-2 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {activityLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-stone-500 text-sm">
                  No activity logs recorded.
                </td>
              </tr>
            ) : (
              activityLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 text-xs">
                  <td className="py-3 px-2 text-stone-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-2 font-bold text-stone-200">{log.employeeName}</td>
                  <td className="py-3 px-2">
                    <Pill tone={MODULE_TONES[log.module] || "stone"}>{log.module}</Pill>
                  </td>
                  <td className="py-3 px-2 text-stone-300">{log.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
