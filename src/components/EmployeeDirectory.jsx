import { useState } from "react";
import { Search, UserPlus, Edit2, ShieldAlert, ShieldCheck, KeyRound } from "lucide-react";
import { Card, Pill, PrimaryButton, TextInput, ConfirmDialog } from "./ui.jsx";

const ROLE_TONES = {
  Owner: "amber",
  Manager: "purple",
  Cashier: "sky",
  Kitchen: "rose",
  Waiter: "emerald",
  Staff: "stone",
};

export function EmployeeDirectory({ employees, onAdd, onEdit, onToggleStatus, isOwner }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmToggle, setConfirmToggle] = useState(null);

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone && emp.phone.includes(search));
    const matchesRole = roleFilter === "all" || emp.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, phone..."
              className="pl-9"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="min-h-[44px] rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen">Kitchen</option>
            <option value="waiter">Waiter</option>
          </select>
        </div>

        {isOwner && (
          <PrimaryButton onClick={onAdd} className="shrink-0 w-full sm:w-auto">
            <UserPlus size={16} />
            <span>Add Employee</span>
          </PrimaryButton>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-stone-800 text-xs font-semibold text-stone-400">
              <th className="py-3 px-2">Employee</th>
              <th className="py-3 px-2">ID</th>
              <th className="py-3 px-2">Role</th>
              <th className="py-3 px-2">Department</th>
              <th className="py-3 px-2">PIN</th>
              <th className="py-3 px-2">Status</th>
              {isOwner && <th className="py-3 px-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500 text-sm">
                  No employees found.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 text-xs">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-amber-500 text-xs">
                        {emp.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-100">{emp.name}</span>
                        <span className="text-[10px] text-stone-500">{emp.email || emp.phone || "No contact"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono text-stone-400">{emp.employeeId}</td>
                  <td className="py-3 px-2">
                    <Pill tone={ROLE_TONES[emp.role] || "stone"}>{emp.role}</Pill>
                  </td>
                  <td className="py-3 px-2 text-stone-300">{emp.department}</td>
                  <td className="py-3 px-2 font-mono text-stone-400">
                    <span className="flex items-center gap-1">
                      <KeyRound size={12} className="text-stone-500" />
                      {emp.pin ? "****" : "None"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <Pill tone={emp.status === "active" ? "emerald" : "rose"}>
                      {emp.status === "active" ? "Active" : "Disabled"}
                    </Pill>
                  </td>
                  {isOwner && (
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(emp)}
                          className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100"
                          title="Edit Employee"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmToggle(emp)}
                          className={`p-2 rounded-lg ${
                            emp.status === "active"
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          }`}
                          title={emp.status === "active" ? "Disable Account" : "Enable Account"}
                        >
                          {emp.status === "active" ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmToggle && (
        <ConfirmDialog
          title={`${confirmToggle.status === "active" ? "Disable" : "Enable"} ${confirmToggle.name}?`}
          message={
            confirmToggle.status === "active"
              ? "Disabled employees will be blocked from logging into the POS system."
              : "Enabling this account will restore PIN login access."
          }
          confirmLabel={confirmToggle.status === "active" ? "Disable Account" : "Enable Account"}
          isDanger={confirmToggle.status === "active"}
          onConfirm={() => {
            onToggleStatus(confirmToggle.id);
            setConfirmToggle(null);
          }}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </Card>
  );
}
