import { NextRequest, NextResponse } from "next/server";
import { googleAuthService } from "@/lib/google-auth";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=google_auth_failed", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?error=no_auth_code", request.url)
    );
  }

  try {
    // Get user from session (you may need to adjust based on your auth system)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // In a real implementation, you'd get the user ID from your auth session
    // For now, we'll assume it's passed via state or session

    // Exchange code for tokens
    const tokens = await googleAuthService.getTokensFromCode(code);

    // TODO: Get actual user ID from your auth system
    // This is a placeholder - replace with your actual user ID retrieval
    const consultantId = state || "temp-consultant-id";

    // Store tokens securely
    await googleAuthService.storeConsultantTokens(consultantId, tokens);

    console.log(
      "✅ Google account connected successfully for consultant:",
      consultantId
    );

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      new URL("/dashboard?google_connected=true", request.url)
    );
  } catch (error) {
    console.error("Failed to process Google OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=auth_processing_failed", request.url)
    );
  }
}
