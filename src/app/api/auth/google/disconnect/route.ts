import { NextRequest, NextResponse } from "next/server";
import { googleAuthService } from "@/lib/google-auth";

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

    // Revoke Google tokens and remove from database
    await googleAuthService.revokeConsultantTokens(consultantId);

    console.log("✅ Google account disconnected for consultant:", consultantId);

    return NextResponse.json({
      success: true,
      message: "Google account disconnected successfully",
    });
  } catch (error) {
    console.error("Failed to disconnect Google account:", error);

    return NextResponse.json(
      { error: "Failed to disconnect Google account" },
      { status: 500 }
    );
  }
}
