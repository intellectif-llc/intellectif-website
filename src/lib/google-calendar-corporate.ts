import { google } from "googleapis";
import { JWT } from "google-auth-library";

export interface CreateMeetingParams {
  customerName: string;
  customerEmail: string;
  consultantEmail: string;
  serviceName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  bookingId: string;
}

export interface MeetingDetails {
  meetingUrl: string;
  calendarEventId: string;
  calendarLink: string;
}

export class CorporateGoogleService {
  private auth: JWT;
  private calendar: any;

  constructor() {
    // Use service account for corporate Google integration
    this.auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      )!,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    });

    this.calendar = google.calendar({ version: "v3", auth: this.auth });
  }

  /**
   * Create Google Meet meeting using corporate service account
   */
  async createConsultationMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    try {
      console.log("🏢 Creating corporate Google Meet meeting:", {
        bookingId: params.bookingId,
        serviceName: params.serviceName,
        startTime: params.startTime,
        customerEmail: params.customerEmail,
        consultantEmail: params.consultantEmail,
      });

      const event = {
        summary: `${params.serviceName} - ${params.customerName}`,
        description: `
Consultation Meeting
===================

Service: ${params.serviceName}
Customer: ${params.customerName}
Booking ID: ${params.bookingId}

This meeting was automatically created by the Intellectif booking system.
        `.trim(),
        start: {
          dateTime: params.startTime,
          timeZone: params.timezone,
        },
        end: {
          dateTime: params.endTime,
          timeZone: params.timezone,
        },
        attendees: [
          { email: params.customerEmail, displayName: params.customerName },
          { email: params.consultantEmail },
        ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${params.bookingId}-${Date.now()}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24 hours
            { method: "email", minutes: 60 }, // 1 hour
            { method: "popup", minutes: 10 }, // 10 minutes
          ],
        },
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
      };

      console.log(
        "📅 Creating calendar event with corporate service account..."
      );

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: "all", // Send invites to all attendees
      });

      const createdEvent = response.data;

      if (!createdEvent.id) {
        console.error("❌ No event ID returned from Google Calendar");
        return null;
      }

      // Extract Google Meet URL
      const meetingUrl = createdEvent.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri;

      if (!meetingUrl) {
        console.error("❌ No Google Meet URL found in created event");
        return null;
      }

      const meetingDetails: MeetingDetails = {
        meetingUrl,
        calendarEventId: createdEvent.id,
        calendarLink: createdEvent.htmlLink || "",
      };

      console.log("✅ Corporate Google Meet created successfully:", {
        eventId: createdEvent.id,
        meetingUrl,
        calendarLink: meetingDetails.calendarLink,
      });

      return meetingDetails;
    } catch (error) {
      console.error("❌ Error creating corporate Google Meet:", error);

      if (error instanceof Error) {
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }

      return null;
    }
  }

  /**
   * Update existing Google Calendar event
   */
  async updateMeeting(
    eventId: string,
    updates: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    try {
      console.log("🔄 Updating corporate calendar event:", eventId);

      const updateData: any = {};

      if (updates.startTime && updates.endTime) {
        updateData.start = {
          dateTime: updates.startTime,
          timeZone: updates.timezone || "UTC",
        };
        updateData.end = {
          dateTime: updates.endTime,
          timeZone: updates.timezone || "UTC",
        };
      }

      if (updates.serviceName || updates.customerName) {
        updateData.summary = `${updates.serviceName || "Consultation"} - ${updates.customerName || "Customer"}`;
      }

      await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        resource: updateData,
        sendUpdates: "all",
      });

      console.log("✅ Corporate calendar event updated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error updating corporate calendar event:", error);
      return false;
    }
  }

  /**
   * Cancel Google Calendar event
   */
  async cancelMeeting(eventId: string): Promise<boolean> {
    try {
      console.log("🗑️ Canceling corporate calendar event:", eventId);

      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });

      console.log("✅ Corporate calendar event canceled successfully");
      return true;
    } catch (error) {
      console.error("❌ Error canceling corporate calendar event:", error);
      return false;
    }
  }
}

// Export singleton instance
export const corporateGoogleService = new CorporateGoogleService();
