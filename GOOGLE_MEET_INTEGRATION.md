# Google Meet Integration Documentation

## Overview

This document describes the **simplified** Google Meet integration for the booking system. Unlike complex approaches that require individual OAuth connections for each consultant, this implementation uses the **Google Meet REST API** with either:

1. **Service Account Authentication** (Recommended) - No individual OAuth needed!
2. **OAuth 2.0 with Refresh Token** (Alternative) - One-time company setup

## Key Benefits

✅ **No Individual OAuth Required** - Consultants don't need to connect their Google accounts  
✅ **Company-Level Integration** - Single setup for entire organization  
✅ **Simple Management** - No token management per consultant  
✅ **Automatic Meeting Creation** - Direct API calls to create Google Meet spaces  
✅ **Clean Architecture** - Uses official Google Meet REST API

## Architecture

```
Booking Request → Google Meet Service → Google Meet REST API → Meeting Space Created
                      ↓
              Meeting URL Stored in Database
                      ↓
              Email Sent to Customer with Meet Link
```

## Authentication Methods

### Method 1: Service Account (Recommended)

**Setup Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Meet API
4. Go to IAM & Admin → Service Accounts
5. Create a new service account
6. Download the JSON key file
7. Set environment variables:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"..."}
```

**Benefits:**

- No OAuth flow required
- More secure for server-to-server communication
- No token refresh needed
- Works immediately

### Method 2: OAuth 2.0 with Refresh Token (Alternative)

**Setup Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Use [OAuth Playground](https://developers.google.com/oauthplayground) to get refresh token
4. Set environment variables:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

## Environment Variables

Add to your `.env.local`:

```env
# Google Meet API Configuration
# Choose ONE of the following methods:

# Method 1: Service Account (Recommended)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Method 2: OAuth 2.0 (Alternative)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

## API Endpoints

The integration automatically works with existing booking endpoints:

### POST /api/bookings

Creates a booking and automatically generates a Google Meet link.

### POST /api/stripe/webhook

Handles Stripe payment completion and creates Google Meet link.

## Database Schema

The existing database schema already supports Google Meet integration:

```sql
-- bookings table includes:
meeting_platform VARCHAR      -- 'google_meet'
meeting_url TEXT             -- 'https://meet.google.com/abc-defg-hij'
meeting_id VARCHAR           -- 'abc-defg-hij'
meeting_password VARCHAR     -- NULL (Google Meet doesn't use passwords)
meeting_transcript TEXT      -- For future AI integration
ai_insights JSONB           -- For future AI analysis
```

## Code Implementation

### GoogleMeetService

```typescript
import { GoogleMeetService } from "@/lib/google-meet-service";

// Create meeting
const meetingDetails = await GoogleMeetService.createMeeting({
  title: "Consultation with John Doe",
  description: "Web development consultation",
  start: new Date("2024-01-15T10:00:00Z"),
  end: new Date("2024-01-15T11:00:00Z"),
  consultantId: "consultant-uuid",
  customerEmail: "customer@example.com",
  customerName: "John Doe",
});

// Returns:
// {
//   meeting_url: 'https://meet.google.com/abc-defg-hij',
//   meeting_platform: 'google_meet',
//   meeting_id: 'abc-defg-hij',
//   meeting_password: undefined
// }
```

### Integration Flow

1. **Customer books appointment** → Booking API triggered
2. **Check authentication** → Service account or OAuth credentials
3. **Create Google Meet space** → Direct API call to Google Meet REST API
4. **Store meeting data** → Save meeting URL and ID in database
5. **Send confirmation email** → Include Google Meet link

## Testing

Run the integration test to verify setup:

```bash
node test_google_meet_integration.js
```

The test will verify:

- Environment variables are configured
- Authentication is working
- Google Meet API is accessible
- Meeting space creation works

## Error Handling

The service includes comprehensive error handling:

```typescript
// Graceful fallback if Google Meet creation fails
const meetingDetails = await GoogleMeetService.createMeeting(options);
if (!meetingDetails) {
  console.log(
    "⚠️ Google Meet creation failed, continuing without meeting link"
  );
  // Booking continues without meeting link
}
```

## Troubleshooting

### Common Issues

**1. "Failed to authenticate with service account"**

- Verify GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
- Check that Google Meet API is enabled
- Ensure service account has correct permissions

**2. "No valid authentication method available"**

- Set either service account OR OAuth credentials
- Check environment variables are loaded correctly

**3. "API not enabled"**

- Enable Google Meet API in Google Cloud Console
- Wait a few minutes for API to be fully enabled

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=google-meet-service
```

## Security Considerations

### Service Account Security

- Store service account key securely
- Never commit JSON key to version control
- Use environment variables or secure secret management
- Rotate keys periodically

### OAuth Security

- Store refresh tokens securely
- Use HTTPS for all redirects
- Implement proper CSRF protection
- Monitor for unusual API usage

## Rate Limits

Google Meet API has the following limits:

- **Read requests**: 6,000 per minute per project
- **Write requests**: 1,000 per minute per project
- **Meeting creation**: 100 per minute per project

The service handles rate limiting gracefully with exponential backoff.

## Future Enhancements

### AI Integration (Already Supported)

The database schema includes fields for future AI features:

- `meeting_transcript` - Store meeting transcripts
- `ai_insights` - Store AI analysis results

### Advanced Features

- Meeting recording management
- Participant tracking
- Meeting analytics
- Custom meeting settings

## Support

For issues or questions:

1. Check the troubleshooting section
2. Run the test script to verify configuration
3. Review Google Cloud Console for API errors
4. Check application logs for detailed error messages

## Conclusion

This Google Meet integration provides a simple, robust solution for adding video conferencing to your booking system. By using the official Google Meet REST API with service account authentication, you avoid the complexity of individual OAuth connections while maintaining enterprise-grade security and reliability.
