import Card from "../ui/Card";

// Tailwind's content scanner only picks up complete, static class strings —
// dynamically built names like `bg-${accent}-50` would silently produce no
// CSS, so every accent variant is spelled out in full here.
const ACCENT_CLASSES = {
  brand: { bg: "bg-brand-50", text: "text-brand-600" },
  accent: { bg: "bg-accent-50", text: "text-accent-600" },
  success: { bg: "bg-success-50", text: "text-success-600" },
  warning: { bg: "bg-warning-50", text: "text-warning-600" },
  error: { bg: "bg-error-50", text: "text-error-600" },
};

export default function StatCard({ label, value, icon: Icon, accent = "brand" }) {
  const accentClasses = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.brand;

  return (
    <Card className="flex items-center gap-4">
      {Icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${accentClasses.bg}`}>
          <Icon size={22} className={accentClasses.text} />
        </div>
      )}
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="font-heading text-2xl font-semibold text-neutral-900">{value}</p>
      </div>
    </Card>
  );
}
