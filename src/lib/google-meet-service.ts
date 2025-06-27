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
   * Create a Google Meet meeting using Google Meet REST API v2
   * This creates a unique meeting space for each consultation
   */
  static async createMeeting(
    _options: CreateMeetingOptions
  ): Promise<GoogleMeetDetails | null> {
    try {
      console.log("🚀 Creating Google Meet via REST API v2...");

      // Get access token
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.error("❌ Failed to get access token");
        return null;
      }

      console.log("✅ Access token obtained, calling Google Meet API...");

      // Call Google Meet REST API v2 - exactly like your successful test
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
    } catch (error) {
      console.error("❌ Error creating Google Meet:", error);
      return null;
    }
  }

  /**
   * Get access token using OAuth 2.0 refresh token
   */
  private static async getAccessToken(): Promise<string | null> {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const directAccessToken = process.env.GOOGLE_ACCESS_TOKEN;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      console.log("🔍 Checking OAuth credentials...");
      console.log(
        "📋 Client ID:",
        clientId ? `${clientId.substring(0, 20)}...` : "MISSING"
      );
      console.log(
        "📋 Client Secret:",
        clientSecret ? `${clientSecret.substring(0, 10)}...` : "MISSING"
      );
      console.log(
        "📋 Direct Access Token:",
        directAccessToken
          ? `${directAccessToken.substring(0, 20)}...`
          : "MISSING"
      );
      console.log(
        "📋 Refresh Token:",
        refreshToken ? `${refreshToken.substring(0, 20)}...` : "MISSING"
      );

      if (!clientId || !clientSecret) {
        console.error("❌ Missing Google OAuth client credentials");
        return null;
      }

      // OPTION 1: Use direct access token if available
      if (directAccessToken) {
        console.log("✅ Using direct access token from GOOGLE_ACCESS_TOKEN");

        // Verify the token is valid and has correct scopes
        const tokenVerifyResponse = await fetch(
          "https://www.googleapis.com/oauth2/v1/tokeninfo",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${directAccessToken}`,
            },
          }
        );

        if (tokenVerifyResponse.ok) {
          const tokenInfo = await tokenVerifyResponse.json();
          console.log("✅ Access token is valid! Token info:", {
            audience: tokenInfo.audience,
            scope: tokenInfo.scope,
            expires_in: tokenInfo.expires_in,
          });

          // Check for Google Meet scope
          if (
            tokenInfo.scope &&
            (tokenInfo.scope.includes(
              "https://www.googleapis.com/auth/meetings.space.created"
            ) ||
              tokenInfo.scope.includes(
                "https://www.googleapis.com/auth/calendar"
              ))
          ) {
            console.log("✅ Access token has correct scope for Google Meet");
            return directAccessToken;
          } else {
            console.warn(
              "⚠️ Access token doesn't have Google Meet scope. Available scopes:",
              tokenInfo.scope
            );
            console.log("🔄 Will try refresh token flow instead...");
          }
        } else {
          console.warn(
            "⚠️ Direct access token verification failed, trying refresh token..."
          );
        }
      }

      // OPTION 2: Use refresh token flow
      if (!refreshToken) {
        console.error("❌ No refresh token available for OAuth flow");
        return null;
      }

      console.log("🔑 Using refresh token to get new access token...");

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground" // Standard OAuth playground redirect URI
      );

      console.log("📋 OAuth2 Client configured with:");
      console.log(
        "   - Client ID:",
        clientId ? `${clientId.substring(0, 20)}...` : "MISSING"
      );
      console.log(
        "   - Redirect URI: https://developers.google.com/oauthplayground"
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      console.log("🔄 Attempting to refresh access token...");

      // Get access token
      const { token } = await oauth2Client.getAccessToken();

      if (!token) {
        console.error("❌ Failed to get access token from refresh token");
        return null;
      }

      console.log("✅ Access token obtained successfully via refresh token");
      console.log("📋 New access token:", `${token.substring(0, 20)}...`);

      return token;
    } catch (error) {
      console.error("❌ Error getting access token:", error);

      // Enhanced error logging
      if (error instanceof Error) {
        console.error("❌ Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack?.split("\n").slice(0, 3).join("\n"), // First 3 lines of stack
        });
      }

      // If it's an invalid_grant error, provide specific guidance
      if (error instanceof Error && error.message.includes("invalid_grant")) {
        console.error("🚨 INVALID_GRANT ERROR DIAGNOSIS:");
        console.error("   1. The refresh token might be invalid or expired");
        console.error(
          "   2. The client credentials might not match what was used in OAuth playground"
        );
        console.error(
          "   3. Make sure you're using the REFRESH token, not the ACCESS token"
        );
        console.error("💡 SOLUTION: Please verify that:");
        console.error(
          "   - GOOGLE_REFRESH_TOKEN contains the refresh_token from OAuth playground"
        );
        console.error(
          "   - OR use GOOGLE_ACCESS_TOKEN for direct access token (temporary solution)"
        );
        console.error(
          "   - Your OAuth client credentials match exactly what you used in OAuth playground"
        );
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
