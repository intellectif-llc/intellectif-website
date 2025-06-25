import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { createServiceRoleClient } from "./supabase-server";

export interface ConsultantCalendarParams {
  consultantId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  bookingId: string;
}

export interface CalendarMeetingDetails {
  meetingUrl: string;
  calendarEventId: string;
  calendarLink: string;
  consultantCalendarId: string;
}

export class IndividualGoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private supabase;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
    );

    this.supabase = createServiceRoleClient();
  }

  /**
   * Get consultant's authenticated Google Calendar client
   */
  private async getConsultantCalendarClient(
    consultantId: string
  ): Promise<any | null> {
    try {
      // Get consultant's stored refresh token
      const { data: tokenData, error } = await this.supabase
        .from("user_tokens")
        .select("encrypted_google_refresh_token, google_calendar_id")
        .eq("user_id", consultantId)
        .single();

      if (error || !tokenData) {
        console.log(`No Google tokens found for consultant ${consultantId}`);
        return null;
      }

      // Set up OAuth client with consultant's tokens
      this.oauth2Client.setCredentials({
        refresh_token: tokenData.encrypted_google_refresh_token,
      });

      // Refresh access token
      await this.oauth2Client.getAccessToken();

      return google.calendar({ version: "v3", auth: this.oauth2Client });
    } catch (error) {
      console.error(
        `Failed to get calendar client for consultant ${consultantId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Create meeting in consultant's personal Google Calendar
   */
  async createConsultantMeeting(
    params: ConsultantCalendarParams
  ): Promise<CalendarMeetingDetails | null> {
    try {
      console.log(
        `📅 Creating meeting in consultant ${params.consultantId}'s calendar:`,
        {
          bookingId: params.bookingId,
          serviceName: params.serviceName,
          startTime: params.startTime,
        }
      );

      const calendar = await this.getConsultantCalendarClient(
        params.consultantId
      );

      if (!calendar) {
        console.log(
          `❌ Consultant ${params.consultantId} hasn't connected Google Calendar`
        );
        return null;
      }

      const event = {
        summary: `${params.serviceName} - ${params.customerName}`,
        description: `
Client Consultation
==================

Service: ${params.serviceName}
Client: ${params.customerName}
Client Email: ${params.customerEmail}
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
          {
            email: params.customerEmail,
            displayName: params.customerName,
            responseStatus: "needsAction",
          },
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
        visibility: "private", // Keep consultant's calendar private
      };

      const response = await calendar.events.insert({
        calendarId: "primary", // Consultant's primary calendar
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: "all", // Send invites to attendees
      });

      const createdEvent = response.data;

      if (!createdEvent.id) {
        console.error("❌ No event ID returned from consultant's calendar");
        return null;
      }

      // Extract Google Meet URL
      const meetingUrl = createdEvent.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri;

      if (!meetingUrl) {
        console.error(
          "❌ No Google Meet URL found in consultant's calendar event"
        );
        return null;
      }

      const meetingDetails: CalendarMeetingDetails = {
        meetingUrl,
        calendarEventId: createdEvent.id,
        calendarLink: createdEvent.htmlLink || "",
        consultantCalendarId: params.consultantId,
      };

      console.log(
        `✅ Meeting created in consultant ${params.consultantId}'s calendar:`,
        {
          eventId: createdEvent.id,
          meetingUrl,
          calendarLink: meetingDetails.calendarLink,
        }
      );

      return meetingDetails;
    } catch (error) {
      console.error(
        `❌ Error creating meeting in consultant ${params.consultantId}'s calendar:`,
        error
      );
      return null;
    }
  }

  /**
   * Update meeting in consultant's calendar
   */
  async updateConsultantMeeting(
    consultantId: string,
    eventId: string,
    updates: Partial<ConsultantCalendarParams>
  ): Promise<boolean> {
    try {
      const calendar = await this.getConsultantCalendarClient(consultantId);

      if (!calendar) {
        console.log(
          `❌ Cannot update - consultant ${consultantId} calendar not connected`
        );
        return false;
      }

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
        updateData.summary = `${updates.serviceName || "Consultation"} - ${updates.customerName || "Client"}`;
      }

      await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        resource: updateData,
        sendUpdates: "all",
      });

      console.log(
        `✅ Meeting updated in consultant ${consultantId}'s calendar`
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Error updating meeting in consultant ${consultantId}'s calendar:`,
        error
      );
      return false;
    }
  }

  /**
   * Cancel meeting in consultant's calendar
   */
  async cancelConsultantMeeting(
    consultantId: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const calendar = await this.getConsultantCalendarClient(consultantId);

      if (!calendar) {
        console.log(
          `❌ Cannot cancel - consultant ${consultantId} calendar not connected`
        );
        return false;
      }

      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });

      console.log(
        `✅ Meeting canceled in consultant ${consultantId}'s calendar`
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Error canceling meeting in consultant ${consultantId}'s calendar:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if consultant has connected their Google Calendar
   */
  async isConsultantConnected(consultantId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("user_tokens")
        .select("user_id")
        .eq("user_id", consultantId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error(
        `Error checking consultant ${consultantId} connection:`,
        error
      );
      return false;
    }
  }

  /**
   * Get consultant's timezone from their Google Calendar
   */
  async getConsultantTimezone(consultantId: string): Promise<string> {
    try {
      const calendar = await this.getConsultantCalendarClient(consultantId);

      if (!calendar) {
        return "UTC"; // Fallback
      }

      const calendarInfo = await calendar.calendars.get({
        calendarId: "primary",
      });

      return calendarInfo.data.timeZone || "UTC";
    } catch (error) {
      console.error(
        `Error getting consultant ${consultantId} timezone:`,
        error
      );
      return "UTC";
    }
  }
}

export const individualGoogleCalendarService =
  new IndividualGoogleCalendarService();
