import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Create SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(options: EmailOptions) {
  const { to, subject, htmlContent, textContent } = options;

  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: "UTF-8",
        },
        ...(textContent && {
          Text: {
            Data: textContent,
            Charset: "UTF-8",
          },
        }),
      },
    },
    // Use configuration set if provided
    ...(process.env.AWS_SES_CONFIGURATION_SET && {
      ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
    }),
  });

  try {
    const response = await sesClient.send(command);
    console.log("✅ Email sent successfully:", response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}

// Email templates
export const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMATION: "booking-confirmation",
  PAYMENT_CONFIRMATION: "payment-confirmation",
  BOOKING_REMINDER: "booking-reminder",
} as const;
