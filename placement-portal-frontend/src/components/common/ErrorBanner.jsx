import { AlertTriangle, X } from "lucide-react";

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
