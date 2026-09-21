import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity animate-in fade-in" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-soft border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="font-heading text-lg font-semibold text-neutral-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[calc(85vh-8rem)] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4 bg-slate-50/50">{footer}</div>}
      </div>
    </div>
  );
}
