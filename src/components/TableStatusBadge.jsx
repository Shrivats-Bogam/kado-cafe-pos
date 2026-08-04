import { TABLE_STATUS } from "../data/defaults.js";

export default function TableStatusBadge({ status, className = "" }) {
  const config = TABLE_STATUS[status] || TABLE_STATUS.available;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs ${config.badgeBg} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
      <span>{config.label}</span>
    </span>
  );
}
