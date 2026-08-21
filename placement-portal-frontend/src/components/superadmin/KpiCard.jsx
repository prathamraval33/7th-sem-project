// KpiCard — Summary metric card (§4.1).
// Displays an uppercase label, a large Fira Code number,
// and an optional trend percentage with directional arrow.
import { TrendingUp, TrendingDown } from "lucide-react";

export default function KpiCard({
  label,
  value,
  trend,          // { direction: "up" | "down", percentage: string }
  warning,        // if true, value rendered in amber
  onClick,        // if provided, card becomes clickable
}) {
  const clickable = Boolean(onClick);
  return (
    <div
      className={`cd-kpi-card ${clickable ? "cd-kpi-card--clickable" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="cd-kpi-card__label">{label}</div>
      <div className={`cd-kpi-card__value ${warning ? "cd-kpi-card__value--warning" : ""}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {trend && (
        <div className={`cd-kpi-card__trend ${trend.direction === "up" ? "cd-kpi-card__trend--up" : "cd-kpi-card__trend--down"}`}>
          {trend.direction === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend.percentage}</span>
        </div>
      )}
    </div>
  );
}
