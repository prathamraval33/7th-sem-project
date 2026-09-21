const VARIANT_CLASSES = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  error: "bg-error-50 text-error-700",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent-50 text-accent-700",
  outline: "bg-transparent text-slate-700 border border-slate-300",
  info: "bg-blue-50 text-blue-700 border border-blue-200/50",
};

export default function Badge({ variant = "neutral", className = "", children }) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
