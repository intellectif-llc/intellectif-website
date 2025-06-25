import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";

interface BookingConfirmationProps {
  customerName: string;
  serviceName: string;
  bookingReference: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  price?: number;
  meetingUrl?: string;
  companyName?: string;
  companyWebsite?: string;
  supportEmail?: string;
  logoUrl?: string;
}

export default function BookingConfirmation({
  customerName = "John Doe",
  serviceName = "Technical Strategy Session",
  bookingReference = "INT-20250127-0001",
  scheduledDate = "February 1, 2025",
  scheduledTime = "10:00 AM EST",
  duration = 60,
  price,
  meetingUrl,
  companyName = "Intellectif",
  supportEmail = "admin@intellectif.com",
  logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/logo.png`,
}: BookingConfirmationProps) {
  const isPaid = price && price > 0;

  return (
    <Html>
      <Head />
      <Preview>Your consultation with {companyName} is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={logoUrl}
              width="150"
              height="50"
              alt={companyName}
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>🎉 Booking Confirmed!</Text>

            <Text style={paragraph}>Hi {customerName},</Text>

            <Text style={paragraph}>
              Great news! Your consultation with {companyName} has been
              confirmed. We&apos;re excited to discuss your project and help
              bring your vision to life.
            </Text>

            {/* Booking Details */}
            <Section style={detailsBox}>
              <Text style={detailsTitle}>📅 Booking Details</Text>

              <Text style={detailItem}>
                <strong>Reference:</strong> {bookingReference}
              </Text>
              <Text style={detailItem}>
                <strong>Service:</strong> {serviceName}
              </Text>
              <Text style={detailItem}>
                <strong>Date:</strong> {scheduledDate}
              </Text>
              <Text style={detailItem}>
                <strong>Time:</strong> {scheduledTime}
              </Text>
              <Text style={detailItem}>
                <strong>Duration:</strong> {duration} minutes
              </Text>
              {isPaid && (
                <Text style={detailItem}>
                  <strong>Amount Paid:</strong> ${price.toFixed(2)} USD
                </Text>
              )}
            </Section>

            {/* Meeting Link */}
            {meetingUrl && (
              <Section style={meetingSection}>
                <Text style={paragraph}>
                  <strong>📹 Meeting Link:</strong>
                </Text>
                <Button style={button} href={meetingUrl}>
                  Join Meeting
                </Button>
                <Text style={smallText}>
                  We&apos;ll send you a reminder 24 hours before your
                  appointment.
                </Text>
              </Section>
            )}

            {/* What to Expect */}
            <Section style={expectSection}>
              <Text style={sectionTitle}>What to Expect</Text>
              <Text style={paragraph}>
                During our consultation, we&apos;ll:
              </Text>
              <Text style={listItem}>
                • Discuss your project goals and vision
              </Text>
              <Text style={listItem}>
                • Analyze your technical requirements
              </Text>
              <Text style={listItem}>• Provide strategic recommendations</Text>
              <Text style={listItem}>• Outline next steps and timeline</Text>
            </Section>

            <Hr style={hr} />

            {/* Footer */}
            <Text style={paragraph}>
              If you need to reschedule or have any questions, please reply to
              this email or contact us at{" "}
              <a href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </a>
            </Text>

            <Text style={paragraph}>
              Looking forward to speaking with you!
              <br />
              <strong>The {companyName} Team</strong>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "system-ui, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "20px 30px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
};

const content = {
  padding: "0 30px",
};

const title = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1a1a1a",
  textAlign: "center" as const,
  margin: "30px 0 20px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
  margin: "16px 0",
};

const detailsBox = {
  backgroundColor: "#f8fffe",
  border: "1px solid #e0f2f1",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const detailsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const detailItem = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#4a4a4a",
  margin: "8px 0",
};

const meetingSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#6bdcc0",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  margin: "16px 0",
};

const expectSection = {
  margin: "32px 0",
};

const sectionTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0 0 12px",
};

const listItem = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#4a4a4a",
  margin: "4px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#8898aa",
  margin: "8px 0",
};

const link = {
  color: "#6bdcc0",
  textDecoration: "underline",
};
