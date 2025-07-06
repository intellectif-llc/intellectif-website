import twilio from "twilio";

export interface WhatsAppBookingData {
  consultantName: string;
  consultantPhone: string;
  customerName: string;
  serviceName: string;
  bookingReference: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingUrl?: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string; // Your Twilio WhatsApp number (e.g., "whatsapp:+14155238886")
}

function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g., "whatsapp:+14155238886"

  if (!accountSid || !authToken || !whatsappFrom) {
    throw new Error(
      "Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM environment variables."
    );
  }

  return { accountSid, authToken, whatsappFrom };
}

function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Add country code if not present (assuming US/Canada if 10 digits)
  let formatted = cleaned;
  if (cleaned.length === 10) {
    formatted = "1" + cleaned; // Add US country code
  }

  // Ensure it starts with country code
  if (!formatted.startsWith("1") && formatted.length === 10) {
    formatted = "1" + formatted;
  }

  return `whatsapp:+${formatted}`;
}

function createWhatsAppMessage(data: WhatsAppBookingData): string {
  const {
    consultantName,
    customerName,
    serviceName,
    bookingReference,
    scheduledDate,
    scheduledTime,
    duration,
    meetingUrl,
  } = data;

  // Format the message using only essential booking details
  let message = `🎉 *New Booking Assignment!*\n\n`;
  message += `Hi ${consultantName},\n\n`;
  message += `You've been assigned a new consultation with *${customerName}*.\n\n`;

  message += `📅 *Booking Details:*\n`;
  message += `• Reference: ${bookingReference}\n`;
  message += `• Service: ${serviceName}\n`;
  message += `• Date: ${scheduledDate}\n`;
  message += `• Time: ${scheduledTime}\n`;
  message += `• Duration: ${duration} minutes\n\n`;

  if (meetingUrl) {
    message += `📹 *Meeting Link:*\n${meetingUrl}\n\n`;
  }

  message += `🚀 Ready to help bring their vision to life!\n\n`;
  message += `---\n`;
  message += `*Intellectif Team*`;

  return message;
}

export async function sendConsultantWhatsAppNotification(
  data: WhatsAppBookingData
): Promise<void> {
  try {
    const config = getTwilioConfig();
    const client = twilio(config.accountSid, config.authToken);

    // Format the consultant's phone number for WhatsApp
    const toWhatsApp = formatWhatsAppNumber(data.consultantPhone);

    // Create the message content
    const messageBody = createWhatsAppMessage(data);

    console.log("📱 Sending WhatsApp notification:", {
      to: toWhatsApp,
      from: config.whatsappFrom,
      consultant: data.consultantName,
      booking: data.bookingReference,
    });

    // Send the WhatsApp message
    const message = await client.messages.create({
      body: messageBody,
      from: config.whatsappFrom,
      to: toWhatsApp,
    });

    console.log("✅ WhatsApp notification sent successfully:", {
      messageSid: message.sid,
      status: message.status,
      consultant: data.consultantName,
      booking: data.bookingReference,
    });
  } catch (error) {
    console.error("❌ Failed to send WhatsApp notification:", error);

    // Don't throw the error - we don't want WhatsApp failures to break booking creation
    // Just log it for monitoring
    console.error(
      "WhatsApp notification failed for booking:",
      data.bookingReference,
      error
    );
  }
}

// Function for sending via Twilio's WhatsApp Template (for approved templates)
export async function sendConsultantWhatsAppTemplate(
  data: WhatsAppBookingData,
  templateSid: string
): Promise<void> {
  try {
    const config = getTwilioConfig();
    const client = twilio(config.accountSid, config.authToken);

    const toWhatsApp = formatWhatsAppNumber(data.consultantPhone);

    console.log("📱 Sending WhatsApp template notification:", {
      to: toWhatsApp,
      templateSid,
      consultant: data.consultantName,
      booking: data.bookingReference,
    });

    // Send using approved template with essential booking data
    const message = await client.messages.create({
      from: config.whatsappFrom,
      to: toWhatsApp,
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        "1": data.consultantName,
        "2": data.customerName,
        "3": data.serviceName,
        "4": data.bookingReference,
        "5": data.scheduledDate,
        "6": data.scheduledTime,
        "7": data.duration.toString(),
        "8": data.meetingUrl || "",
      }),
    });

    console.log("✅ WhatsApp template notification sent successfully:", {
      messageSid: message.sid,
      status: message.status,
      consultant: data.consultantName,
      booking: data.bookingReference,
    });
  } catch (error) {
    console.error("❌ Failed to send WhatsApp template notification:", error);
    console.error(
      "WhatsApp template notification failed for booking:",
      data.bookingReference,
      error
    );
  }
}
