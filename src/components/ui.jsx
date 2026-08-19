import { useState } from "react";

// Reusable UI atoms used everywhere. Pure presentation components.

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-stone-900 border border-stone-800 shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "text-amber-500", sub }) {
  return (
    <Card className="p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-stone-400 font-bold">{label}</span>
        {Icon && <Icon size={16} className={accent} />}
      </div>
      <span className="text-2xl font-semibold text-stone-50 truncate font-serif">{value}</span>
      {sub && <span className="text-xs text-stone-500">{sub}</span>}
    </Card>
  );
}

const PILL_TONES = {
  stone: "bg-stone-800 text-stone-300 border-stone-700",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export function Pill({ children, tone = "stone" }) {
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${PILL_TONES[tone] || PILL_TONES.stone}`}>
      {children}
    </span>
  );
}

export function IconButton({ onClick, children, className = "", title, ariaLabel, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      className={`min-h-[44px] min-w-[44px] rounded-xl p-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 transition flex items-center justify-center text-stone-300 hover:text-stone-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ onClick, children, className = "", disabled, type = "button", ariaLabel, ...rest }) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e) => {
    if (isClicked) {
      if (type !== "submit") e.preventDefault();
      return;
    }
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500); // 500ms debounce protection
    if (onClick) onClick(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled} // Removed `|| isClicked` to prevent canceling native form submissions
      aria-label={ariaLabel}
      className={`min-h-[44px] rounded-xl px-4 py-2.5 font-bold text-xs bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md ${isClicked ? "opacity-70 pointer-events-none" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ onClick, children, className = "", disabled, type = "button", ariaLabel, ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`min-h-[44px] rounded-xl px-4 py-2.5 font-bold text-xs bg-stone-800 text-stone-200 hover:bg-stone-700 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 border border-stone-700 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", className = "", ariaLabel, ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      className={`w-full min-h-[44px] rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 ${className}`}
      {...rest}
    />
  );
}

// Full-screen modal shell with backdrop + center-card; closes on backdrop click.
export function Modal({ children, onClose, className = "" }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <Card className={`w-full sm:max-w-md p-5 my-4 sm:my-0 ${className}`}>{children}</Card>
    </div>
  );
}

// Inline two-tone header for modals/dialogs.
export function ModalHeader({ title, icon: Icon, onClose }) {
  return (
    <div className="flex justify-between items-center border-b border-stone-800 pb-3">
      <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-amber-500" />}
        {title}
      </h3>
      <IconButton onClick={onClose} ariaLabel="Close Modal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </IconButton>
    </div>
  );
}

// Reusable Empty State component
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center bg-stone-900 border border-stone-800 rounded-2xl">
      {Icon && <Icon size={44} className="text-stone-600 mb-3" />}
      <h4 className="font-serif text-base font-bold text-stone-200">{title}</h4>
      {description && <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <PrimaryButton onClick={onAction} className="mt-2">
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
}

// Reusable Confirmation Dialog
export function ConfirmDialog({ title = "Are you sure?", message = "This action cannot be undone.", confirmLabel = "Delete", cancelLabel = "Cancel", isDanger = true, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-5 bg-stone-900 border border-stone-800 flex flex-col gap-4 shadow-2xl">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-50">{title}</h3>
          <p className="text-xs text-stone-400 mt-1">{message}</p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30"
                : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// Reusable Skeleton Loader
export function SkeletonLoader({ count = 3, height = "h-24" }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`w-full ${height} bg-stone-900/80 border border-stone-800 rounded-2xl animate-pulse p-4 flex flex-col gap-2`}>
          <div className="h-4 w-1/3 bg-stone-800 rounded" />
          <div className="h-6 w-2/3 bg-stone-800 rounded" />
          <div className="h-3 w-1/2 bg-stone-800/60 rounded" />
        </div>
      ))}
    </div>
  );
}
