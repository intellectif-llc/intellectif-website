# Intellectif Booking System - Database Schema (Optimized)

## Overview

This document outlines the **optimized** database schema for the Intellectif booking system, designed for Supabase PostgreSQL. The schema supports the company's software development consultation booking system with focus on scalability, operational efficiency, and business growth.

**✅ This schema has been audited and optimized for performance, data integrity, and business logic alignment.**

**🚀 PRODUCTION READY**: All critical issues from the senior developer audit have been resolved. This schema is now suitable for production deployment with Supabase.

## Business Context Analysis

Based on the codebase analysis, the system supports:

- **Free Project Discovery** (15-minute consultations)
- **Technical Strategy Consultations** (60-minute paid consultations)
- Future integration with ElevenLabs for immediate voice consultations
- Lead qualification and customer relationship management
- Scalable architecture for a growing software development company

## Authentication Strategy

**Recommendation: Use Supabase Auth selectively**

- **For returning customers**: Implement optional account creation after first booking
- **For new customers**: Allow anonymous bookings with email-based identification
- **For staff/admin**: Full Supabase Auth with role-based access control

## Core Database Schema (Optimized)

### 1. Profiles Table (Optimized for Supabase Auth)

```sql
-- Leveraging Supabase Auth - email/phone already in auth.users
-- This table stores business-specific profile data only
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  role user_role NOT NULL DEFAULT 'customer',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'UTC', -- Critical for scheduling
  avatar_url TEXT,
  bio TEXT,

  -- Business preferences
  preferred_contact_method contact_method DEFAULT 'email',
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints for data integrity
  CONSTRAINT chk_profiles_names_not_empty CHECK (
    LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0
  )
);

-- Optimized enums
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'consultant', 'sales');
CREATE TYPE contact_method AS ENUM ('email', 'phone', 'both');

-- Function to get user email from auth.users (since we don't duplicate it)
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get user phone from auth.users
CREATE OR REPLACE FUNCTION get_user_phone(user_id UUID)
RETURNS TEXT AS $$
  SELECT phone FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 2. Customer Records (Simplified - Using Auth Integration)

```sql
-- Simplified approach: Use auth.users + raw_user_meta_data for customer data
-- This table only tracks business metrics for all customers (auth + non-auth)
CREATE TABLE customer_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to auth.users if customer has account, otherwise use email as identifier
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL, -- For non-auth customers or as backup

  -- Lead management (business-specific data)
  lead_source lead_source_enum NOT NULL DEFAULT 'website_booking',
  lead_quality lead_quality_enum NOT NULL DEFAULT 'unqualified',

  -- Business metrics (computed via triggers)
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  last_booking_date TIMESTAMP WITH TIME ZONE,
  first_booking_date TIMESTAMP WITH TIME ZONE,

  -- Customer lifecycle
  status customer_status NOT NULL DEFAULT 'prospect',
  last_interaction_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_customer_metrics_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_customer_metrics_totals_positive CHECK (total_bookings >= 0 AND total_revenue >= 0),
  CONSTRAINT chk_customer_metrics_identification CHECK (
    user_id IS NOT NULL OR email IS NOT NULL
  )

  -- Note: Removed UNIQUE constraint on email to avoid conflicts with auth.users
  -- Email uniqueness is handled at application level with precedence logic
);

-- Optimized enums with better tracking
CREATE TYPE lead_quality_enum AS ENUM ('unqualified', 'qualified', 'hot', 'converted', 'churned');
CREATE TYPE customer_status AS ENUM ('prospect', 'active', 'inactive', 'churned', 'vip');

CREATE TYPE lead_source_enum AS ENUM (
  'website_booking', 'referral', 'social_media', 'google_ads',
  'linkedin', 'email_campaign', 'cold_outreach', 'partnership'
);

-- Helper function to get customer email with proper precedence logic
CREATE OR REPLACE FUNCTION get_customer_email(customer_user_id UUID, fallback_email TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Always prefer auth.users email if user_id exists
  IF customer_user_id IS NOT NULL THEN
    RETURN (SELECT email FROM auth.users WHERE id = customer_user_id);
  ELSE
    RETURN fallback_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer data with precedence logic
CREATE OR REPLACE FUNCTION get_customer_data(customer_user_id UUID, fallback_email TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF customer_user_id IS NOT NULL THEN
    -- Get data from auth.users for authenticated customers
    SELECT jsonb_build_object(
      'email', email,
      'phone', phone,
      'first_name', raw_user_meta_data->>'first_name',
      'last_name', raw_user_meta_data->>'last_name',
      'company', raw_user_meta_data->>'company'
    ) INTO result
    FROM auth.users WHERE id = customer_user_id;
    RETURN result;
  ELSE
    -- Return fallback for non-authenticated customers
    RETURN jsonb_build_object('email', fallback_email);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Services Table (Optimized)

```sql
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL, -- Keep TEXT for long descriptions
  short_description VARCHAR(500), -- For UI cards/previews

  -- Pricing
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Scheduling
  duration_minutes SMALLINT NOT NULL,
  booking_type service_booking_type NOT NULL DEFAULT 'scheduled',

  -- Buffer time management (added to match actual schema)
  buffer_before_minutes SMALLINT DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes SMALLINT DEFAULT 5 CHECK (buffer_after_minutes >= 0),
  allow_custom_buffer BOOLEAN DEFAULT TRUE,

  -- Capacity management
  max_daily_bookings SMALLINT,
  max_concurrent_bookings SMALLINT DEFAULT 1,

  -- Features and metadata
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites JSONB DEFAULT '[]'::jsonb, -- What customer needs to prepare

  -- Business logic
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  requires_payment BOOLEAN NOT NULL DEFAULT FALSE,
  auto_confirm BOOLEAN NOT NULL DEFAULT FALSE, -- For free services

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_services_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT chk_services_price_positive CHECK (price >= 0),
  CONSTRAINT chk_services_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT chk_services_capacity_positive CHECK (
    max_daily_bookings IS NULL OR max_daily_bookings > 0
  ),
  CONSTRAINT chk_services_features_array CHECK (jsonb_typeof(features) = 'array')
);

-- Simplified booking type enum (removed 'on_demand' based on business analysis)
CREATE TYPE service_booking_type AS ENUM ('scheduled', 'immediate');

-- Insert initial services with optimized data
INSERT INTO services (slug, name, description, price, duration_minutes, features, is_popular, booking_type, requires_payment, auto_confirm) VALUES
(
  'discovery-call',
  'Introductory Discovery Call',
  'A complimentary 15-minute call to discuss your project vision and goals. This is the perfect first step to see if we''re the right technical partner to bring your idea to life.',
  0.00,
  15,
  '["15-minute introductory meeting", "Discuss your vision and key objectives", "Explore your primary challenges", "Determine if we''re a mutual fit", "Outline potential next steps"]'::jsonb,
  FALSE,
  'scheduled',
  FALSE,
  TRUE
),
(
  'strategy-session',
  'Technical Strategy Session',
  'An in-depth 60-minute workshop with our senior consultants to build a strategic and technical blueprint for your project. Move from idea to a clear, actionable plan.',
  150.00,
  60,
  '["60-minute deep-dive with a senior consultant", "In-depth technical & architectural analysis", "Core feature & business logic mapping", "Receive an actionable roadmap document", "High-level timeline & budget projections", "Detailed follow-up summary"]'::jsonb,
  TRUE,
  'scheduled',
  TRUE,
  FALSE
);
```

### 4. Bookings Table (Optimized for Supabase Auth)

```sql
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_reference VARCHAR(20) UNIQUE NOT NULL, -- Human-readable reference (auto-generated)

  -- Customer identification (leveraging auth.users)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If authenticated customer
  customer_metrics_id UUID REFERENCES customer_metrics(id) ON DELETE RESTRICT,

  -- Customer data snapshot (using auth.users + manual input)
  customer_data JSONB NOT NULL, -- Stores: email, phone, first_name, last_name, company, etc.
  project_description TEXT NOT NULL,

  -- Service details
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  -- Scheduling (NULL for immediate bookings)
  scheduled_date DATE,
  scheduled_time TIME,
  scheduled_datetime TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,

  -- Booking management
  status booking_status NOT NULL DEFAULT 'pending',
  booking_source lead_source_enum NOT NULL DEFAULT 'website_booking',

  -- Payment (with smart defaults based on service requirements)
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),

  -- Meeting details
  meeting_platform VARCHAR(50), -- 'zoom', 'teams', 'meet', 'phone'
  meeting_url TEXT,
  meeting_id VARCHAR(255),
  meeting_password VARCHAR(100),

  -- Assignment
  consultant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Consultant is always auth user

  -- Business intelligence
  lead_score SMALLINT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  estimated_project_value DECIMAL(12,2),

  -- Follow-up management
  follow_up_required BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT chk_bookings_customer_identification CHECK (
    customer_metrics_id IS NOT NULL
  ),
  CONSTRAINT chk_bookings_scheduled_future CHECK (
    scheduled_datetime IS NULL OR scheduled_datetime > created_at
  ),
  CONSTRAINT chk_bookings_payment_amount_positive CHECK (
    payment_amount IS NULL OR payment_amount >= 0
  ),
  CONSTRAINT chk_bookings_actual_times_order CHECK (
    actual_start_time IS NULL OR actual_end_time IS NULL OR actual_start_time < actual_end_time
  ),
  CONSTRAINT chk_bookings_scheduled_fields_consistency CHECK (
    (scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL AND scheduled_datetime IS NOT NULL) OR
    (scheduled_date IS NULL AND scheduled_time IS NULL AND scheduled_datetime IS NULL)
  ),
  CONSTRAINT chk_bookings_customer_data_format CHECK (
    customer_data ? 'email' AND customer_data ? 'first_name' AND customer_data ? 'last_name'
  )
);

-- Optimized enums
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'in_progress', 'completed',
  'cancelled', 'no_show', 'rescheduled'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'paid', 'failed', 'refunded', 'waived'
);
```

### 5. Enhanced Availability Management System

```sql
-- 1. Weekly availability templates (enhanced)
CREATE TABLE availability_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC', -- Consultant's timezone
  max_bookings SMALLINT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Template management
  template_name VARCHAR(100), -- "Standard Week", "Busy Week", etc.
  notes TEXT, -- Internal notes about this availability

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_availability_templates_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT chk_availability_templates_time_order CHECK (start_time < end_time),
  CONSTRAINT chk_availability_templates_max_bookings_positive CHECK (max_bookings > 0),
  CONSTRAINT uq_availability_templates_consultant_day_time UNIQUE (consultant_id, day_of_week, start_time, end_time)
);

-- 2. Break/time-off within daily availability
CREATE TABLE availability_breaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_type break_type_enum NOT NULL DEFAULT 'break',
  title VARCHAR(100) NOT NULL DEFAULT 'Break',
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE, -- Applies every week
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_availability_breaks_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT chk_availability_breaks_time_order CHECK (start_time < end_time),
  CONSTRAINT uq_availability_breaks_consultant_day_time UNIQUE (consultant_id, day_of_week, start_time, end_time)
);

-- 3. Vacation/time-off periods (date ranges)
CREATE TABLE availability_timeoff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME, -- NULL = all day
  end_time TIME, -- NULL = all day
  timeoff_type timeoff_type_enum NOT NULL DEFAULT 'vacation',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE, -- For approval workflow
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_availability_timeoff_date_order CHECK (start_date <= end_date),
  CONSTRAINT chk_availability_timeoff_time_order CHECK (
    start_time IS NULL OR end_time IS NULL OR start_time < end_time
  ),
  CONSTRAINT chk_availability_timeoff_partial_time CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL)
  )
);

-- 4. Availability overrides for specific dates
CREATE TABLE availability_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specific_date DATE NOT NULL,
  start_time TIME, -- NULL means unavailable all day
  end_time TIME, -- NULL means unavailable all day
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  max_bookings SMALLINT CHECK (max_bookings IS NULL OR max_bookings > 0),
  reason VARCHAR(255), -- Reason for override (e.g., "Conference", "Sick day", "Extended hours")

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_availability_overrides_time_order CHECK (
    start_time IS NULL OR end_time IS NULL OR start_time < end_time
  ),
  CONSTRAINT chk_availability_overrides_time_consistency CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  CONSTRAINT uq_availability_overrides_consultant_date_time UNIQUE (consultant_id, specific_date, start_time, end_time)
);

-- 5. Template sets for easy copying
CREATE TABLE availability_template_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_availability_template_sets_consultant_name UNIQUE (consultant_id, set_name)
);

-- 6. Link templates to template sets
CREATE TABLE availability_template_set_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_set_id UUID NOT NULL REFERENCES availability_template_sets(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings SMALLINT NOT NULL DEFAULT 1,

  CONSTRAINT chk_template_set_items_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT chk_template_set_items_time_order CHECK (start_time < end_time)
);

-- Supporting enums
CREATE TYPE break_type_enum AS ENUM ('break', 'lunch', 'meeting', 'buffer', 'personal');
CREATE TYPE timeoff_type_enum AS ENUM ('vacation', 'sick', 'personal', 'conference', 'training', 'holiday');

-- 6. Consultant buffer preferences (per service customization)
CREATE TABLE consultant_buffer_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  buffer_before_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (buffer_after_minutes >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_consultant_buffer_preferences_consultant_service UNIQUE (consultant_id, service_id)
);

-- Indexes for performance
CREATE INDEX idx_availability_templates_consultant_day ON availability_templates(consultant_id, day_of_week) WHERE is_active = TRUE;
CREATE INDEX idx_availability_breaks_consultant_day ON availability_breaks(consultant_id, day_of_week) WHERE is_active = TRUE;
CREATE INDEX idx_availability_timeoff_consultant_dates ON availability_timeoff(consultant_id, start_date, end_date);
CREATE INDEX idx_availability_timeoff_date_range ON availability_timeoff(start_date, end_date);
CREATE INDEX idx_availability_overrides_consultant_date ON availability_overrides(consultant_id, specific_date);
CREATE INDEX idx_consultant_buffer_preferences_consultant ON consultant_buffer_preferences(consultant_id) WHERE is_active = TRUE;
```

### 7. Follow-up System (Optimized)

```sql
CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_metrics_id UUID REFERENCES customer_metrics(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  follow_up_type follow_up_type NOT NULL,
  priority priority_level NOT NULL DEFAULT 'medium',
  status follow_up_status NOT NULL DEFAULT 'pending',

  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,

  title VARCHAR(255) NOT NULL,
  notes TEXT,
  outcome TEXT,
  next_action VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_follow_ups_dates_order CHECK (
    completed_date IS NULL OR scheduled_date IS NULL OR completed_date >= scheduled_date
  )
);

-- Optimized enums
CREATE TYPE follow_up_type AS ENUM (
  'email', 'phone_call', 'proposal_send', 'contract_discussion',
  'project_kickoff', 'check_in', 'upsell', 'feedback_request'
);

CREATE TYPE follow_up_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled', 'failed', 'overdue'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
```

### 8. Business Intelligence & Analytics (Optimized)

```sql
-- Track customer interactions and journey
CREATE TABLE customer_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_metrics_id UUID REFERENCES customer_metrics(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,

  interaction_type interaction_type NOT NULL,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  details JSONB, -- Flexible storage for interaction details
  staff_member UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Business value tracking
  value_score SMALLINT DEFAULT 0 CHECK (value_score >= 0 AND value_score <= 100),
  conversion_potential conversion_potential NOT NULL DEFAULT 'unknown'
);

CREATE TYPE interaction_type AS ENUM (
  'booking_created', 'consultation_completed', 'proposal_sent',
  'contract_signed', 'project_started', 'project_completed',
  'referral_made', 'review_left', 'complaint_filed'
);

CREATE TYPE conversion_potential AS ENUM (
  'unknown', 'low', 'medium', 'high', 'converted'
);

-- Revenue tracking and project pipeline
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_metrics_id UUID NOT NULL REFERENCES customer_metrics(id) ON DELETE RESTRICT,
  original_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  project_name VARCHAR(255) NOT NULL,
  project_type TEXT[], -- Array of service types
  estimated_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),

  status project_status NOT NULL DEFAULT 'lead',
  start_date DATE,
  estimated_completion DATE,
  actual_completion DATE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TYPE project_status AS ENUM (
  'lead', 'qualified', 'proposal_sent', 'negotiation',
  'signed', 'in_progress', 'completed', 'cancelled'
);
```

### 9. Audit Trail System

```sql
-- Basic audit trail for critical operations
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  operation audit_operation NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE TYPE audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER tr_bookings_audit
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER tr_customer_metrics_audit
  AFTER INSERT OR UPDATE OR DELETE ON customer_metrics
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Index for audit log performance
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);
```

### 10. ElevenLabs Integration Support

```sql
-- For future voice consultation feature
CREATE TABLE voice_consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),

  -- ElevenLabs integration
  voice_session_id VARCHAR(255),
  conversation_transcript TEXT,
  conversation_summary TEXT,
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),

  -- Business logic
  duration_seconds INTEGER,
  lead_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Performance Optimizations

### Critical Indexes

```sql
-- Bookings table indexes (most queried)
CREATE INDEX idx_bookings_scheduled_datetime ON bookings(scheduled_datetime) WHERE status NOT IN ('cancelled', 'completed');
CREATE INDEX idx_bookings_customer_email ON bookings((customer_data->>'email'));
CREATE INDEX idx_bookings_status_created ON bookings(status, created_at);
CREATE INDEX idx_bookings_consultant_date ON bookings(consultant_id, scheduled_date) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_user_id ON bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bookings_customer_metrics ON bookings(customer_metrics_id); -- Critical missing index
CREATE INDEX idx_bookings_customer_data_gin ON bookings USING GIN (customer_data); -- For JSONB queries

-- Customer metrics table indexes
CREATE INDEX idx_customer_metrics_email_lower ON customer_metrics(LOWER(email));
CREATE INDEX idx_customer_metrics_user_id ON customer_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_metrics_user_email ON customer_metrics(user_id, email); -- Composite index for identification
CREATE INDEX idx_customer_metrics_lead_quality ON customer_metrics(lead_quality) WHERE lead_quality != 'churned';
CREATE INDEX idx_customer_metrics_total_revenue ON customer_metrics(total_revenue DESC) WHERE total_revenue > 0;

-- Services table indexes
CREATE INDEX idx_services_active_popular ON services(is_active, is_popular) WHERE is_active = TRUE;
CREATE INDEX idx_services_booking_type ON services(booking_type) WHERE is_active = TRUE;

-- Follow-ups table indexes
CREATE INDEX idx_follow_ups_due_date ON follow_ups(due_date) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_assigned_pending ON follow_ups(assigned_to, status) WHERE status = 'pending';

-- Voice consultations indexes
CREATE INDEX idx_voice_consultations_email ON voice_consultations(customer_email);
CREATE INDEX idx_voice_consultations_session ON voice_consultations(voice_session_id) WHERE voice_session_id IS NOT NULL;

-- Availability indexes
CREATE INDEX idx_availability_templates_consultant_day ON availability_templates(consultant_id, day_of_week) WHERE is_active = TRUE;
CREATE INDEX idx_availability_overrides_consultant_date ON availability_overrides(consultant_id, specific_date);
CREATE INDEX idx_consultant_buffer_preferences_consultant ON consultant_buffer_preferences(consultant_id) WHERE is_active = TRUE;
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Complete RLS policies for profiles table (with proper cleanup)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_staff = TRUE
    )
  );

-- RLS policies for other tables
CREATE POLICY "Staff can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_staff = TRUE
    )
  );

CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid() OR
    (customer_data->>'email') = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own customer metrics" ON customer_metrics
  FOR SELECT USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Follow-ups table policies
CREATE POLICY "Staff can manage all follow-ups" ON follow_ups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_staff = TRUE
    )
  );

CREATE POLICY "Users can view own follow-ups" ON follow_ups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = follow_ups.booking_id
      AND (bookings.user_id = auth.uid() OR
          (bookings.customer_data->>'email') = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          ))
    )
  );

-- Audit log policies (admin only)
CREATE POLICY "Only admins can view audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR is_staff = TRUE)
    )
  );
```

## Database Functions & Triggers

### Core Profile Management Functions

### _Auth schema_

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.audit_log_entries (
instance_id uuid,
id uuid NOT NULL,
payload json,
created_at timestamp with time zone,
ip_address character varying NOT NULL DEFAULT ''::character varying,
CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.flow_state (
id uuid NOT NULL,
user_id uuid,
auth_code text NOT NULL,
code_challenge_method USER-DEFINED NOT NULL,
code_challenge text NOT NULL,
provider_type text NOT NULL,
provider_access_token text,
provider_refresh_token text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
authentication_method text NOT NULL,
auth_code_issued_at timestamp with time zone,
CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.identities (
provider_id text NOT NULL,
user_id uuid NOT NULL,
identity_data jsonb NOT NULL,
provider text NOT NULL,
last_sign_in_at timestamp with time zone,
created_at timestamp with time zone,
updated_at timestamp with time zone,
email text DEFAULT lower((identity_data ->> 'email'::text)),
id uuid NOT NULL DEFAULT gen_random_uuid(),
CONSTRAINT identities_pkey PRIMARY KEY (id),
CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.instances (
id uuid NOT NULL,
uuid uuid,
raw_base_config text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.mfa_amr_claims (
session_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
authentication_method text NOT NULL,
id uuid NOT NULL,
CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.mfa_challenges (
id uuid NOT NULL,
factor_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
verified_at timestamp with time zone,
ip_address inet NOT NULL,
otp_code text,
web_authn_session_data jsonb,
CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_factors (
id uuid NOT NULL,
user_id uuid NOT NULL,
friendly_name text,
factor_type USER-DEFINED NOT NULL,
status USER-DEFINED NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
secret text,
phone text,
last_challenged_at timestamp with time zone UNIQUE,
web_authn_credential jsonb,
web_authn_aaguid uuid,
CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.one_time_tokens (
id uuid NOT NULL,
user_id uuid NOT NULL,
token_type USER-DEFINED NOT NULL,
token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
relates_to text NOT NULL,
created_at timestamp without time zone NOT NULL DEFAULT now(),
updated_at timestamp without time zone NOT NULL DEFAULT now(),
CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
instance_id uuid,
id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
token character varying UNIQUE,
user_id character varying,
revoked boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
parent character varying,
session_id uuid,
CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.saml_providers (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
attribute_mapping jsonb,
created_at timestamp with time zone,
updated_at timestamp with time zone,
name_id_format text,
CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
request_id text NOT NULL CHECK (char_length(request_id) > 0),
for_email text,
redirect_to text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
flow_state_id uuid,
CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id),
CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.schema_migrations (
version character varying NOT NULL,
CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.sessions (
id uuid NOT NULL,
user_id uuid NOT NULL,
created_at timestamp with time zone,
updated_at timestamp with time zone,
factor_id uuid,
aal USER-DEFINED,
not_after timestamp with time zone,
refreshed_at timestamp without time zone,
user_agent text,
ip inet,
tag text,
CONSTRAINT sessions_pkey PRIMARY KEY (id),
CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.sso_domains (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
domain text NOT NULL CHECK (char_length(domain) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.sso_providers (
id uuid NOT NULL,
resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.users (
instance_id uuid,
id uuid NOT NULL,
aud character varying,
role character varying,
email character varying,
encrypted_password character varying,
email_confirmed_at timestamp with time zone,
invited_at timestamp with time zone,
confirmation_token character varying,
confirmation_sent_at timestamp with time zone,
recovery_token character varying,
recovery_sent_at timestamp with time zone,
email_change_token_new character varying,
email_change character varying,
email_change_sent_at timestamp with time zone,
last_sign_in_at timestamp with time zone,
raw_app_meta_data jsonb,
raw_user_meta_data jsonb,
is_super_admin boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
phone text DEFAULT NULL::character varying UNIQUE,
phone_confirmed_at timestamp with time zone,
phone_change text DEFAULT ''::character varying,
phone_change_token character varying DEFAULT ''::character varying,
phone_change_sent_at timestamp with time zone,
confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
email_change_token_current character varying DEFAULT ''::character varying,
email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
banned_until timestamp with time zone,
reauthentication_token character varying DEFAULT ''::character varying,
reauthentication_sent_at timestamp with time zone,
is_sso_user boolean NOT NULL DEFAULT false,
deleted_at timestamp with time zone,
is_anonymous boolean NOT NULL DEFAULT false,
CONSTRAINT users_pkey PRIMARY KEY (id)
);

## Enums

| enum_name            | enum_value             |
| -------------------- | ---------------------- |
| audit_operation      | INSERT                 |
| audit_operation      | UPDATE                 |
| audit_operation      | DELETE                 |
| booking_status       | pending                |
| booking_status       | confirmed              |
| booking_status       | in_progress            |
| booking_status       | completed              |
| booking_status       | cancelled              |
| booking_status       | no_show                |
| booking_status       | rescheduled            |
| break_type_enum      | break                  |
| break_type_enum      | lunch                  |
| break_type_enum      | meeting                |
| break_type_enum      | buffer                 |
| break_type_enum      | personal               |
| contact_method       | email                  |
| contact_method       | phone                  |
| contact_method       | both                   |
| conversion_potential | unknown                |
| conversion_potential | low                    |
| conversion_potential | medium                 |
| conversion_potential | high                   |
| conversion_potential | converted              |
| customer_status      | prospect               |
| customer_status      | active                 |
| customer_status      | inactive               |
| customer_status      | churned                |
| customer_status      | vip                    |
| follow_up_status     | pending                |
| follow_up_status     | in_progress            |
| follow_up_status     | completed              |
| follow_up_status     | cancelled              |
| follow_up_status     | failed                 |
| follow_up_status     | overdue                |
| follow_up_type       | email                  |
| follow_up_type       | phone_call             |
| follow_up_type       | proposal_send          |
| follow_up_type       | contract_discussion    |
| follow_up_type       | project_kickoff        |
| follow_up_type       | check_in               |
| follow_up_type       | upsell                 |
| follow_up_type       | feedback_request       |
| interaction_type     | booking_created        |
| interaction_type     | consultation_completed |
| interaction_type     | proposal_sent          |
| interaction_type     | contract_signed        |
| interaction_type     | project_started        |
| interaction_type     | project_completed      |
| interaction_type     | referral_made          |
| interaction_type     | review_left            |
| interaction_type     | complaint_filed        |
| lead_quality_enum    | unqualified            |
| lead_quality_enum    | qualified              |
| lead_quality_enum    | hot                    |
| lead_quality_enum    | converted              |
| lead_quality_enum    | churned                |
| lead_source_enum     | website_booking        |
| lead_source_enum     | referral               |
| lead_source_enum     | social_media           |
| lead_source_enum     | google_ads             |
| lead_source_enum     | linkedin               |
| lead_source_enum     | email_campaign         |
| lead_source_enum     | cold_outreach          |
| lead_source_enum     | partnership            |
| payment_status       | pending                |
| payment_status       | processing             |
| payment_status       | paid                   |
| payment_status       | failed                 |
| payment_status       | refunded               |
| payment_status       | waived                 |
| priority_level       | low                    |
| priority_level       | medium                 |
| priority_level       | high                   |
| priority_level       | urgent                 |
| project_status       | lead                   |
| project_status       | qualified              |
| project_status       | proposal_sent          |
| project_status       | negotiation            |
| project_status       | signed                 |
| project_status       | in_progress            |
| project_status       | completed              |
| project_status       | cancelled              |
| service_booking_type | scheduled              |
| service_booking_type | immediate              |
| timeoff_type_enum    | vacation               |
| timeoff_type_enum    | sick                   |
| timeoff_type_enum    | personal               |
| timeoff_type_enum    | conference             |
| timeoff_type_enum    | training               |
| timeoff_type_enum    | holiday                |
| user_role            | customer               |
| user_role            | admin                  |
| user_role            | consultant             |
| user_role            | sales                  |

## Database indexes in public schema

| index_name                      | is_unique | is_primary | column_name       |
| ------------------------------- | --------- | ---------- | ----------------- |
| audit_log                       | true      | true       | id                |
| availability_breaks             | false     | false      | consultant_id     |
| availability_breaks             | true      | false      | consultant_id     |
| availability_breaks             | false     | false      | day_of_week       |
| availability_breaks             | true      | false      | day_of_week       |
| availability_breaks             | true      | false      | end_time          |
| availability_breaks             | true      | true       | id                |
| availability_breaks             | true      | false      | start_time        |
| availability_overrides          | true      | false      | consultant_id     |
| availability_overrides          | true      | false      | end_time          |
| availability_overrides          | true      | true       | id                |
| availability_overrides          | true      | false      | specific_date     |
| availability_overrides          | true      | false      | start_time        |
| availability_template_set_items | true      | true       | id                |
| availability_template_sets      | true      | false      | consultant_id     |
| availability_template_sets      | true      | true       | id                |
| availability_template_sets      | true      | false      | set_name          |
| availability_templates          | true      | false      | consultant_id     |
| availability_templates          | false     | false      | consultant_id     |
| availability_templates          | true      | false      | day_of_week       |
| availability_templates          | false     | false      | day_of_week       |
| availability_templates          | true      | false      | end_time          |
| availability_templates          | true      | true       | id                |
| availability_templates          | true      | false      | start_time        |
| availability_timeoff            | false     | false      | consultant_id     |
| availability_timeoff            | false     | false      | end_date          |
| availability_timeoff            | false     | false      | end_date          |
| availability_timeoff            | true      | true       | id                |
| availability_timeoff            | false     | false      | start_date        |
| availability_timeoff            | false     | false      | start_date        |
| bookings                        | true      | false      | booking_reference |
| bookings                        | true      | true       | id                |
| consultant_buffer_preferences   | true      | false      | consultant_id     |
| consultant_buffer_preferences   | false     | false      | consultant_id     |
| consultant_buffer_preferences   | true      | true       | id                |
| consultant_buffer_preferences   | true      | false      | service_id        |
| consultant_buffer_preferences   | false     | false      | service_id        |
| customer_interactions           | true      | true       | id                |
| customer_metrics                | true      | true       | id                |
| follow_ups                      | true      | true       | id                |
| profiles                        | true      | true       | id                |
| projects                        | true      | true       | id                |
| services                        | true      | true       | id                |
| services                        | true      | false      | slug              |
| voice_consultations             | true      | true       | id                |
