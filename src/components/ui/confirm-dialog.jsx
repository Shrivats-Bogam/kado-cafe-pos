import { Modal } from "./modal.jsx";
import { Button } from "./button.jsx";

export function ConfirmDialog({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onClose,
}) {
  return (
    <Modal onClose={onClose} className="sm:max-w-sm">
      <div className="space-y-4">
        <h3 className="font-bold text-base text-stone-100">{title}</h3>
        <p className="text-xs text-stone-400 leading-relaxed">{message}</p>
        
        <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
