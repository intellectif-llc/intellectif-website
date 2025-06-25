import { NextRequest, NextResponse } from "next/server";
import { googleAuthService } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  try {
    // Generate OAuth URL
    const authUrl = googleAuthService.getAuthUrl();

    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to generate Google auth URL:", error);

    return NextResponse.json(
      { error: "Failed to initiate Google authorization" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultantId } = body;

    if (!consultantId) {
      return NextResponse.json(
        { error: "Consultant ID is required" },
        { status: 400 }
      );
    }

    // Check if consultant already has valid credentials
    const hasCredentials =
      await googleAuthService.hasValidCredentials(consultantId);

    if (hasCredentials) {
      return NextResponse.json({
        status: "already_connected",
        message: "Google account is already connected",
      });
    }

    // Generate OAuth URL with state parameter containing consultant ID
    const authUrl = googleAuthService.getAuthUrl();

    return NextResponse.json({
      status: "authorization_required",
      authUrl: authUrl,
    });
  } catch (error) {
    console.error("Failed to check Google authorization status:", error);

    return NextResponse.json(
      { error: "Failed to check authorization status" },
      { status: 500 }
    );
  }
}
