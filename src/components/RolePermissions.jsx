import { useState } from "react";
import { Shield, Check, X, Save } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";

const MODULES = [
  { id: "tables", label: "Tables View" },
  { id: "parcel", label: "Parcel Orders" },
  { id: "kitchen", label: "Kitchen KDS" },
  { id: "menu", label: "Menu Management" },
  { id: "customers", label: "Customer CRM" },
  { id: "insights", label: "AI Insights" },
  { id: "reports", label: "Business Reports" },
  { id: "inventory", label: "Inventory & Recipes" },
  { id: "employees", label: "Employee Management" },
  { id: "settings", label: "System Settings" },
];

const ROLES = ["Owner", "Manager", "Cashier", "Staff", "Waiter", "Kitchen"];

export function RolePermissions({ rolePermissions, onSavePermissions, isOwner }) {
  const [matrix, setMatrix] = useState(rolePermissions || {});

  const handleToggle = (role, moduleId) => {
    if (!isOwner || role === "Owner") return; // Owner permissions cannot be revoked
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [moduleId]: !prev[role]?.[moduleId],
      },
    }));
  };

  const handleSave = () => {
    Object.entries(matrix).forEach(([role, perms]) => {
      onSavePermissions(role, perms);
    });
  };

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
            <Shield size={18} className="text-amber-500" />
            Role Permission Matrix (RBAC)
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure access rights across modules. Owner permissions are fixed for safety.
          </p>
        </div>
        {isOwner && (
          <PrimaryButton onClick={handleSave}>
            <Save size={16} />
            <span>Save Matrix</span>
          </PrimaryButton>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-stone-800 text-xs font-semibold text-stone-400">
              <th className="py-3 px-2">Module / Feature</th>
              {ROLES.map((r) => (
                <th key={r} className="py-3 px-2 text-center">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod) => (
              <tr key={mod.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 text-xs">
                <td className="py-3 px-2 font-medium text-stone-200">{mod.label}</td>
                {ROLES.map((role) => {
                  const allowed = matrix[role]?.[mod.id] ?? (role === "Owner");
                  return (
                    <td key={role} className="py-3 px-2 text-center">
                      <button
                        type="button"
                        disabled={!isOwner || role === "Owner"}
                        onClick={() => handleToggle(role, mod.id)}
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                          allowed
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-stone-800 text-stone-600 border border-stone-700"
                        } ${(!isOwner || role === "Owner") ? "cursor-default opacity-80" : "hover:scale-110"}`}
                      >
                        {allowed ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
