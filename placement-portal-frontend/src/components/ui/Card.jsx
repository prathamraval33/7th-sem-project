export default function Card({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component
      className={`rounded-xl border border-border bg-card shadow-sm card-hover p-6 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
