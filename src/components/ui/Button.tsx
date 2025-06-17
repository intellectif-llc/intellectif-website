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
  const baseClasses = `group relative inline-flex items-center justify-center font-bold transition-all duration-500 ease-out focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transform hover:scale-[1.02] hover:-translate-y-2 backdrop-blur-sm`;

  const variantClasses = {
    primary: `text-[#051028] hover:shadow-2xl`,
    secondary: `text-white hover:shadow-2xl`,
    outline: `text-[#6bdcc0] hover:shadow-2xl`,
    ghost: `text-[#6bdcc0] hover:shadow-lg`,
  };

  const sizeClasses = {
    sm: "px-6 py-2 text-sm rounded-xl",
    md: "px-8 py-3 text-base rounded-xl",
    lg: "px-10 py-4 text-lg rounded-2xl",
  };

  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return {
          background:
            "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
          boxShadow:
            "0 8px 32px rgba(107, 220, 192, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          border: "2px solid transparent",
        };
      case "secondary":
        return {
          background:
            "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 50%, #f472b6 100%)",
          boxShadow:
            "0 8px 32px rgba(14, 165, 233, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          border: "2px solid transparent",
        };
      case "outline":
        return {
          background: "rgba(30, 41, 59, 0.4)",
          border: "2px solid #6bdcc0",
          boxShadow:
            "0 8px 32px rgba(107, 220, 192, 0.2), inset 0 1px 0 rgba(107, 220, 192, 0.1)",
        };
      case "ghost":
        return {
          background: "transparent",
          border: "2px solid transparent",
          boxShadow: "0 4px 16px rgba(107, 220, 192, 0.1)",
        };
      default:
        return {};
    }
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  const getHoverOverlays = () => {
    switch (variant) {
      case "primary":
        return (
          <>
            {/* Main gradient background */}
            <div
              className="absolute inset-0 opacity-100 group-hover:opacity-0 transition-all duration-500 ease-out rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
              }}
            ></div>

            {/* Hover state: Glowing border */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out"
              style={{
                background: "rgba(5, 16, 40, 0.95)",
                border: "2px solid #6bdcc0",
                boxShadow: `
                  0 0 20px rgba(107, 220, 192, 0.6),
                  0 0 40px rgba(107, 220, 192, 0.4),
                  inset 0 0 20px rgba(107, 220, 192, 0.1)
                `,
              }}
            ></div>
          </>
        );
      case "secondary":
        return (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #84cc16 100%)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          ></div>
        );
      case "outline":
        return (
          <>
            {/* Hover fill gradient */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6bdcc0 100%)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              }}
            ></div>

            {/* Enhanced glow on hover */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
              style={{
                boxShadow: `
                  0 0 30px rgba(34, 211, 238, 0.8),
                  0 0 60px rgba(34, 211, 238, 0.4)
                `,
              }}
            ></div>
          </>
        );
      case "ghost":
        return (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
            style={{
              background: "rgba(107, 220, 192, 0.1)",
              border: "1px solid rgba(107, 220, 192, 0.3)",
            }}
          ></div>
        );
      default:
        return null;
    }
  };

  const getTextColorClass = () => {
    switch (variant) {
      case "primary":
        return "relative z-20 transition-all duration-500 group-hover:text-[#6bdcc0] font-bold tracking-wide drop-shadow-sm";
      case "secondary":
        return "relative z-20 transition-all duration-500 group-hover:text-[#051028] font-bold tracking-wide drop-shadow-sm";
      case "outline":
        return "relative z-20 transition-all duration-500 group-hover:text-[#051028] font-bold tracking-wide drop-shadow-sm";
      case "ghost":
        return "relative z-20 transition-all duration-500 group-hover:text-[#22d3ee] font-medium tracking-wide";
      default:
        return "relative z-20";
    }
  };

  const content = (
    <>
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 relative z-20"
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
      <span className={getTextColorClass()}>{children}</span>
      {getHoverOverlays()}

      {/* Subtle animated shimmer effect for all variants */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
        <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </div>
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
          style={getButtonStyle()}
        >
          {content}
        </a>
      );
    } else {
      return (
        <a href={href} className={classes} style={getButtonStyle()}>
          {content}
        </a>
      );
    }
  }

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      style={getButtonStyle()}
      {...props}
    >
      {content}
    </button>
  );
}
