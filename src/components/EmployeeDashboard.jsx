import { Users, UserCheck, Clock, Award, ShieldAlert, Sparkles } from "lucide-react";
import { StatCard } from "./ui.jsx";

export function EmployeeDashboard({ employees, shifts }) {
  const total = employees.length;
  const active = employees.filter(e => e.status === "active").length;
  const disabled = employees.filter(e => e.status === "disabled").length;
  const onShift = shifts.filter(s => s.status === "On Shift").length;
  const attendancePct = total > 0 ? Math.round((active / total) * 100) : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard label="Total Staff" value={total} icon={Users} accent="text-amber-500" />
      <StatCard label="Active Today" value={active} icon={UserCheck} accent="text-emerald-500" />
      <StatCard label="On Shift Now" value={onShift} icon={Clock} accent="text-sky-500" />
      <StatCard label="Active Status %" value={`${attendancePct}%`} icon={Award} accent="text-purple-500" />
      <StatCard label="Disabled Staff" value={disabled} icon={ShieldAlert} accent="text-rose-500" />
    </div>
  );
}
