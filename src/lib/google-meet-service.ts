// Google Meet Service - Direct API v2 Implementation
// Uses Google Meet REST API v2 to create meeting spaces directly

import { google } from "googleapis";

export interface GoogleMeetDetails {
  meetingUri: string;
  meetingCode: string;
  name: string;
  config: {
    artifactConfig?: {
      recordingConfig: {
        autoRecording: "ON";
      };
      transcriptionConfig: {
        autoTranscription: "ON";
      };
      smartNotesConfig: {
        autoSmartNotesGeneration: "ON";
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
   * Creates a Google Meet meeting space with enhanced error handling
   */
  static async createMeeting(
    _options: CreateMeetingOptions
  ): Promise<GoogleMeetDetails | null> {
    try {
      console.log("🚀 Creating Google Meet via REST API v2...");

      // Get access token (will handle refresh token if needed)
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.error("❌ Failed to get access token for Google Meet");
        return null;
      }

      console.log("✅ Access token obtained, calling Google Meet API...");

      // Call Google Meet REST API v2 - using the working fetch approach
      const response = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        // Empty body as in your successful test
        body: JSON.stringify({}),
      });

      console.log("📡 Google Meet API Response Status:", response.status);
      console.log(
        "📡 Google Meet API Response Headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Google Meet API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return null;
      }

      const meetingData = await response.json();
      console.log("✅ Google Meet API response:", meetingData);

      // Extract meeting details from the response
      const meetingUrl = meetingData.meetingUri;
      const meetingCode = meetingData.meetingCode;
      const spaceName = meetingData.name; // e.g., "spaces/uPC1ky0qbXAB"

      if (!meetingUrl) {
        console.error("❌ No meeting URL in response");
        return null;
      }

      console.log("✅ Google Meet created successfully:");
      console.log("📅 Meeting URL:", meetingUrl);
      console.log("🔑 Meeting Code:", meetingCode);
      console.log("📍 Space Name:", spaceName);

      return {
        meetingUri: meetingUrl,
        meetingCode: meetingCode || spaceName,
        name: spaceName,
        config: {
          // Note: artifactConfig requires Google Workspace
          // Disable until workspace is set up
          // artifactConfig: {
          //   recordingConfig: { autoRecording: "ON" },
          //   transcriptionConfig: { autoTranscription: "ON" },
          //   smartNotesConfig: { autoSmartNotesGeneration: "ON" }
          // }
        },
      };
    } catch (error: any) {
      console.error("❌ Error creating Google Meet:", error);

      // Enhanced error handling for production
      if (
        error.status === 401 ||
        error.message?.includes("invalid_grant") ||
        error.message?.includes("Invalid authentication credentials")
      ) {
        console.error("🔑 REFRESH TOKEN EXPIRED OR REVOKED - Action Required:");
        console.error("1. Go to https://developers.google.com/oauthplayground");
        console.error("2. Use your own OAuth credentials");
        console.error("3. Request scopes: calendar, meet.meetings");
        console.error("4. Generate new refresh token");
        console.error("5. Update GOOGLE_REFRESH_TOKEN environment variable");
        console.error("6. Restart the application");
      } else if (error.status === 403) {
        console.error(
          "🚫 Google Meet API access denied - check API enablement and scopes"
        );
      } else if (error.status === 429) {
        console.error("⏰ Rate limit exceeded - implement exponential backoff");
      }

      return null;
    }
  }

  /**
   * Get access token with improved error handling for production
   */
  private static async getAccessToken(): Promise<string | null> {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        console.error("❌ Missing Google OAuth credentials");
        return null;
      }

      console.log("📋 Google OAuth Configuration:", {
        clientId: clientId.substring(0, 20) + "...",
        clientSecret: clientSecret
          ? "GOCSPX-" + clientSecret.substring(6, 15) + "..."
          : "Missing",
        refreshToken: refreshToken.substring(0, 20) + "...",
      });

      // Initialize OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground"
      );

      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      console.log("🔄 Refreshing Google access token...");

      // Get new access token
      const { token } = await oauth2Client.getAccessToken();

      if (!token) {
        console.error("❌ Failed to refresh access token");
        return null;
      }

      console.log("✅ Access token refreshed successfully");
      return token;
    } catch (error: any) {
      console.error("❌ Error refreshing access token:", error);

      // Production-specific error handling
      if (error.message?.includes("invalid_grant")) {
        console.error(
          "🔑 CRITICAL: Refresh token has expired or been revoked!"
        );
        console.error("📋 Error details:", {
          error: error.response?.data?.error,
          error_description: error.response?.data?.error_description,
          timestamp: new Date().toISOString(),
        });
        console.error(
          "🛠️ REQUIRED ACTION: Generate new refresh token using OAuth 2.0 Playground"
        );
      } else if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
        console.error("🌐 Network error - check internet connection");
      }

      return null;
    }
  }

  /**
   * Check if Google Meet integration is configured
   */
  static async isConsultantConnected(consultantId: string): Promise<boolean> {
    const hasOAuthCredentials = !!(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );

    console.log("🔍 Checking consultant connection:", {
      consultantId,
      hasCredentials: hasOAuthCredentials,
    });

    return hasOAuthCredentials;
  }

  /**
   * Generate OAuth URL for initial setup (if needed)
   */
  static getAuthUrl(): string | null {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) return null;

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        process.env.GOOGLE_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/meetings.space.created" as const,
        ],
        prompt: "consent",
      });

      return authUrl;
    } catch (error) {
      console.error("❌ Error generating auth URL:", error);
      return null;
    }
  }
}
