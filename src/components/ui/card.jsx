export function Card({ children, className = "", onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-stone-900 border border-stone-800 shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "text-amber-400", sub, className = "" }) {
  return (
    <Card className={`p-4 flex flex-col gap-1 min-w-0 border-stone-800 bg-stone-900 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-stone-400 font-semibold">{label}</span>
        {Icon && <Icon size={16} className={accent} />}
      </div>
      <span className="text-2xl font-bold text-stone-50 truncate tracking-tight">{value}</span>
      {sub && <span className="text-xs text-stone-400 font-medium">{sub}</span>}
    </Card>
  );
}
