export function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center p-10 bg-stone-900/60 border border-stone-800 rounded-3xl text-center shadow-xs ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
          <Icon size={28} />
        </div>
      )}
      {title && <h3 className="font-serif text-lg font-bold text-stone-100 mb-1">{title}</h3>}
      {description && <p className="text-xs text-stone-400 max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
