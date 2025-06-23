import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmationEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Generate a realistic future date (next week)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0); // 2:00 PM

    // Sample booking data for testing with realistic values
    const testBookingData = {
      customerName: "Test User",
      customerEmail: email,
      serviceName: "Technical Strategy Session",
      bookingReference: `INT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-TEST`,
      scheduledDate: nextWeek.toISOString().split("T")[0], // YYYY-MM-DD format
      scheduledTime: "2:00 PM EST",
      duration: 60,
      price: 150.0,
      meetingUrl: "https://meet.google.com/mgp-uzoc-hkz", // Your actual Google Meet link
    };

    console.log("🧪 Sending test email with data:", testBookingData);

    // Send the actual email
    const result = await sendBookingConfirmationEmail(testBookingData);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      messageId: result.messageId,
      data: testBookingData,
      environmentInfo: {
        companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "Intellectif",
        supportEmail: process.env.EMAIL_SUPPORT || "admin@intellectif.com",
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/logo.png`,
      },
    });
  } catch (error) {
    console.error("Email test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "Email test endpoint. Use POST with { email: 'your@email.com' } to send a test email.",
    usage: "POST /api/debug/email-test",
    body: { email: "your@email.com" },
    environmentInfo: {
      companyName:
        process.env.NEXT_PUBLIC_COMPANY_NAME || "Intellectif (default)",
      supportEmail:
        process.env.EMAIL_SUPPORT || "admin@intellectif.com (default)",
      appUrl:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000 (default)",
      logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/logo.png`,
    },
  });
}
