export function Tabs({ activeTab, onChange, items = [], className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs ${className}`}>
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs scale-105"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700"
            }`}
          >
            {item.icon && <item.icon size={14} />}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                isActive ? "bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-400"
              }`}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
