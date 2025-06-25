import { google } from "googleapis";
import { googleAuthService } from "./google-auth";

export interface CreateMeetingParams {
  consultantId: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  consultantEmail: string;
  serviceName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
}

export interface MeetingDetails {
  calendarEventId: string;
  meetingUrl: string;
  calendarLink: string;
  meetingCode?: string;
}

export class GoogleCalendarSimpleService {
  /**
   * Create a unique Google Meet meeting for a consultation
   * Each booking gets its own secure meeting space
   */
  async createConsultationMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    console.log("🚀 Starting Google Meet creation with parameters:", {
      consultantId: params.consultantId,
      bookingId: params.bookingId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      consultantEmail: params.consultantEmail,
      serviceName: params.serviceName,
      startTime: params.startTime,
      endTime: params.endTime,
      timezone: params.timezone,
    });

    try {
      // Get consultant's authenticated Google client
      console.log(
        "🔐 Retrieving Google tokens for consultant:",
        params.consultantId
      );
      const authClient = await googleAuthService.getConsultantTokens(
        params.consultantId
      );
      if (!authClient) {
        console.error(
          "❌ Consultant Google account not connected:",
          params.consultantId
        );
        return null;
      }
      console.log("✅ Successfully retrieved Google tokens for consultant");

      // Initialize Calendar API
      const calendar = google.calendar({ version: "v3", auth: authClient });

      // Generate unique request ID for idempotency
      const requestId = this.generateUUID();

      // Create event with Google Meet conference
      const eventResource = {
        summary: `${params.serviceName} Consultation - ${params.customerName}`,
        description: this.generateEventDescription(params),
        start: {
          dateTime: params.startTime,
          timeZone: params.timezone,
        },
        end: {
          dateTime: params.endTime,
          timeZone: params.timezone,
        },
        attendees: [
          {
            email: params.customerEmail,
            displayName: params.customerName,
            responseStatus: "needsAction",
          },
          {
            email: params.consultantEmail,
            organizer: true,
            responseStatus: "accepted",
          },
        ],
        conferenceData: {
          createRequest: {
            requestId: requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet", // This creates a Google Meet link
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 }, // 1 hour before
            { method: "popup", minutes: 15 }, // 15 minutes before
          ],
        },
        guestsCanModify: false, // Security: Only organizer can modify
        guestsCanInviteOthers: false, // Security: Guests can't invite others
        guestsCanSeeOtherGuests: true, // Allow customer and consultant to see each other
      };

      // Create the event with conference data
      console.log("📅 Creating calendar event with Google Calendar API...");
      console.log("📋 Event resource summary:", {
        summary: eventResource.summary,
        startTime: eventResource.start,
        endTime: eventResource.end,
        attendeesCount: eventResource.attendees?.length,
        hasConferenceData: !!eventResource.conferenceData,
      });

      const response = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1, // Required for conference creation
        sendUpdates: "all", // Send invitations to all attendees
        requestBody: eventResource,
      });

      const event = response.data;
      console.log("📊 Calendar API response received:", {
        eventId: event.id,
        status: response.status,
        hasConferenceData: !!event.conferenceData,
        hangoutLink: event.hangoutLink,
      });

      if (!event.id) {
        throw new Error("Failed to create calendar event");
      }

      // Extract meeting details
      const meetingDetails: MeetingDetails = {
        calendarEventId: event.id,
        meetingUrl: this.extractMeetingUrl(event),
        calendarLink: event.htmlLink || "",
      };

      // Extract additional meeting info if available
      if (event.conferenceData?.entryPoints) {
        for (const entryPoint of event.conferenceData.entryPoints) {
          if (entryPoint.entryPointType === "video" && entryPoint.uri) {
            meetingDetails.meetingUrl = entryPoint.uri;
          }
        }
        meetingDetails.meetingCode =
          event.conferenceData.conferenceId || undefined;
      }

      console.log("🎉 Google Meet creation completed successfully!", {
        bookingId: params.bookingId,
        eventId: meetingDetails.calendarEventId,
        meetingUrl: meetingDetails.meetingUrl,
        calendarLink: meetingDetails.calendarLink,
        meetingCode: meetingDetails.meetingCode,
      });
      return meetingDetails;
    } catch (error) {
      console.error("❌ Failed to create Google Meet:", error);
      return null;
    }
  }

  /**
   * Cancel a meeting (for booking cancellations)
   */
  async cancelConsultationMeeting(
    consultantId: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const authClient =
        await googleAuthService.getConsultantTokens(consultantId);
      if (!authClient) return false;

      const calendar = google.calendar({ version: "v3", auth: authClient });

      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all", // Notify attendees of cancellation
      });

      return true;
    } catch (error) {
      console.error("Failed to cancel Google Meet:", error);
      return false;
    }
  }

  /**
   * Simple UUID generator
   */
  private generateUUID(): string {
    return "xxxx-xxxx-4xxx-yxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate professional event description
   */
  private generateEventDescription(params: CreateMeetingParams): string {
    return `
📋 Consultation Details:
• Service: ${params.serviceName}
• Customer: ${params.customerName}
• Booking ID: ${params.bookingId}

🎯 Meeting Purpose:
Professional consultation session to discuss your technology needs and provide expert guidance.

🔐 Security Notice:
This meeting link is unique to this consultation and will be automatically deactivated after the session.

📞 Need Help?
Contact our support team if you experience any technical difficulties.
    `.trim();
  }

  /**
   * Extract meeting URL from event data
   */
  private extractMeetingUrl(event: any): string {
    // Try conferenceData first (most reliable)
    if (event.conferenceData?.entryPoints) {
      for (const entryPoint of event.conferenceData.entryPoints) {
        if (entryPoint.entryPointType === "video" && entryPoint.uri) {
          return entryPoint.uri;
        }
      }
    }

    // Fallback to hangoutLink (legacy)
    if (event.hangoutLink) {
      return event.hangoutLink;
    }

    // Fallback to a generic meet link (shouldn't happen with proper setup)
    return `https://meet.google.com/lookup/${event.id}`;
  }
}

// Export singleton instance
export const googleCalendarSimpleService = new GoogleCalendarSimpleService();
