import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // --- START DIAGNOSTIC LOGS ---
  console.log("--- [AUTH CONFIRMATION] DIAGNOSTICS ---");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Request URL: ${request.url}`);
  console.log(`Request Origin: ${request.nextUrl.origin}`);
  console.log(`Token Hash Received: ${token_hash ? "Yes" : "No"}`);
  console.log(`Type Received: ${type}`);
  console.log(`Next Path: ${next}`);
  console.log(`Env SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  // --- END DIAGNOSTIC LOGS ---

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;

  if (token_hash && type) {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      console.log(
        `✅ Verification successful. Redirecting to: ${redirectTo.href}`
      );
      console.log("-----------------------------------------");
      return NextResponse.redirect(redirectTo);
    }
    console.error(`❌ Verification failed:`, error.message);
  } else {
    console.warn("⚠️ Missing token_hash or type in confirmation URL.");
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = "/auth/auth-code-error";
  console.log(`🔴 Redirecting to error page: ${redirectTo.href}`);
  console.log("-----------------------------------------");
  return NextResponse.redirect(redirectTo);
}
