// Reusable UI atoms used everywhere. Pure presentation components.

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-stone-900 border border-stone-800 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "text-amber-500", sub }) {
  return (
    <Card className="p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-stone-400">{label}</span>
        {Icon && <Icon size={16} className={accent} />}
      </div>
      <span className="text-2xl font-semibold text-stone-50 truncate">{value}</span>
      {sub && <span className="text-xs text-stone-500">{sub}</span>}
    </Card>
  );
}

const PILL_TONES = {
  stone: "bg-stone-800 text-stone-300",
  amber: "bg-amber-600/20 text-amber-400",
  rose: "bg-rose-600/20 text-rose-400",
  emerald: "bg-emerald-600/20 text-emerald-400",
  sky: "bg-sky-600/20 text-sky-400",
};

export function Pill({ children, tone = "stone" }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${PILL_TONES[tone] || PILL_TONES.stone}`}>
      {children}
    </span>
  );
}

export function IconButton({ onClick, children, className = "", title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-xl p-2 bg-stone-800 hover:bg-stone-700 active:scale-95 transition ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ onClick, children, className = "", disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 font-medium bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", className = "", ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 ${className}`}
      {...rest}
    />
  );
}

// Full-screen modal shell with backdrop + center-card; closes on backdrop click.
export function Modal({ children, onClose, className = "" }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <Card className={`w-full sm:max-w-md p-5 my-4 sm:my-0 ${className}`}>{children}</Card>
    </div>
  );
}

// Inline two-tone header for modals/dialogs.
export function ModalHeader({ title, icon: Icon, onClose }) {
  return (
    <div className="flex justify-between items-center">
      <h3 className="font-serif text-lg text-stone-50 flex items-center gap-2">
        {Icon && <Icon size={17} className="text-amber-500" />}
        {title}
      </h3>
      <IconButton onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </IconButton>
    </div>
  );
}
