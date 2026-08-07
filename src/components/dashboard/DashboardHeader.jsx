import { useMemo } from "react";
import { Sparkles, Activity, Calendar } from "lucide-react";

export function DashboardHeader({ user, cafeName = "Kado Cafe" }) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const userName = user?.name || "Owner";

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />

      <div>
        <div className="flex items-center gap-2 text-stone-400 text-xs font-medium">
          <Calendar size={13} className="text-amber-400" />
          <span>{formattedDate}</span>
          <span>•</span>
          <span className="text-stone-300 font-semibold">{cafeName}</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-50 tracking-tight mt-1 flex items-center gap-2">
          <span>👋 {greeting}, {userName}</span>
        </h1>
        
        <p className="text-xs text-stone-400 mt-1">
          Here is how your café is performing today. Real-time metrics updated live.
        </p>
      </div>

      {/* Operational Status Pill */}
      <div className="flex items-center gap-2 bg-stone-950/80 border border-stone-800 px-3.5 py-2 rounded-xl shrink-0 shadow-inner">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="text-left">
          <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">System Status</p>
          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <Activity size={12} /> Live & Operational
          </p>
        </div>
      </div>
    </div>
  );
}
