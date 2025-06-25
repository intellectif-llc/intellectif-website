/**
 * Simple Meeting Service
 * Creates unique meeting spaces for each booking with minimal complexity
 */

export interface SimpleMeetingData {
  meeting_url: string;
  meeting_platform: string;
  meeting_id: string;
  meeting_password?: string;
}

export interface CreateMeetingOptions {
  bookingId: string;
  customerName: string;
  serviceName: string;
  scheduledDateTime: string; // ISO string
}

/**
 * Simple meeting service that creates unique meeting spaces
 * No API keys required, works immediately
 */
export class SimpleMeetingService {
  /**
   * Creates a unique meeting space for a booking
   */
  static async createMeeting(
    options: CreateMeetingOptions
  ): Promise<SimpleMeetingData> {
    const provider = process.env.MEETING_PROVIDER || "jitsi";

    switch (provider.toLowerCase()) {
      case "jitsi":
        return this.createJitsiMeeting(options);
      case "whereby":
        return this.createWherebyMeeting(options);
      case "google_meet_simple":
        return this.createSimpleGoogleMeet(options);
      default:
        return this.createJitsiMeeting(options);
    }
  }

  /**
   * Jitsi Meet - Free, no API required, works immediately
   */
  private static createJitsiMeeting(
    options: CreateMeetingOptions
  ): SimpleMeetingData {
    // Create a unique room name using booking ID and timestamp
    const roomName = `intellectif-${options.bookingId}-${Date.now()}`;
    const meetingUrl = `https://meet.jit.si/${roomName}`;

    return {
      meeting_url: meetingUrl,
      meeting_platform: "jitsi",
      meeting_id: roomName,
      meeting_password: undefined, // Jitsi uses room name as identifier
    };
  }

  /**
   * Whereby - Simple, professional, free tier available
   */
  private static createWherebyMeeting(
    options: CreateMeetingOptions
  ): SimpleMeetingData {
    // Generate a unique room name
    const roomName = `intellectif-consultation-${options.bookingId}`;
    const meetingUrl = `https://whereby.com/${roomName}`;

    return {
      meeting_url: meetingUrl,
      meeting_platform: "whereby",
      meeting_id: roomName,
      meeting_password: undefined,
    };
  }

  /**
   * Simple Google Meet - Uses meet.google.com with generated codes
   * Note: This creates a meeting URL but may require the host to start it
   */
  private static createSimpleGoogleMeet(
    options: CreateMeetingOptions
  ): SimpleMeetingData {
    // Generate a unique meeting code (Google Meet style: xxx-xxxx-xxx)
    const generateMeetCode = () => {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const part1 = Array.from(
        { length: 3 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      const part2 = Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      const part3 = Array.from(
        { length: 3 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      return `${part1}-${part2}-${part3}`;
    };

    const meetingCode = generateMeetCode();
    const meetingUrl = `https://meet.google.com/${meetingCode}`;

    return {
      meeting_url: meetingUrl,
      meeting_platform: "google_meet",
      meeting_id: meetingCode,
      meeting_password: undefined,
    };
  }

  /**
   * Validate if a meeting URL is accessible
   */
  static validateMeetingUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validDomains = [
        "meet.jit.si",
        "whereby.com",
        "meet.google.com",
        "zoom.us",
        "teams.microsoft.com",
      ];
      return validDomains.some((domain) => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Get meeting instructions for different platforms
   */
  static getMeetingInstructions(platform: string): string {
    switch (platform.toLowerCase()) {
      case "jitsi":
        return "Click the meeting link to join. No account required. You can join from your browser or download the Jitsi Meet app.";
      case "whereby":
        return "Click the meeting link to join. No account required. Works best in Chrome, Firefox, or Safari browsers.";
      case "google_meet":
        return "Click the meeting link to join. You may need a Google account. The meeting will be started by your consultant.";
      default:
        return "Click the meeting link at the scheduled time to join your consultation.";
    }
  }
}
