import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import BookingConfirmation from "@/emails/BookingConfirmation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "booking-confirmation";
  const format = searchParams.get("format") || "html"; // 'html' or 'text'

  try {
    // Sample booking data for preview
    const sampleBookingData = {
      customerName: "John Doe",
      serviceName: "Technical Strategy Session",
      bookingReference: "INT-20250101-0001",
      scheduledDate: "January 15, 2025",
      scheduledTime: "2:00 PM EST",
      duration: 60,
      price: 150.0,
      meetingUrl: "https://meet.google.com/sample-meeting-link",
    };

    let emailHtml = "";
    let emailText = "";

    switch (template) {
      case "booking-confirmation":
        emailHtml = await render(BookingConfirmation(sampleBookingData), {
          pretty: true,
        });
        emailText = await render(BookingConfirmation(sampleBookingData), {
          plainText: true,
        });
        break;
      default:
        return NextResponse.json(
          { error: "Unknown template" },
          { status: 400 }
        );
    }

    if (format === "text") {
      return new NextResponse(emailText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Return HTML with proper styling
    return new NextResponse(emailHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Email preview error:", error);
    return NextResponse.json(
      {
        error: "Failed to render email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
