interface MeetingProvider {
  createMeeting(params: CreateMeetingParams): Promise<MeetingDetails | null>;
  updateMeeting(
    meetingId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<boolean>;
  cancelMeeting(meetingId: string): Promise<boolean>;
}

export interface CreateMeetingParams {
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
  meetingUrl: string;
  meetingId: string;
  meetingPassword?: string;
  calendarLink?: string;
}

// Zoom Provider (Professional Choice)
class ZoomMeetingProvider implements MeetingProvider {
  async createMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    try {
      const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ZOOM_JWT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: `${params.serviceName} - ${params.customerName}`,
          type: 2, // Scheduled meeting
          start_time: params.startTime,
          duration: Math.floor(
            (new Date(params.endTime).getTime() -
              new Date(params.startTime).getTime()) /
              60000
          ),
          timezone: params.timezone,
          settings: {
            waiting_room: true,
            join_before_host: false,
            mute_upon_entry: true,
            auto_recording: "cloud", // Professional recording
          },
        }),
      });

      const meeting = await response.json();

      return {
        meetingUrl: meeting.join_url,
        meetingId: meeting.id.toString(),
        meetingPassword: meeting.password,
      };
    } catch (error) {
      console.error("Zoom meeting creation failed:", error);
      return null;
    }
  }

  async updateMeeting(
    meetingId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    // Implement Zoom meeting update
    return true;
  }

  async cancelMeeting(meetingId: string): Promise<boolean> {
    // Implement Zoom meeting cancellation
    return true;
  }
}

// Microsoft Teams Provider (Enterprise Choice)
class TeamsMeetingProvider implements MeetingProvider {
  async createMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    try {
      // Use Microsoft Graph API to create Teams meeting
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/onlineMeetings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MICROSOFT_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: `${params.serviceName} - ${params.customerName}`,
            startDateTime: params.startTime,
            endDateTime: params.endTime,
          }),
        }
      );

      const meeting = await response.json();

      return {
        meetingUrl: meeting.joinWebUrl,
        meetingId: meeting.id,
      };
    } catch (error) {
      console.error("Teams meeting creation failed:", error);
      return null;
    }
  }

  async updateMeeting(
    meetingId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    return true;
  }

  async cancelMeeting(meetingId: string): Promise<boolean> {
    return true;
  }
}

// Simple Jitsi Provider (Free, Self-hosted Option)
class JitsiMeetingProvider implements MeetingProvider {
  async createMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    // Generate unique room name
    const roomName = `intellectif-${params.bookingId}-${Date.now()}`;

    return {
      meetingUrl: `https://meet.jit.si/${roomName}`,
      meetingId: roomName,
    };
  }

  async updateMeeting(
    meetingId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    return true; // Jitsi doesn't need updates
  }

  async cancelMeeting(meetingId: string): Promise<boolean> {
    return true; // Jitsi rooms auto-expire
  }
}

// Meeting Service Factory
class MeetingService {
  private provider: MeetingProvider;

  constructor() {
    const providerType = process.env.MEETING_PROVIDER || "jitsi";

    switch (providerType) {
      case "zoom":
        this.provider = new ZoomMeetingProvider();
        break;
      case "teams":
        this.provider = new TeamsMeetingProvider();
        break;
      case "jitsi":
      default:
        this.provider = new JitsiMeetingProvider();
        break;
    }
  }

  async createMeeting(
    params: CreateMeetingParams
  ): Promise<MeetingDetails | null> {
    console.log(`🎥 Creating meeting with ${this.provider.constructor.name}:`, {
      bookingId: params.bookingId,
      serviceName: params.serviceName,
      startTime: params.startTime,
    });

    const result = await this.provider.createMeeting(params);

    if (result) {
      console.log("✅ Meeting created successfully:", {
        meetingUrl: result.meetingUrl,
        meetingId: result.meetingId,
      });
    } else {
      console.log("❌ Meeting creation failed");
    }

    return result;
  }

  async updateMeeting(
    meetingId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<boolean> {
    return this.provider.updateMeeting(meetingId, params);
  }

  async cancelMeeting(meetingId: string): Promise<boolean> {
    return this.provider.cancelMeeting(meetingId);
  }
}

export const meetingService = new MeetingService();
