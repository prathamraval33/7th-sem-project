export default function Card({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component
      className={`rounded-lg border border-neutral-200 bg-white shadow-soft p-5 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
