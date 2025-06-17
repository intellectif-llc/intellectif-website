// Global type definitions for custom Tailwind colors and design system

export type BrandColor =
  | "midnight-navy"
  | "brand-teal"
  | "electric-blue"
  | "neon-cyan"
  | "coral-pink"
  | "lime-green"
  | "slate-blue"
  | "cool-gray"
  | "light-blue-gray"
  | "pure-white";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type AnimationType =
  | "fade-in"
  | "slide-up"
  | "slide-in-left"
  | "slide-in-right"
  | "hover-lift";

// Extend the global Window interface if needed
declare global {
  interface Window {
    // Add any global window properties here
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
