// Google Meet Service - Service Account Implementation
// Uses Google Calendar API to create events with Google Meet links

import { GoogleAuth } from "google-auth-library";

export interface GoogleMeetDetails {
  meetingUri: string;
  meetingCode: string;
  name: string;
  config: {
    artifact_config?: {
      recording_config: {
        auto_recording_generation: "ON" | "OFF";
      };
      transcription_config: {
        auto_transcription_generation: "ON" | "OFF";
      };
      smart_notes_config: {
        auto_smart_notes_generation: "ON" | "OFF";
      };
    };
  };
}

export interface CreateMeetingOptions {
  title: string;
  description: string;
  start: Date;
  end: Date;
  consultantId: string;
  customerEmail: string;
  customerName: string;
}

export class GoogleMeetService {
  /**
   * Create a Google Meet space with transcription enabled using Google Calendar API
   */
  static async createMeetingSpace(
    options: CreateMeetingOptions
  ): Promise<GoogleMeetDetails> {
    try {
      // This is the real user in your Google Workspace you want to act on behalf of.
      // The event will be created in this user's calendar.
      const userToImpersonate = process.env.GOOGLE_CALENDAR_IMPERSONATED_USER;

      if (!userToImpersonate) {
        throw new Error(
          "❌ Configuration Error: GOOGLE_CALENDAR_IMPERSONATED_USER environment variable is not set."
        );
      }

      const accessToken = await this.getServiceAccountAccessToken(
        userToImpersonate
      );

      if (!accessToken) {
        throw new Error("Failed to get service account access token.");
      }

      // Create calendar event with Google Meet using Google Calendar API
      const eventBody = {
        summary: options.title,
        description: options.description,
        start: {
          dateTime: options.start.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: options.end.toISOString(),
          timeZone: "UTC",
        },
        // The organizer MUST be the impersonated user.
        // The service account email should NOT be here.
        // Adding a displayName makes the invitation look more legitimate.
        organizer: {
          email: userToImpersonate,
          displayName: "Intellectif",
        },
        attendees: [
          { email: options.customerEmail },
          // Adding the organizer as an accepted attendee ensures it appears on their calendar correctly.
          { email: userToImpersonate, responseStatus: "accepted" },
        ],
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      };

      console.log(
        "📋 Creating calendar event with Google Meet:",
        JSON.stringify(eventBody, null, 2)
      );

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Google Calendar API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const calendarEvent = await response.json();
      console.log("✅ Calendar event created successfully:", calendarEvent);

      // Extract Google Meet details from the calendar event
      const conferenceData = calendarEvent.conferenceData;
      if (!conferenceData || !conferenceData.entryPoints) {
        throw new Error("No Google Meet link found in calendar event response");
      }

      const meetEntryPoint = conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === "video"
      );

      if (!meetEntryPoint) {
        throw new Error("No video conference link found in calendar event");
      }

      return {
        meetingUri: meetEntryPoint.uri,
        meetingCode: meetEntryPoint.passcode || "",
        name: calendarEvent.id,
        config: {
          artifact_config: {
            recording_config: {
              auto_recording_generation: "OFF",
            },
            transcription_config: {
              auto_transcription_generation: "ON",
            },
            smart_notes_config: {
              auto_smart_notes_generation: "ON",
            },
          },
        },
      };
    } catch (error) {
      console.error("❌ Error creating meeting space:", error);
      throw error;
    }
  }

  /**
   * Get access token using a service account impersonating a domain user.
   */
  private static async getServiceAccountAccessToken(
    userToImpersonate: string
  ): Promise<string | null> {
    try {
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      // This must be the service account's own email address
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      if (!serviceAccountKey || !serviceAccountEmail) {
        console.error("❌ Missing service account credentials in .env");
        return null;
      }

      let serviceAccountCredentials;
      try {
        serviceAccountCredentials = JSON.parse(serviceAccountKey);
      } catch (e) {
        try {
          const decodedKey = Buffer.from(serviceAccountKey, "base64").toString(
            "utf-8"
          );
          serviceAccountCredentials = JSON.parse(decodedKey);
        } catch (error) {
          console.error("❌ Failed to parse service account key.", error);
          return null;
        }
      }

      // The scope is fixed for this service. Hardcode it to avoid environment-related errors.
      const scopes = ["https://www.googleapis.com/auth/calendar.events"];

      // Initialize Google Auth with credentials and the user to impersonate
      const auth = new GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: scopes,
        // This is the key to making domain-wide delegation work
        clientOptions: {
          subject: userToImpersonate,
        },
      });

      console.log(`🔄 Getting access token to act as ${userToImpersonate}...`);
      const authClient = await auth.getClient();
      const accessTokenResponse = await authClient.getAccessToken();

      if (!accessTokenResponse.token) {
        console.error("❌ Failed to retrieve access token.");
        return null;
      }

      console.log("✅ Service account access token obtained successfully.");
      return accessTokenResponse.token;
    } catch (error: any) {
      console.error("❌ Error getting service account access token:", error);
      if (error.message?.includes("invalid_grant")) {
        console.error("🔑 CRITICAL: Service account authentication failed!");
        console.error(
          "📋 Check that Domain-Wide Delegation is enabled, the impersonated user exists, and the correct scopes are authorized in your Google Workspace Admin Console."
        );
      }
      return null;
    }
  }

  /**
   * Check if the integration is configured to connect on behalf of a user.
   */
  static async isConsultantConnected(consultantId: string): Promise<boolean> {
    try {
      console.log(
        `🔍 Checking service account connectivity for consultant: ${consultantId}`
      );

      const userToImpersonate = process.env.GOOGLE_CALENDAR_IMPERSONATED_USER;
      if (!userToImpersonate) {
        console.log("❌ GOOGLE_CALENDAR_IMPERSONATED_USER is not set.");
        return false;
      }

      const accessToken = await this.getServiceAccountAccessToken(
        userToImpersonate
      );

      if (!accessToken) {
        console.log(
          `❌ Service account not configured correctly for consultant: ${consultantId}`
        );
        return false;
      }

      console.log(
        `✅ Service account available to act for consultant: ${consultantId}`
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Error checking consultant connection for ${consultantId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get authentication URL (not needed for service accounts)
   */
  static getAuthUrl(): string | null {
    console.log("ℹ️ Service accounts don't require user authentication URLs.");
    return null;
  }
}
