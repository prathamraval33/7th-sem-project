import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-400",
  accent: "bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-300",
  secondary:
    "bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-300",
  outline:
    "bg-transparent text-neutral-800 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-300",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-300",
  danger: "bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-300",
};

const SIZE_CLASSES = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2",
};

const Button = forwardRef(
  ({ variant = "primary", size = "md", className = "", disabled, isLoading = false, children, ...props }, ref) => {
    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
