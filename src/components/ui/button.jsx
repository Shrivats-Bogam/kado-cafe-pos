import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const BUTTON_VARIANTS = {
  primary: "bg-amber-500 text-stone-950 hover:bg-amber-400 border-transparent shadow-xs focus:ring-amber-500",
  secondary: "bg-stone-800 text-stone-100 hover:bg-stone-700 border-stone-700 focus:ring-stone-600",
  outline: "bg-transparent text-stone-200 border-stone-700 hover:bg-stone-850 hover:border-stone-600 focus:ring-stone-600",
  ghost: "bg-transparent text-stone-300 border-transparent hover:bg-stone-800 hover:text-stone-100 focus:ring-stone-600",
  danger: "bg-rose-600 text-white hover:bg-rose-500 border-transparent shadow-xs focus:ring-rose-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 border-transparent shadow-xs focus:ring-emerald-500",
  warning: "bg-amber-600 text-stone-950 hover:bg-amber-500 border-transparent focus:ring-amber-500",
  icon: "p-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-amber-400 border-stone-700/60 focus:ring-amber-500",
  floating: "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-xl hover:shadow-amber-500/20 active:scale-95 border-transparent focus:ring-amber-500",
};

const BUTTON_SIZES = {
  xs: "px-2.5 py-1 text-xs rounded-lg gap-1 min-h-[32px]",
  sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[38px]",
  md: "px-4 py-2 text-sm rounded-xl gap-2 min-h-[44px]",
  lg: "px-5 py-2.5 text-base rounded-2xl gap-2.5 min-h-[48px]",
  xl: "px-6 py-3 text-lg rounded-2xl gap-3 min-h-[54px]",
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    className = "",
    disabled = false,
    loading = false,
    type = "button",
    onClick,
    title,
    ...props
  },
  ref
) {
  const variantStyle = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeStyle = variant === "icon" ? "" : (BUTTON_SIZES[size] || BUTTON_SIZES.md);

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-stone-950 disabled:opacity-40 disabled:pointer-events-none disabled:transform-none select-none cursor-pointer ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

// Backward compatible aliases
export function PrimaryButton({ onClick, children, className = "", disabled, type = "button", ...rest }) {
  return (
    <Button
      type={type}
      variant="primary"
      size="md"
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {children}
    </Button>
  );
}

export function IconButton({ onClick, children, className = "", title, ...rest }) {
  return (
    <Button
      variant="icon"
      onClick={onClick}
      title={title}
      className={className}
      {...rest}
    >
      {children}
    </Button>
  );
}
