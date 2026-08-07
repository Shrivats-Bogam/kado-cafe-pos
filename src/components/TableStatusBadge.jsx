import { CheckCircle2, Coffee, ChefHat, Sparkles, AlertTriangle, BookmarkCheck, RefreshCw } from "lucide-react";

const STATUS_CONFIGS = {
  available: {
    label: "Available",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-800/60",
    icon: "🟢",
  },
  occupied: {
    label: "Occupied",
    color: "bg-amber-500/20 text-amber-400 border-amber-800/60",
    icon: "🟠",
  },
  preparing: {
    label: "Waiting Food",
    color: "bg-purple-500/20 text-purple-300 border-purple-800/60",
    icon: "🟣",
  },
  serving: {
    label: "Waiting Food",
    color: "bg-purple-500/20 text-purple-300 border-purple-800/60",
    icon: "🟣",
  },
  ordering: {
    label: "Occupied",
    color: "bg-amber-500/20 text-amber-400 border-amber-800/60",
    icon: "🟠",
  },
  ready: {
    label: "Ready to Serve",
    color: "bg-sky-500/20 text-sky-300 border-sky-800/60",
    icon: "🔵",
  },
  billing: {
    label: "Pending Bill",
    color: "bg-rose-500/20 text-rose-300 border-rose-800/60",
    icon: "🔴",
  },
  payment_pending: {
    label: "Pending Bill",
    color: "bg-rose-500/20 text-rose-300 border-rose-800/60",
    icon: "🔴",
  },
  cleaning: {
    label: "Needs Cleaning",
    color: "bg-rose-500/20 text-rose-300 border-rose-800/60",
    icon: "🔴",
  },
  reserved: {
    label: "Reserved",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-800/60",
    icon: "🟡",
  },
};

export default function TableStatusBadge({ status = "available" }) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.available;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold border ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
