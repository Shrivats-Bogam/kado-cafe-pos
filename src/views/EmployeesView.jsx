import { useState } from "react";
import { Users, Shield, Clock, Activity } from "lucide-react";
import { useToaster } from "../components/Toaster.jsx";
import { getSupabaseClient, isCloudEnabled, adminSetEmployeePin, adminRemoveEmployeePin } from "../lib/storage.js";
import { manageEmployeeCloud } from "../lib/auth.js";

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

  const handleSaveEmployee = async (empData) => {
    try {
      // 1. Client-side duplicate PIN validation with friendly error BEFORE closing modal
      if (empData.pin) {
        const cleanPin = String(empData.pin).trim();
        const conflict = employees.find(e => {
          const isSelf = 
            (empData.id && String(e.id) === String(empData.id)) ||
            (empData.member_id && String(e.id) === String(empData.member_id)) ||
            (empData.employeeId && e.employeeId && e.employeeId === empData.employeeId) ||
            (empData.email && e.email && e.email.toLowerCase().trim() === empData.email.toLowerCase().trim());
          if (isSelf) return false;
          return String(e.pin).trim() === cleanPin && e.status !== "disabled" && e.status !== "Inactive";
        });
        if (conflict) {
          throw new Error(`PIN "${cleanPin}" is already assigned to ${conflict.name || "another employee"}. Please choose a different PIN.`);
        }
      }

      const supabase = getSupabaseClient();
      let cloudResult = null;

      // When Owner is logged in and cloud is active, invoke Edge Function
      if (isOwner && isCloudEnabled && supabase) {
        try {
          cloudResult = await manageEmployeeCloud(supabase, {
            action: empData.id ? "update" : "provision",
            member_id: empData.member_id || empData.id,
            name: empData.name,
            email: empData.email,
            role: empData.role,
            department: empData.department,
            pin: empData.pin,
          });
        } catch (cloudErr) {
          console.warn("[kado-cafe] Cloud employee sync warning:", cloudErr.message);
          // Surface error directly if provisioning fails (e.g. duplicate PIN or email)
          if (cloudErr.message.includes("PIN is already assigned") || cloudErr.message.includes("email") || cloudErr.message.includes("Forbidden")) {
            throw cloudErr;
          }
        }
      }

      if (empData.id) {
        dispatch("editEmployee", {
          ...empData,
          ...(cloudResult?.user_id ? { user_id: cloudResult.user_id } : {})
        });
        if (empData.pin && isCloudEnabled) {
          try {
            await adminSetEmployeePin(empData.id, String(empData.pin).trim(), empData.role || "Staff");
          } catch (pinErr) {
            console.warn("[kado-cafe] adminSetEmployeePin notice:", pinErr.message);
          }
        }
        toaster.push("Employee updated successfully.", "success");
      } else {
        const targetId = empData.id || `emp_${Date.now()}`;
        dispatch("addEmployee", {
          ...empData,
          id: targetId,
          ...(cloudResult?.user_id ? { user_id: cloudResult.user_id } : {}),
          ...(cloudResult?.member_id ? { member_id: cloudResult.member_id } : {})
        });
        if (empData.pin && isCloudEnabled) {
          try {
            await adminSetEmployeePin(targetId, String(empData.pin).trim(), empData.role || "Staff");
          } catch (pinErr) {
            console.warn("[kado-cafe] adminSetEmployeePin notice:", pinErr.message);
          }
        }
        if (empData.email && cloudResult?.invite_sent) {
          toaster.push(`Employee added. Invitation sent to ${empData.email}`, "success");
        } else {
          toaster.push("Employee added successfully.", "success");
        }
      }
    } catch (err) {
      toaster.push(err.message || "Failed to save employee.", "warn");
      throw err;
    }
  };

  const handleToggleStatus = async (empId) => {
    try {
      const supabase = getSupabaseClient();
      const targetEmp = employees.find(e => e.id === empId);

      if (isOwner && isCloudEnabled && supabase && targetEmp) {
        try {
          await manageEmployeeCloud(supabase, {
            action: "toggle-status",
            member_id: targetEmp.member_id || targetEmp.id,
          });
        } catch (cloudErr) {
          console.warn("[kado-cafe] Cloud status sync notice:", cloudErr.message);
        }
      }

      // If disabling employee, remove PIN from staff_pins; if enabling, re-register PIN
      if (targetEmp && isCloudEnabled) {
        if (targetEmp.status === "active") {
          try {
            await adminRemoveEmployeePin(empId);
          } catch (pinErr) {
            console.warn("[kado-cafe] adminRemoveEmployeePin notice:", pinErr.message);
          }
        } else if (targetEmp.pin) {
          try {
            await adminSetEmployeePin(empId, String(targetEmp.pin).trim(), targetEmp.role || "Staff");
          } catch (pinErr) {
            console.warn("[kado-cafe] adminSetEmployeePin notice:", pinErr.message);
          }
        }
      }

      dispatch("toggleEmployeeStatus", empId);
      toaster.push("Employee status updated.", "info");
    } catch (err) {
      toaster.push(err.message || "Failed to update employee status.", "warn");
    }
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
