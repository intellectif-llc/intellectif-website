# 🏗️ Complete Implementation Plan

## Phase 1: Foundation & Security (Database & Auth)

### 1.1 Database Schema Updates

#### New Tables to Add:

-- Store Google OAuth tokens securely
CREATE TABLE public.user_tokens (
user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
encrypted_google_refresh_token BYTEA NOT NULL,
google_calendar_id TEXT, -- Primary calendar ID
token_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
token_expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced booking table
ALTER TABLE public.bookings
ADD COLUMN google_calendar_event_id TEXT,
ADD COLUMN google_calendar_link TEXT,
ADD COLUMN meeting_recording_url TEXT,
ADD COLUMN meeting_transcript TEXT,
ADD COLUMN ai_insights JSONB;

#### Database Functions to Add:

-- Secure token storage/retrieval functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION private.store_google_refresh_token(
p_user_id UUID,
p_refresh_token TEXT
) RETURNS VOID;

CREATE OR REPLACE FUNCTION private.get_decrypted_google_refresh_token(
p_user_id UUID
) RETURNS TEXT;

### 1.2 Environment Variables

#### Add to .env.local:

```bash
# Google API Configuration

NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Cloud (for advanced features)

GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_PUBSUB_TOPIC=booking-events
```

## Phase 2: Core Google Integration

### 2.1 New API Routes to Create

#### /api/auth/google/ - OAuth Flow

src/app/api/auth/google/
├── authorize/route.ts # Initiate OAuth flow
├── callback/route.ts # Handle OAuth callback
└── disconnect/route.ts # Remove tokens

#### /api/google/ - Google API Operations

src/app/api/google/
├── calendar/
│ ├── create-event/route.ts
│ ├── update-event/route.ts
│ └── delete-event/route.ts
└── meet/
└── create-meeting/route.ts

### 2.2 Supabase Edge Functions to Create

#### Primary Function:

supabase/functions/
└── create-google-event/
├── index.ts
└── deps.ts

#### Advanced Functions (Future):

supabase/functions/
├── process-meeting-artifacts/
├── analyze-transcript/
└── send-meeting-reminders/

### 2.3 Frontend Components to Modify

#### Consultant Setup Flow:

New: src/components/google/GoogleCalendarSetup.tsx

New: src/components/google/GoogleAuthButton.tsx

Modify: src/app/profile/page.tsx - Add Google Calendar connection

#### Booking Flow Enhancements:

Modify: src/components/booking/CustomerInformation.tsx - Show real meeting links

Modify: src/emails/BookingConfirmation.tsx - Dynamic meeting URLs

New: src/components/booking/MeetingDetails.tsx

## Phase 3: Code Changes Required

### 3.1 Files to Modify

#### Backend API Changes:

src/app/api/bookings/route.ts

Remove hardcoded meeting URL

Add Google Calendar event creation

Update meeting fields in database

src/lib/email-service.ts

Remove static meeting URL

Use dynamic meeting URL from booking record

database-functions.md

Update create_booking_with_availability_check() to handle Google integration

Add new functions for Google token management

#### Frontend Changes:

src/app/profile/page.tsx

Add Google Calendar connection UI

Show connection status

src/components/dashboard/BookingManager.tsx

Display Google Calendar event links

Show meeting management options

### 3.2 Files to Remove/Deprecate

#### Current Hardcoded Meeting Logic:

Static meeting URLs in booking creation

Hardcoded meeting links in email templates

Manual meeting password generation (not needed with Google Meet)

### 3.3 Database Functions to Update
create_booking_with_availability_check() - Add Google event creation

get_optimal_consultant_assignment() - Ensure assigned consultant has Google token

Add new RLS policies for user_tokens table

## Phase 4: Advanced Features (Event-Driven)

### 4.1 Google Cloud Pub/Sub Integration

#### Database Triggers:

-- Trigger on booking insert to publish event
CREATE TRIGGER on_booking_insert_publish_event
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION private.publish_booking_confirmed_event();

#### Google Cloud Functions:

cloud-functions/
├── process-booking/ # Handle booking events
├── capture-artifacts/ # Recording & transcript processing
├── analyze-transcript/ # AI insights generation
└── send-reminders/ # Custom notifications

### 4.2 Meeting Artifacts & AI Features

#### New Database Columns (Already planned):

meeting_recording_url - Google Drive link to recording

meeting_transcript - AI-generated transcript

ai_insights - JSON with entities, sentiment, summary

#### Processing Pipeline:

Meeting Ends → Google Workspace Events API notification

Recording Available → Download from Google Drive

Transcription → Google Speech-to-Text API

Analysis → Google Natural Language API

Storage → Update booking record with insights

## Phase 5: Implementation Timeline

### Week 1: Foundation

[ ] Install dependencies

[ ] Database schema updates

[ ] Environment variables setup

[ ] Basic OAuth flow implementation

### Week 2: Core Integration

[ ] Google Calendar API integration

[ ] Supabase Edge Function for event creation

[ ] Update booking creation flow

[ ] Test with real Google Calendar

### Week 3: Frontend & UX

[ ] Consultant Google setup UI

[ ] Updated booking confirmations

[ ] Meeting management dashboard

[ ] Email template updates

### Week 4: Advanced Features

[ ] Pub/Sub event-driven architecture

[ ] Meeting artifacts capture

[ ] AI transcript analysis

[ ] Custom reminder system

# 🔧 Technical Architecture Decisions

## OAuth Strategy:

Consultant-Level Tokens: Each consultant connects their Google account

Secure Storage: Refresh tokens encrypted in Supabase Vault

Scope Management: calendar and drive.readonly scopes

## Meeting Creation Flow:

Synchronous (Phase 2): Direct API calls during booking

Event-Driven (Phase 4): Pub/Sub for scalability and resilience

## Timezone Management:

Delegate to Google: Let Google Calendar handle timezone complexities

UTC Storage: Continue storing times in UTC in database

Display Logic: Use Google Calendar event times for display

# ⚠️ Critical Considerations
Consultant Onboarding: Must connect Google account before taking bookings

Fallback Strategy: Graceful degradation if Google APIs unavailable

Data Privacy: Secure handling of Google tokens and meeting data

Rate Limits: Implement exponential backoff for Google API calls

Testing: Sandbox environment for Google API testing

This plan maintains your existing sophisticated availability and booking system while adding professional Google Meet/Calendar integration that scales from simple synchronous operations to advanced AI-powered meeting insights.
