import { useState } from "react";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Card, Pill, PrimaryButton } from "./ui.jsx";

export function ShiftManager({ employees, shifts, onClockIn, onClockOut, currentUser }) {
  const [selectedEmpId, setSelectedEmpId] = useState(currentUser?.id || employees[0]?.id || "");

  const activeShift = shifts.find(s => s.employeeId === selectedEmpId && s.status === "On Shift");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-4 flex flex-col gap-4">
        <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          Shift Clock-In / Out
        </h3>

        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1 block">Select Employee</label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>

        <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-xs text-stone-400">Current Status</span>
          <Pill tone={activeShift ? "emerald" : "stone"}>
            {activeShift ? "On Shift" : "Off Duty"}
          </Pill>

          {activeShift ? (
            <PrimaryButton
              onClick={() => onClockOut(activeShift.id)}
              className="mt-3 bg-rose-600 hover:bg-rose-500 text-white w-full"
            >
              <LogOut size={16} />
              <span>Clock Out</span>
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() => onClockIn(selectedEmpId)}
              className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white w-full"
            >
              <LogIn size={16} />
              <span>Clock In</span>
            </PrimaryButton>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2 p-4 flex flex-col gap-4">
        <h3 className="font-serif text-lg font-bold text-stone-50">Recent Shifts & Attendance</h3>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-stone-800 text-xs font-semibold text-stone-400">
                <th className="py-2 px-2">Employee</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Clock In</th>
                <th className="py-2 px-2">Clock Out</th>
                <th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-500 text-sm">
                    No active or past shifts recorded today.
                  </td>
                </tr>
              ) : (
                shifts.slice(0, 10).map((sh) => (
                  <tr key={sh.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 text-xs">
                    <td className="py-3 px-2 font-bold text-stone-200">{sh.employeeName}</td>
                    <td className="py-3 px-2 text-stone-400">{sh.role}</td>
                    <td className="py-3 px-2 text-stone-300">
                      {new Date(sh.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-2 text-stone-300">
                      {sh.endTime ? new Date(sh.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Pill tone={sh.status === "On Shift" ? "emerald" : "stone"}>{sh.status}</Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
