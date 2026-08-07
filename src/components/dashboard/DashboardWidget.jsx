import { Card } from "../ui.jsx";

export function DashboardWidget({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = "",
  empty = false,
  emptyMessage = "No data available yet.",
  emptyAction,
}) {
  return (
    <Card className={`p-5 flex flex-col gap-4 border border-stone-800 bg-stone-900 shadow-md hover:border-stone-750 transition-all duration-200 ${className}`}>
      {/* Header */}
      {(title || action) && (
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} className="text-amber-400 shrink-0" />}
            <div>
              {title && <h3 className="font-semibold text-stone-100 text-base leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Body Content / Empty State */}
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-500 my-2 space-y-3">
          {Icon && (
            <div className="w-12 h-12 rounded-full bg-stone-800/60 border border-stone-700/60 flex items-center justify-center text-stone-400">
              <Icon size={22} />
            </div>
          )}
          <p className="text-xs max-w-xs">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </Card>
  );
}
