import { loadStripe, Stripe } from "@stripe/stripe-js";

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (typeof window === "undefined") {
      // Server-side rendering - return null
      console.warn("⚠️ getStripe called on server-side, returning null");
      return null;
    }

    if (!publishableKey) {
      console.error("❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined");
      console.error(
        "Environment variables available:",
        Object.keys(process.env).filter((key) => key.includes("STRIPE"))
      );
      throw new Error("Stripe publishable key is not configured");
    }

    console.log(
      "✅ Loading Stripe with publishable key:",
      publishableKey.substring(0, 20) + "..."
    );
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Client-side Stripe configuration
export const STRIPE_CONFIG = {
  currency: "usd",
  payment_method_types: ["card"],
  mode: "payment" as const,
} as const;
