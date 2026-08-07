export function Progress({ value = 0, max = 100, className = "", color = "bg-amber-500" }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full h-2 rounded-full bg-stone-800 overflow-hidden ${className}`}>
      <div
        className={`h-full transition-all duration-300 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
