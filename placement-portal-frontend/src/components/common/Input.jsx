import React, { forwardRef } from "react";

const Input = forwardRef(({ label, error, helperText, className = "", ...props }, ref) => {
  const id = props.id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent ${
          error ? "border-red-500 focus:ring-red-500" : "border-slate-300"
        } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";
export default Input;
