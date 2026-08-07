import { useEffect } from "react";
import { X } from "lucide-react";
import { Card } from "./card.jsx";
import { IconButton } from "./button.jsx";

export function Modal({ children, onClose, className = "" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs overflow-y-auto flex items-start sm:items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <Card className={`w-full sm:max-w-md p-5 my-4 sm:my-0 shadow-2xl animate-in zoom-in-95 duration-150 border-stone-800 bg-stone-900 ${className}`}>
        {children}
      </Card>
    </div>
  );
}

export function ModalHeader({ title, icon: Icon, onClose }) {
  return (
    <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4">
      <h3 className="font-serif text-lg font-bold text-stone-50 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-amber-400" />}
        {title}
      </h3>
      {onClose && (
        <IconButton onClick={onClose} aria-label="Close modal">
          <X size={16} />
        </IconButton>
      )}
    </div>
  );
}
