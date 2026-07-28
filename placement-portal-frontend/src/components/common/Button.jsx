import React from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-sm hover:shadow-accent active:scale-[0.98] border border-transparent hover:brightness-110",
  secondary: "bg-muted text-foreground hover:bg-slate-200 shadow-sm active:scale-[0.98] border border-transparent",
  outline: "bg-transparent text-foreground border border-border hover:border-accent/30 hover:shadow-sm active:scale-[0.98]",
  danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm active:scale-[0.98] border border-transparent",
  ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent active:scale-[0.98]",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled = false,
  type = "button",
  ...props
}) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none group";
  
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
