import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const TOAST_STYLES = {
  success: "bg-emerald-950/90 text-emerald-200 border-emerald-800/80",
  error: "bg-rose-950/90 text-rose-200 border-rose-800/80",
  info: "bg-sky-950/90 text-sky-200 border-sky-800/80",
  warning: "bg-amber-950/90 text-amber-200 border-amber-800/80",
};

export function Toast({ title, message, type = "info", onClose, className = "" }) {
  const Icon = TOAST_ICONS[type] || TOAST_ICONS.info;
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 text-xs ${style} ${className}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold text-sm tracking-tight">{title}</p>}
        {message && <p className="opacity-90 leading-relaxed mt-0.5">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100 p-1 rounded-lg shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
