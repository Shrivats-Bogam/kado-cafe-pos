const BADGE_TONES = {
  stone: "bg-stone-800 text-stone-300 border-stone-700",
  amber: "bg-amber-500/20 text-amber-300 border-amber-800/60",
  rose: "bg-rose-500/20 text-rose-300 border-rose-800/60",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-800/60",
  sky: "bg-sky-500/20 text-sky-300 border-sky-800/60",
  purple: "bg-purple-500/20 text-purple-300 border-purple-800/60",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-800/60",
};

export function Badge({ children, tone = "stone", className = "" }) {
  const toneStyle = BADGE_TONES[tone] || BADGE_TONES.stone;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${toneStyle} ${className}`}>
      {children}
    </span>
  );
}

// Backward compatible alias
export function Pill({ children, tone = "stone", className = "" }) {
  return <Badge tone={tone} className={className}>{children}</Badge>;
}
