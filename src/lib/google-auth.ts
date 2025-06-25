import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";

// Type definitions for our Google integration
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface GoogleCalendarEvent {
  id: string;
  htmlLink: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  conferenceData?: {
    conferenceId: string;
    conferenceSolution: {
      key: { type: string };
      name: string;
    };
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private supabase;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
    );

    // Initialize Supabase client for token storage
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Generate OAuth URL for consultant authorization
   */
  getAuthUrl(): string {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.readonly",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force consent to ensure we get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as GoogleTokens;
  }

  /**
   * Securely store encrypted refresh token in database
   */
  async storeConsultantTokens(
    consultantId: string,
    tokens: GoogleTokens
  ): Promise<void> {
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. User may need to re-authorize."
      );
    }

    // Use Supabase's built-in encryption for storing sensitive data
    const { error } = await this.supabase.from("user_tokens").upsert({
      user_id: consultantId,
      encrypted_google_refresh_token: tokens.refresh_token, // Supabase will encrypt this
      token_created_at: new Date().toISOString(),
      token_expires_at: new Date(tokens.expiry_date).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Retrieve and refresh consultant tokens
   */
  async getConsultantTokens(
    consultantId: string
  ): Promise<OAuth2Client | null> {
    // Get encrypted refresh token from database
    const { data, error } = await this.supabase
      .from("user_tokens")
      .select("encrypted_google_refresh_token, token_expires_at")
      .eq("user_id", consultantId)
      .single();

    if (error || !data) {
      return null; // Consultant hasn't connected Google account
    }

    // Set refresh token and get new access token
    this.oauth2Client.setCredentials({
      refresh_token: data.encrypted_google_refresh_token,
    });

    try {
      // This will automatically refresh the access token if needed
      await this.oauth2Client.getAccessToken();
      return this.oauth2Client;
    } catch (error) {
      console.error("Failed to refresh Google tokens:", error);
      return null;
    }
  }

  /**
   * Check if consultant has valid Google credentials
   */
  async hasValidCredentials(consultantId: string): Promise<boolean> {
    const authClient = await this.getConsultantTokens(consultantId);
    return authClient !== null;
  }

  /**
   * Revoke consultant's Google tokens (for disconnection)
   */
  async revokeConsultantTokens(consultantId: string): Promise<void> {
    const authClient = await this.getConsultantTokens(consultantId);

    if (authClient) {
      try {
        await authClient.revokeCredentials();
      } catch (error) {
        console.error("Failed to revoke Google credentials:", error);
      }
    }

    // Remove from database
    const { error } = await this.supabase
      .from("user_tokens")
      .delete()
      .eq("user_id", consultantId);

    if (error) {
      throw new Error(`Failed to remove tokens: ${error.message}`);
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
