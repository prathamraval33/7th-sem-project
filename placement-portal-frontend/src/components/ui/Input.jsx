import { forwardRef } from "react";

const Input = forwardRef(({ label, error, className = "", id, ...props }, ref) => {
  const inputId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`rounded-xl border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
          bg-card transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          ${error ? "border-red-500 focus:ring-red-500" : "border-border"}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error-600">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
