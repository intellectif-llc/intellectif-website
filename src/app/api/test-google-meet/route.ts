import { NextResponse } from "next/server";
import { GoogleMeetService } from "@/lib/google-meet-service";

export async function GET() {
  try {
    console.log("🧪 Testing Google Meet integration...");

    // Test configuration check
    const isConnected = await GoogleMeetService.isConsultantConnected("test");
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Meet not configured. Missing OAuth credentials.",
          details:
            "Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN",
        },
        { status: 400 }
      );
    }

    // Test meeting creation with simple data
    const testMeetingOptions = {
      title: "Test Meeting",
      description: "Testing Google Meet integration",
      start: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      end: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      consultantId: "test-consultant",
      customerEmail: "test@example.com",
      customerName: "Test Customer",
    };

    console.log("📋 Creating test meeting with options:", testMeetingOptions);

    const meetingDetails =
      await GoogleMeetService.createMeeting(testMeetingOptions);

    if (!meetingDetails) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create Google Meet. Check server logs for details.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Google Meet created successfully! 🎉",
      meeting: meetingDetails,
      testData: {
        timestamp: new Date().toISOString(),
        requestOptions: testMeetingOptions,
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Test failed with exception",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
