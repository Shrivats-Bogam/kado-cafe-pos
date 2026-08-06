import { useState } from "react";
import { Users, Shield, Clock, Activity } from "lucide-react";
import { useToaster } from "../components/Toaster.jsx";

import { EmployeeDashboard } from "../components/EmployeeDashboard.jsx";
import { EmployeeDirectory } from "../components/EmployeeDirectory.jsx";
import { EmployeeModal } from "../components/EmployeeModal.jsx";
import { RolePermissions } from "../components/RolePermissions.jsx";
import { ShiftManager } from "../components/ShiftManager.jsx";
import { ActivityLog } from "../components/ActivityLog.jsx";

const TABS = [
  { id: "directory", label: "Directory", icon: Users },
  { id: "permissions", label: "RBAC Permissions", icon: Shield },
  { id: "shifts", label: "Shifts & Attendance", icon: Clock },
  { id: "logs", label: "Activity Logs", icon: Activity },
];

export default function EmployeesView({ state, dispatch, currentUser }) {
  const [activeTab, setActiveTab] = useState("directory");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toaster = useToaster();

  const { employees = [], rolePermissions = {}, shifts = [], activityLogs = [] } = state;
  const isOwner = currentUser?.role === "Owner";

  const handleSaveEmployee = (empData) => {
    try {
      if (empData.id) {
        dispatch("editEmployee", empData);
        toaster.push("Employee updated successfully.", "success");
      } else {
        dispatch("addEmployee", empData);
        toaster.push("Employee added successfully.", "success");
      }
    } catch (err) {
      toaster.push(err.message || "Failed to save employee.", "warn");
    }
  };

  const handleToggleStatus = (empId) => {
    dispatch("toggleEmployeeStatus", empId);
    toaster.push("Employee status updated.", "info");
  };

  const handleSavePermissions = (role, perms) => {
    dispatch("updateRolePermissions", role, perms);
    toaster.push(`Permissions saved for ${role}`, "success");
  };

  const handleClockIn = (empId) => {
    dispatch("clockInShift", empId);
    toaster.push("Shift started.", "success");
  };

  const handleClockOut = (shiftId) => {
    dispatch("clockOutShift", shiftId);
    toaster.push("Shift ended.", "info");
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 overflow-hidden">
      {/* Top Header & Sub-Tabs */}
      <div className="shrink-0 bg-stone-950 border-b border-stone-800 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-stone-50">Employee Control Center</h2>
          <p className="text-xs text-stone-400">Manage staff profiles, role permissions, shifts, and audit logs.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? "bg-amber-500 text-stone-950 shadow-md"
                    : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100"
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        <EmployeeDashboard employees={employees} shifts={shifts} />

        {activeTab === "directory" && (
          <EmployeeDirectory
            employees={employees}
            onAdd={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            onEdit={(emp) => {
              setEditingEmployee(emp);
              setIsModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            isOwner={isOwner}
          />
        )}

        {activeTab === "permissions" && (
          <RolePermissions
            rolePermissions={rolePermissions}
            onSavePermissions={handleSavePermissions}
            isOwner={isOwner}
          />
        )}

        {activeTab === "shifts" && (
          <ShiftManager
            employees={employees}
            shifts={shifts}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            currentUser={currentUser}
          />
        )}

        {activeTab === "logs" && (
          <ActivityLog activityLogs={activityLogs} />
        )}
      </div>

      {isModalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
