// EmptyState — Friendly zero-content placeholder (§4.7).
// Centered icon + headline + body text + optional CTA button.

export default function EmptyState({ icon: Icon, title, text, actionLabel, onAction, positive }) {
  return (
    <div className="cd-empty-state">
      {Icon && (
        <Icon
          className="cd-empty-state__icon"
          size={40}
          style={positive ? { color: "var(--cd-success)" } : undefined}
        />
      )}
      <div className="cd-empty-state__title">{title}</div>
      {text && <div className="cd-empty-state__text">{text}</div>}
      {actionLabel && onAction && (
        <button className="cd-btn cd-btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
