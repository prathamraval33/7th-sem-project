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
        className={`rounded-md border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400
          bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
          ${error ? "border-error-500 focus:ring-error-300" : "border-neutral-300 focus:ring-brand-300"}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error-600">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
