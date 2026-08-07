import { useState, useRef, useEffect } from "react";

export function DropdownMenu({ trigger, children, align = "right", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-56 rounded-xl bg-stone-900 border border-stone-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-180 focus:outline-none ${className}`}
          role="menu"
          aria-orientation="vertical"
        >
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  shortcut,
  icon: Icon,
  className = "",
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        if (onClick) onClick(e);
      }}
      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors select-none cursor-pointer ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-transparent text-stone-500"
          : danger
          ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          : "text-stone-200 hover:bg-stone-800 hover:text-amber-400"
      } ${className}`}
      role="menuitem"
    >
      <div className="flex items-center gap-2 truncate">
        {Icon && <Icon size={14} className="shrink-0" />}
        <span className="truncate">{children}</span>
      </div>
      {shortcut && <span className="text-[10px] text-stone-500 font-mono ml-2 shrink-0">{shortcut}</span>}
    </button>
  );
}

export function DropdownMenuDivider() {
  return <div className="h-px bg-stone-800 my-1" />;
}
