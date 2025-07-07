import { render } from "@react-email/render";
import { sendEmail } from "./aws-ses";
import BookingConfirmation from "../emails/BookingConfirmation";
import { TimezoneService } from "./timezone-service";

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingReference: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  price?: number;
  meetingUrl?: string;
  serviceFeatures?: string[]; // Dynamic features from database
  customerTimezone?: string; // Customer's timezone for proper formatting
  scheduledDateTime?: string; // Full datetime for timezone-aware formatting
}

// Helper function to format datetime with timezone awareness
function formatEmailDateTime(data: BookingEmailData): {
  date: string;
  time: string;
  fullDateTime: string;
} {
  try {
    // If we have a full scheduled datetime, use that with timezone formatting
    if (data.scheduledDateTime) {
      const formatted = TimezoneService.formatForEmail(
        data.scheduledDateTime,
        undefined,
        data.customerTimezone
      );
      const dateTimeComponents = TimezoneService.formatDateTime(
        data.scheduledDateTime,
        undefined,
        data.customerTimezone
      );
      return {
        date: dateTimeComponents.date,
        time: dateTimeComponents.time,
        fullDateTime: formatted,
      };
    }

    // Fallback to separate date/time fields
    const formatted = TimezoneService.formatDateTime(
      data.scheduledDate,
      data.scheduledTime,
      data.customerTimezone
    );
    return {
      date: formatted.date,
      time: formatted.time,
      fullDateTime: TimezoneService.formatForEmail(
        data.scheduledDate,
        data.scheduledTime,
        data.customerTimezone
      ),
    };
  } catch (error) {
    console.warn("Failed to format email datetime, using fallback:", error);
    // Fallback formatting
    return {
      date: data.scheduledDate,
      time: data.scheduledTime,
      fullDateTime: `${data.scheduledDate} at ${data.scheduledTime}`,
    };
  }
}

// Helper function to get environment-based email config
function getEmailConfig() {
  return {
    fromEmail: process.env.SES_FROM_EMAIL_AWS || "contact@intellectif.com",
    companyName: "Intellectif",
    companyWebsite:
      process.env.NEXT_PUBLIC_SITE_URL || "https://intellectif.com",
    supportEmail: process.env.SUPPORT_EMAIL || "contact@intellectif.com",
  };
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    const config = getEmailConfig();
    const dateTimeFormatted = formatEmailDateTime(data);

    // Render the React Email template to HTML with dynamic values
    const emailHtml = await render(
      BookingConfirmation({
        customerName: data.customerName,
        serviceName: data.serviceName,
        bookingReference: data.bookingReference,
        scheduledDate: dateTimeFormatted.date,
        scheduledTime: dateTimeFormatted.time,
        duration: data.duration,
        price: data.price,
        meetingUrl: data.meetingUrl,
        serviceFeatures: data.serviceFeatures, // Pass dynamic features
        // Pass environment-based values
        companyName: config.companyName,
        companyWebsite: config.companyWebsite,
        supportEmail: config.supportEmail,
      })
    );

    // Generate text version (simplified) with dynamic values
    const emailText = `
Hi ${data.customerName},

Your consultation with ${config.companyName} has been confirmed!

Booking Details:
- Reference: ${data.bookingReference}
- Service: ${data.serviceName}
- Date & Time: ${dateTimeFormatted.fullDateTime}
- Duration: ${data.duration} minutes
${data.price ? `- Amount Paid: $${data.price.toFixed(2)} USD` : ""}

Meeting Link: ${data.meetingUrl}

We'll send you a reminder 24 hours before your appointment.

During our consultation, we'll:
• Discuss your project goals and vision
• Analyze your technical requirements
• Provide strategic recommendations
• Outline next steps and timeline

Looking forward to speaking with you!
The ${config.companyName} Team

---
If you need to reschedule or have questions, reply to this email or contact us at ${
      config.supportEmail
    }
    `.trim();

    // Send the email
    const result = await sendEmail({
      to: data.customerEmail,
      subject: `Booking Confirmed: ${data.serviceName} - ${data.bookingReference}`,
      htmlContent: emailHtml,
      textContent: emailText,
    });

    console.log("✅ Booking confirmation email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("❌ Failed to send booking confirmation email:", error);
    throw error;
  }
}

export async function sendPaymentConfirmationEmail(data: BookingEmailData) {
  try {
    const config = getEmailConfig();
    const dateTimeFormatted = formatEmailDateTime(data);

    // For payment confirmations, we can reuse the same template
    // but with a different subject line
    const emailHtml = await render(
      BookingConfirmation({
        customerName: data.customerName,
        serviceName: data.serviceName,
        bookingReference: data.bookingReference,
        scheduledDate: dateTimeFormatted.date,
        scheduledTime: dateTimeFormatted.time,
        duration: data.duration,
        price: data.price,
        meetingUrl: data.meetingUrl,
        serviceFeatures: data.serviceFeatures, // Pass dynamic features
        // Pass environment-based values
        companyName: config.companyName,
        companyWebsite: config.companyWebsite,
        supportEmail: config.supportEmail,
      })
    );

    const emailText = `
Hi ${data.customerName},

Payment received and booking confirmed!

Your payment of $${data.price?.toFixed(2)} USD has been processed successfully.

Booking Details:
- Reference: ${data.bookingReference}
- Service: ${data.serviceName}
- Date & Time: ${dateTimeFormatted.fullDateTime}
- Duration: ${data.duration} minutes

Meeting Link: ${data.meetingUrl}

Thank you for choosing ${config.companyName}!
The ${config.companyName} Team
    `.trim();

    const result = await sendEmail({
      to: data.customerEmail,
      subject: `Payment Confirmed: ${data.serviceName} - ${data.bookingReference}`,
      htmlContent: emailHtml,
      textContent: emailText,
    });

    console.log("✅ Payment confirmation email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("❌ Failed to send payment confirmation email:", error);
    throw error;
  }
}
