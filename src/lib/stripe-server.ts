import Stripe from "stripe";

// Server-side Stripe instance (only for API routes and server components)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
  typescript: true,
});

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: "usd",
  payment_method_types: ["card"],
  mode: "payment" as const,
} as const;

// Helper function to format amount for Stripe (cents)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper function to format amount for display
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};
