export function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-stone-800 bg-stone-900 shadow-md">
      <table className={`w-full text-left border-collapse text-xs ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = "" }) {
  return (
    <thead className={`bg-stone-850 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px] ${className}`}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className = "", onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-stone-800/60 hover:bg-stone-850/60 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "", header = false }) {
  const Tag = header ? "th" : "td";
  return (
    <Tag className={`p-3.5 ${className}`}>
      {children}
    </Tag>
  );
}
