import React from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900 border border-transparent",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent",
  outline: "bg-transparent text-slate-800 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-500 text-white hover:bg-red-600 border border-transparent",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent",
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
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
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
