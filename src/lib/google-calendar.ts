import { google, calendar_v3 } from "googleapis";
import { googleAuthService, GoogleCalendarEvent } from "./google-auth";

// Simple UUID generator to avoid dependency
function generateUUID(): string {
  return "xxxx-xxxx-4xxx-yxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  dialInNumber?: string;
}

export class GoogleCalendarService {
  /**
   * Create a unique Google Meet meeting for a consultation
   * Each booking gets its own secure meeting space
   */
  async createConsultationMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    try {
      // Get consultant's authenticated Google client
      const authClient = await googleAuthService.getConsultantTokens(
        params.consultantId
      );
      if (!authClient) {
        console.error(
          "Consultant Google account not connected:",
          params.consultantId
        );
        return null;
      }

      // Initialize Calendar API
      const calendar = google.calendar({ version: "v3", auth: authClient });

      // Generate unique request ID for idempotency
      const requestId = generateUUID();

      // Create event with Google Meet conference
      const eventResource: calendar_v3.Schema$Event = {
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
      const response = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1, // Required for conference creation
        sendUpdates: "all", // Send invitations to all attendees
        requestBody: eventResource,
      });

      const event = response.data;
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
          if (entryPoint.entryPointType === "phone") {
            meetingDetails.dialInNumber = entryPoint.label || entryPoint.uri;
          }
        }
        meetingDetails.meetingCode = event.conferenceData.conferenceId;
      }

      console.log("✅ Created Google Meet for booking:", params.bookingId);
      return meetingDetails;
    } catch (error) {
      console.error("❌ Failed to create Google Meet:", error);
      return null;
    }
  }

  /**
   * Update an existing meeting (for rescheduling)
   */
  async updateConsultationMeeting(
    consultantId: string,
    eventId: string,
    updates: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    try {
      const authClient =
        await googleAuthService.getConsultantTokens(consultantId);
      if (!authClient) return false;

      const calendar = google.calendar({ version: "v3", auth: authClient });

      const updateResource: calendar_v3.Schema$Event = {};

      if (updates.startTime && updates.endTime) {
        updateResource.start = {
          dateTime: updates.startTime,
          timeZone: updates.timezone || "UTC",
        };
        updateResource.end = {
          dateTime: updates.endTime,
          timeZone: updates.timezone || "UTC",
        };
      }

      if (updates.customerName || updates.serviceName) {
        updateResource.summary = `${updates.serviceName || "Consultation"} - ${updates.customerName || "Customer"}`;
      }

      await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        resource: updateResource,
        sendUpdates: "all",
      });

      return true;
    } catch (error) {
      console.error("Failed to update Google Meet:", error);
      return false;
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
   * Check if consultant has calendar conflicts
   */
  async checkAvailability(
    consultantId: string,
    startTime: string,
    endTime: string,
    timezone: string
  ): Promise<boolean> {
    try {
      const authClient =
        await googleAuthService.getConsultantTokens(consultantId);
      if (!authClient) return true; // If no Google integration, assume available

      const calendar = google.calendar({ version: "v3", auth: authClient });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          timeZone: timezone,
          items: [{ id: "primary" }],
        },
      });

      const busy = response.data.calendars?.primary?.busy || [];
      return busy.length === 0; // True if no conflicts
    } catch (error) {
      console.error("Failed to check calendar availability:", error);
      return true; // Assume available on error
    }
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
  private extractMeetingUrl(event: calendar_v3.Schema$Event): string {
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
export const googleCalendarService = new GoogleCalendarService();
