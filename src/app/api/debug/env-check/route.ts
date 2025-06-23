import { NextResponse } from "next/server";

export async function GET() {
  const envVars = {
    // Stripe
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_SECRET_KEY_LENGTH: process.env.STRIPE_SECRET_KEY?.length || 0,
    STRIPE_SECRET_KEY_PREFIX:
      process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "missing",

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LENGTH:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length || 0,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_PREFIX:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7) ||
      "missing",

    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,

    // AWS
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || "not set",
    AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL || "not set",

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

    // Other
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "not set",
  };

  return NextResponse.json({
    environment: envVars,
    allStripeKeys: Object.keys(process.env).filter((key) =>
      key.includes("STRIPE")
    ),
    timestamp: new Date().toISOString(),
  });
}
