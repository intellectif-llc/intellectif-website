import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  href?: string;
  external?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  href,
  external = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = `inline-flex items-center justify-center font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6bdcc0] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`;

  const variantClasses = {
    primary: `bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] text-[#051028] font-semibold hover:scale-105 hover:shadow-lg shadow-lg`,
    secondary: `bg-[#0ea5e9] text-white font-semibold hover:bg-[#22d3ee] hover:scale-105 shadow-lg`,
    outline: `border-2 border-[#6bdcc0] text-[#6bdcc0] bg-transparent font-semibold hover:bg-[#6bdcc0] hover:text-[#051028] hover:scale-105 shadow-lg`,
    ghost: `text-[#6bdcc0] bg-transparent font-medium hover:bg-[#6bdcc0] hover:bg-opacity-10 hover:text-[#22d3ee]`,
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm rounded-md",
    md: "px-6 py-3 text-base rounded-lg",
    lg: "px-8 py-4 text-lg rounded-xl",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  const content = (
    <>
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {content}
        </a>
      );
    } else {
      return (
        <a href={href} className={classes}>
          {content}
        </a>
      );
    }
  }

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
}
