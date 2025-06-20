-- Intellectif Booking System - Functions & Triggers Setup
-- Run this AFTER creating tables and enums
-- This adds all profile management functions and business logic

-- ==========================================
-- SECTION 1: Profile Management Functions
-- ==========================================

-- 1. Helper functions for getting user data from auth.users
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_phone(user_id UUID)
RETURNS TEXT AS $$
  SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 2. Function to handle new user profile creation (updated to handle both full_name and separate names)
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  full_name_val TEXT;
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Get first_name and last_name from metadata (preferred)
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- If separate names are empty, try to parse full_name as fallback
  IF first_name_val = '' AND last_name_val = '' THEN
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    IF full_name_val != '' THEN
      first_name_val := SPLIT_PART(full_name_val, ' ', 1);
      last_name_val := TRIM(SUBSTRING(full_name_val FROM LENGTH(SPLIT_PART(full_name_val, ' ', 1)) + 2));
    END IF;
  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (id, first_name, last_name, company)
  VALUES (
    NEW.id,
    first_name_val,
    last_name_val,
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Comprehensive profile update function
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  first_name_param TEXT DEFAULT NULL,
  last_name_param TEXT DEFAULT NULL,
  phone_param TEXT DEFAULT NULL,
  company_param TEXT DEFAULT NULL,
  timezone_param TEXT DEFAULT NULL,
  preferred_contact_method_param contact_method DEFAULT NULL,
  marketing_consent_param BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  affected_rows INTEGER;
BEGIN
  -- Validate input
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Update auth.users metadata (store phone in metadata to avoid SMS provider requirement)
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'first_name', COALESCE(first_name_param, raw_user_meta_data->>'first_name', ''),
        'last_name', COALESCE(last_name_param, raw_user_meta_data->>'last_name', ''),
        'company', COALESCE(company_param, raw_user_meta_data->>'company', ''),
        'phone', COALESCE(phone_param, raw_user_meta_data->>'phone', '')
      ),
    updated_at = NOW()
  WHERE id = user_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows = 0 THEN
    RETURN json_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  -- Update or insert into profiles table
  INSERT INTO profiles (
    id, 
    first_name, 
    last_name, 
    company, 
    timezone,
    preferred_contact_method,
    marketing_consent,
    updated_at
  )
  VALUES (
    user_id,
    COALESCE(first_name_param, ''),
    COALESCE(last_name_param, ''),
    COALESCE(company_param, ''),
    COALESCE(timezone_param, 'UTC'),
    COALESCE(preferred_contact_method_param, 'email'::contact_method),
    COALESCE(marketing_consent_param, FALSE),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    company = COALESCE(EXCLUDED.company, profiles.company),
    timezone = COALESCE(EXCLUDED.timezone, profiles.timezone),
    preferred_contact_method = COALESCE(EXCLUDED.preferred_contact_method, profiles.preferred_contact_method),
    marketing_consent = COALESCE(EXCLUDED.marketing_consent, profiles.marketing_consent),
    updated_at = NOW()
  WHERE 
    EXCLUDED.first_name IS NOT NULL OR
    EXCLUDED.last_name IS NOT NULL OR
    EXCLUDED.company IS NOT NULL OR
    EXCLUDED.timezone IS NOT NULL OR
    EXCLUDED.preferred_contact_method IS NOT NULL OR
    EXCLUDED.marketing_consent IS NOT NULL;

  -- Return success result
  SELECT json_build_object(
    'success', true, 
    'user_id', user_id,
    'updated_at', NOW()
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get complete user profile data
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auth_data RECORD;
  profile_data RECORD;
BEGIN
  -- Get auth data
  SELECT email, raw_user_meta_data, created_at, updated_at
  INTO auth_data
  FROM auth.users 
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get profile data
  SELECT *
  INTO profile_data
  FROM profiles 
  WHERE id = user_id;

  -- Build comprehensive result
  SELECT json_build_object(
    'success', true,
    'user_id', user_id,
    'auth_data', json_build_object(
      'email', auth_data.email,
      'phone', auth_data.raw_user_meta_data->>'phone',
      'metadata', auth_data.raw_user_meta_data,
      'created_at', auth_data.created_at,
      'updated_at', auth_data.updated_at
    ),
    'profile_data', CASE 
      WHEN profile_data IS NOT NULL THEN
        json_build_object(
          'first_name', profile_data.first_name,
          'last_name', profile_data.last_name,
          'company', profile_data.company,
          'role', profile_data.role,
          'is_staff', profile_data.is_staff,
          'timezone', profile_data.timezone,
          'preferred_contact_method', profile_data.preferred_contact_method,
          'marketing_consent', profile_data.marketing_consent,
          'created_at', profile_data.created_at,
          'updated_at', profile_data.updated_at
        )
      ELSE NULL
    END
  ) INTO result;

  RETURN result;
EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 2: Complete RLS Policies for Profiles
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- Create comprehensive RLS policies for profiles
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

-- ==========================================
-- SECTION 3: Business Logic Functions (Future Use)
-- ==========================================

-- Booking reference generation (for when you implement bookings)
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1;

CREATE OR REPLACE FUNCTION generate_booking_reference() RETURNS VARCHAR(20) AS $$
DECLARE
    ref VARCHAR(20);
    current_date_str TEXT;
    seq_val INTEGER;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');

    -- Loop to handle potential race conditions
    WHILE attempt < max_attempts LOOP
        seq_val := NEXTVAL('booking_ref_seq');
        ref := 'INT-' || current_date_str || '-' || LPAD(seq_val::TEXT, 4, '0');

        -- Check if reference already exists (when bookings table exists)
        -- IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_reference = ref) THEN
        --     RETURN ref;
        -- END IF;
        
        -- For now, just return the reference
        RETURN ref;

        attempt := attempt + 1;
    END LOOP;

    -- Fallback with timestamp if all attempts fail
    ref := 'INT-' || current_date_str || '-' || LPAD(seq_val::TEXT, 4, '0') || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Lead scoring function (for future use)
CREATE OR REPLACE FUNCTION calculate_lead_score(
  service_price DECIMAL,
  company_size TEXT,
  project_description TEXT
) RETURNS SMALLINT AS $$
BEGIN
  -- Business logic for lead scoring
  RETURN CASE
    WHEN service_price > 0 THEN 70  -- Paid consultation = higher intent
    WHEN LENGTH(project_description) > 100 THEN 50  -- Detailed description = serious
    ELSE 30  -- Basic free consultation
  END;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SECTION 4: Grant Permissions
-- ==========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_phone TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_lead_score TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON SEQUENCE booking_ref_seq TO authenticated;

-- ==========================================
-- SECTION 5: UPDATE COMMAND FOR EXISTING USERS
-- ==========================================

-- Run this command in Supabase SQL Editor to update the trigger function for existing installations:
/*
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  full_name_val TEXT;
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Get first_name and last_name from metadata (preferred)
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- If separate names are empty, try to parse full_name as fallback
  IF first_name_val = '' AND last_name_val = '' THEN
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    IF full_name_val != '' THEN
      first_name_val := SPLIT_PART(full_name_val, ' ', 1);
      last_name_val := TRIM(SUBSTRING(full_name_val FROM LENGTH(SPLIT_PART(full_name_val, ' ', 1)) + 2));
    END IF;
  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (id, first_name, last_name, company)
  VALUES (
    NEW.id,
    first_name_val,
    last_name_val,
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- ==========================================
-- SECTION 6: Verification Queries
-- ==========================================

-- Check if all functions were created successfully
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_user_profile',
  'get_user_profile', 
  'get_user_email',
  'get_user_phone',
  'handle_new_user',
  'calculate_lead_score',
  'generate_booking_reference'
)
ORDER BY routine_name;

-- Check if triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name = 'on_auth_user_created';

-- Check RLS policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ==========================================
-- SECTION 7: Enhanced Availability Management Functions
-- ==========================================

-- 1. Function to calculate actual availability for a specific day
CREATE OR REPLACE FUNCTION calculate_daily_availability(
  consultant_id_param UUID,
  target_date DATE
) RETURNS TABLE (
  available_start TIME,
  available_end TIME,
  max_bookings SMALLINT
) AS $$
DECLARE
  day_of_week_val SMALLINT;
  template_record RECORD;
  break_record RECORD;
  timeoff_record RECORD;
  current_start TIME;
  current_end TIME;
BEGIN
  -- Get day of week (0 = Sunday, 6 = Saturday)
  day_of_week_val := EXTRACT(DOW FROM target_date);
  
  -- Check for vacation/time-off that blocks the entire day
  SELECT * INTO timeoff_record
  FROM availability_timeoff
  WHERE consultant_id = consultant_id_param
    AND target_date BETWEEN start_date AND end_date
    AND start_time IS NULL -- All-day time off
    AND is_approved = TRUE;
    
  IF FOUND THEN
    -- No availability on this day
    RETURN;
  END IF;
  
  -- Get base availability template for this day
  FOR template_record IN
    SELECT start_time, end_time, max_bookings
    FROM availability_templates
    WHERE consultant_id = consultant_id_param
      AND day_of_week = day_of_week_val
      AND is_active = TRUE
    ORDER BY start_time
  LOOP
    current_start := template_record.start_time;
    current_end := template_record.end_time;
    
    -- Check for partial-day time-off that affects this slot
    SELECT * INTO timeoff_record
    FROM availability_timeoff
    WHERE consultant_id = consultant_id_param
      AND target_date BETWEEN start_date AND end_date
      AND start_time IS NOT NULL -- Partial day time off
      AND is_approved = TRUE
      AND (
        (start_time <= current_start AND end_time > current_start) OR
        (start_time < current_end AND end_time >= current_end) OR
        (start_time >= current_start AND end_time <= current_end)
      );
      
    IF FOUND THEN
      -- Skip this slot if blocked by time-off
      CONTINUE;
    END IF;
    
    -- Apply breaks to split the availability
    FOR break_record IN
      SELECT start_time, end_time
      FROM availability_breaks
      WHERE consultant_id = consultant_id_param
        AND day_of_week = day_of_week_val
        AND is_active = TRUE
        AND start_time < current_end
        AND end_time > current_start
      ORDER BY start_time
    LOOP
      -- Return availability before the break
      IF current_start < break_record.start_time THEN
        available_start := current_start;
        available_end := break_record.start_time;
        max_bookings := template_record.max_bookings;
        RETURN NEXT;
      END IF;
      
      -- Update current start to after the break
      IF break_record.end_time > current_start THEN
        current_start := break_record.end_time;
      END IF;
    END LOOP;
    
    -- Return remaining availability after all breaks
    IF current_start < current_end THEN
      available_start := current_start;
      available_end := current_end;
      max_bookings := template_record.max_bookings;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to copy availability template to another day
CREATE OR REPLACE FUNCTION copy_availability_template(
  consultant_id_param UUID,
  source_day SMALLINT,
  target_day SMALLINT
) RETURNS JSON AS $$
DECLARE
  template_record RECORD;
  break_record RECORD;
  copied_templates INTEGER := 0;
  copied_breaks INTEGER := 0;
BEGIN
  -- Validate day range
  IF source_day < 0 OR source_day > 6 OR target_day < 0 OR target_day > 6 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid day of week');
  END IF;
  
  -- Delete existing templates for target day
  DELETE FROM availability_templates
  WHERE consultant_id = consultant_id_param AND day_of_week = target_day;
  
  DELETE FROM availability_breaks
  WHERE consultant_id = consultant_id_param AND day_of_week = target_day;
  
  -- Copy availability templates
  FOR template_record IN
    SELECT start_time, end_time, timezone, max_bookings, template_name, notes
    FROM availability_templates
    WHERE consultant_id = consultant_id_param
      AND day_of_week = source_day
      AND is_active = TRUE
  LOOP
    INSERT INTO availability_templates (
      consultant_id, day_of_week, start_time, end_time, timezone,
      max_bookings, template_name, notes, is_active
    ) VALUES (
      consultant_id_param, target_day, template_record.start_time,
      template_record.end_time, template_record.timezone,
      template_record.max_bookings, template_record.template_name,
      template_record.notes, TRUE
    );
    copied_templates := copied_templates + 1;
  END LOOP;
  
  -- Copy breaks
  FOR break_record IN
    SELECT start_time, end_time, break_type, title
    FROM availability_breaks
    WHERE consultant_id = consultant_id_param
      AND day_of_week = source_day
      AND is_active = TRUE
  LOOP
    INSERT INTO availability_breaks (
      consultant_id, day_of_week, start_time, end_time,
      break_type, title, is_recurring, is_active
    ) VALUES (
      consultant_id_param, target_day, break_record.start_time,
      break_record.end_time, break_record.break_type,
      break_record.title, TRUE, TRUE
    );
    copied_breaks := copied_breaks + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'copied_templates', copied_templates,
    'copied_breaks', copied_breaks
  );
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to save and apply template set
CREATE OR REPLACE FUNCTION save_template_set(
  consultant_id_param UUID,
  set_name_param VARCHAR(100),
  description_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  template_set_id UUID;
  template_record RECORD;
BEGIN
  -- Create or update template set
  INSERT INTO availability_template_sets (consultant_id, set_name, description)
  VALUES (consultant_id_param, set_name_param, description_param)
  ON CONFLICT (consultant_id, set_name) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO template_set_id;
  
  -- Clear existing items
  DELETE FROM availability_template_set_items WHERE template_set_id = template_set_id;
  
  -- Save current templates to set
  FOR template_record IN
    SELECT day_of_week, start_time, end_time, max_bookings
    FROM availability_templates
    WHERE consultant_id = consultant_id_param AND is_active = TRUE
  LOOP
    INSERT INTO availability_template_set_items (
      template_set_id, day_of_week, start_time, end_time, max_bookings
    ) VALUES (
      template_set_id, template_record.day_of_week,
      template_record.start_time, template_record.end_time,
      template_record.max_bookings
    );
  END LOOP;
  
  RETURN json_build_object('success', true, 'template_set_id', template_set_id);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to apply template set
CREATE OR REPLACE FUNCTION apply_template_set(
  consultant_id_param UUID,
  template_set_id_param UUID
) RETURNS JSON AS $$
DECLARE
  item_record RECORD;
  applied_count INTEGER := 0;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM availability_template_sets
    WHERE id = template_set_id_param AND consultant_id = consultant_id_param
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Template set not found');
  END IF;
  
  -- Clear existing templates
  DELETE FROM availability_templates WHERE consultant_id = consultant_id_param;
  
  -- Apply template set
  FOR item_record IN
    SELECT day_of_week, start_time, end_time, max_bookings
    FROM availability_template_set_items
    WHERE template_set_id = template_set_id_param
  LOOP
    INSERT INTO availability_templates (
      consultant_id, day_of_week, start_time, end_time, max_bookings, is_active
    ) VALUES (
      consultant_id_param, item_record.day_of_week,
      item_record.start_time, item_record.end_time,
      item_record.max_bookings, TRUE
    );
    applied_count := applied_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'applied_templates', applied_count);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get availability summary for a date range
CREATE OR REPLACE FUNCTION get_availability_summary(
  consultant_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
) RETURNS TABLE (
  date_val DATE,
  day_name TEXT,
  total_hours DECIMAL(4,2),
  available_slots INTEGER,
  has_timeoff BOOLEAN
) AS $$
DECLARE
  current_date DATE;
  availability_record RECORD;
  slot_count INTEGER;
  total_minutes INTEGER;
BEGIN
  current_date := start_date_param;
  
  WHILE current_date <= end_date_param LOOP
    slot_count := 0;
    total_minutes := 0;
    
    -- Calculate availability for this date
    FOR availability_record IN
      SELECT available_start, available_end, max_bookings
      FROM calculate_daily_availability(consultant_id_param, current_date)
    LOOP
      total_minutes := total_minutes + EXTRACT(EPOCH FROM (availability_record.available_end - availability_record.available_start)) / 60;
      slot_count := slot_count + availability_record.max_bookings;
    END LOOP;
    
    date_val := current_date;
    day_name := TO_CHAR(current_date, 'Day');
    total_hours := total_minutes / 60.0;
    available_slots := slot_count;
    has_timeoff := EXISTS (
      SELECT 1 FROM availability_timeoff
      WHERE consultant_id = consultant_id_param
        AND current_date BETWEEN start_date AND end_date
        AND is_approved = TRUE
    );
    
    RETURN NEXT;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for availability functions
GRANT EXECUTE ON FUNCTION calculate_daily_availability TO authenticated;
GRANT EXECUTE ON FUNCTION copy_availability_template TO authenticated;
GRANT EXECUTE ON FUNCTION save_template_set TO authenticated;
GRANT EXECUTE ON FUNCTION apply_template_set TO authenticated;
GRANT EXECUTE ON FUNCTION get_availability_summary TO authenticated;

-- ==========================================
-- SECTION 8: ENHANCED AVAILABILITY SYSTEM SETUP
-- ==========================================

-- Run these commands in Supabase SQL Editor to set up the enhanced availability system:

/*
-- 1. Create new enums for breaks and time-off
CREATE TYPE break_type_enum AS ENUM ('break', 'lunch', 'meeting', 'buffer', 'personal');
CREATE TYPE timeoff_type_enum AS ENUM ('vacation', 'sick', 'personal', 'conference', 'training', 'holiday');

-- 2. Enhanced availability templates table
DROP TABLE IF EXISTS availability_templates CASCADE;
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

-- 3. Break/time-off within daily availability
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

-- 4. Vacation/time-off periods (date ranges)
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

-- 7. Performance indexes
CREATE INDEX idx_availability_templates_consultant_day ON availability_templates(consultant_id, day_of_week) WHERE is_active = TRUE;
CREATE INDEX idx_availability_breaks_consultant_day ON availability_breaks(consultant_id, day_of_week) WHERE is_active = TRUE;
CREATE INDEX idx_availability_timeoff_consultant_dates ON availability_timeoff(consultant_id, start_date, end_date);
CREATE INDEX idx_availability_timeoff_date_range ON availability_timeoff(start_date, end_date);

-- 8. Row Level Security
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_timeoff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_set_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability tables
CREATE POLICY "Staff can manage own availability templates" ON availability_templates
  FOR ALL USING (consultant_id = auth.uid());

CREATE POLICY "Staff can manage own availability breaks" ON availability_breaks
  FOR ALL USING (consultant_id = auth.uid());

CREATE POLICY "Staff can manage own availability timeoff" ON availability_timeoff
  FOR ALL USING (consultant_id = auth.uid());

CREATE POLICY "Staff can manage own availability overrides" ON availability_overrides
  FOR ALL USING (consultant_id = auth.uid());

CREATE POLICY "Staff can manage own template sets" ON availability_template_sets
  FOR ALL USING (consultant_id = auth.uid());

CREATE POLICY "Staff can manage own template set items" ON availability_template_set_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM availability_template_sets
      WHERE id = template_set_id AND consultant_id = auth.uid()
    )
  );

-- Grant table permissions
GRANT ALL ON availability_templates TO authenticated;
GRANT ALL ON availability_breaks TO authenticated;
GRANT ALL ON availability_timeoff TO authenticated;
GRANT ALL ON availability_overrides TO authenticated;
GRANT ALL ON availability_template_sets TO authenticated;
GRANT ALL ON availability_template_set_items TO authenticated;
*/ 

-- ==========================================
-- SECTION 9: BUSINESS-WIDE AVAILABILITY POOLING
-- ==========================================

-- Function to get all available consultants for a specific date/time
CREATE OR REPLACE FUNCTION get_available_consultants(
  target_date DATE,
  target_time TIME,
  service_duration_minutes INTEGER DEFAULT 60
) RETURNS TABLE (
  consultant_id UUID,
  consultant_name TEXT,
  available_start TIME,
  available_end TIME,
  max_bookings SMALLINT,
  current_bookings INTEGER,
  available_slots INTEGER
) AS $$
DECLARE
  end_time TIME;
BEGIN
  end_time := target_time + (service_duration_minutes || ' minutes')::INTERVAL;
  
  RETURN QUERY
  WITH consultant_availability AS (
    SELECT 
      cda.consultant_id,
      cda.available_start,
      cda.available_end,
      cda.max_bookings
    FROM (
      SELECT DISTINCT consultant_id FROM availability_templates WHERE is_active = TRUE
    ) consultants
    CROSS JOIN LATERAL calculate_daily_availability(consultants.consultant_id, target_date) cda
    WHERE cda.available_start <= target_time 
      AND cda.available_end >= end_time
  ),
  consultant_bookings AS (
    SELECT 
      consultant_id,
      COUNT(*) as current_bookings
    FROM bookings
    WHERE scheduled_date = target_date
      AND scheduled_time >= target_time
      AND scheduled_time < end_time
      AND status IN ('confirmed', 'pending')
    GROUP BY consultant_id
  ),
  consultant_info AS (
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as full_name
    FROM profiles p
    WHERE p.is_staff = TRUE
  )
  SELECT 
    ca.consultant_id,
    ci.full_name,
    ca.available_start,
    ca.available_end,
    ca.max_bookings,
    COALESCE(cb.current_bookings, 0),
    ca.max_bookings - COALESCE(cb.current_bookings, 0)
  FROM consultant_availability ca
  LEFT JOIN consultant_bookings cb ON ca.consultant_id = cb.consultant_id
  LEFT JOIN consultant_info ci ON ca.consultant_id = ci.id
  WHERE ca.max_bookings > COALESCE(cb.current_bookings, 0)
  ORDER BY (ca.max_bookings - COALESCE(cb.current_bookings, 0)) DESC, ci.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business-wide availability summary
CREATE OR REPLACE FUNCTION get_business_availability_summary(
  start_date_param DATE,
  end_date_param DATE,
  service_duration_minutes INTEGER DEFAULT 60
) RETURNS TABLE (
  date_val DATE,
  day_name TEXT,
  total_consultants INTEGER,
  available_consultants INTEGER,
  total_slots INTEGER,
  available_slots INTEGER,
  peak_availability_time TIME,
  peak_available_slots INTEGER
) AS $$
DECLARE
  current_date DATE;
  time_slot TIME;
  max_slots INTEGER;
  peak_time TIME;
BEGIN
  current_date := start_date_param;
  
  WHILE current_date <= end_date_param LOOP
    -- Initialize counters
    total_consultants := (SELECT COUNT(*) FROM profiles WHERE is_staff = TRUE);
    available_consultants := 0;
    total_slots := 0;
    available_slots := 0;
    max_slots := 0;
    peak_time := '09:00'::TIME;
    
    -- Count available consultants for this date
    SELECT 
      COUNT(DISTINCT consultant_id),
      SUM(max_bookings),
      SUM(max_bookings - COALESCE(current_bookings, 0))
    INTO available_consultants, total_slots, available_slots
    FROM (
      SELECT DISTINCT consultant_id FROM availability_templates WHERE is_active = TRUE
    ) consultants
    CROSS JOIN LATERAL calculate_daily_availability(consultants.consultant_id, current_date) cda
    LEFT JOIN (
      SELECT 
        consultant_id,
        COUNT(*) as current_bookings
      FROM bookings
      WHERE scheduled_date = current_date
        AND status IN ('confirmed', 'pending')
      GROUP BY consultant_id
    ) cb ON consultants.consultant_id = cb.consultant_id;
    
    -- Find peak availability time (most available slots)
    FOR time_slot IN 
      SELECT generate_series('08:00'::TIME, '18:00'::TIME, '30 minutes'::INTERVAL)::TIME
    LOOP
      SELECT COUNT(*) INTO max_slots
      FROM get_available_consultants(current_date, time_slot, service_duration_minutes);
      
      IF max_slots > peak_available_slots THEN
        peak_available_slots := max_slots;
        peak_availability_time := time_slot;
      END IF;
    END LOOP;
    
    -- Return row for this date
    date_val := current_date;
    day_name := TO_CHAR(current_date, 'Day');
    peak_availability_time := peak_time;
    
    RETURN NEXT;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find optimal booking slots across all consultants
CREATE OR REPLACE FUNCTION find_optimal_booking_slots(
  preferred_date DATE,
  service_duration_minutes INTEGER DEFAULT 60,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE (
  suggested_datetime TIMESTAMP WITH TIME ZONE,
  consultant_id UUID,
  consultant_name TEXT,
  available_slots INTEGER,
  business_load_score DECIMAL(3,2) -- Lower is better (less busy)
) AS $$
DECLARE
  time_slot TIME;
  consultant_record RECORD;
  total_business_slots INTEGER;
  slot_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get total business capacity for load calculation
  SELECT SUM(max_bookings) INTO total_business_slots
  FROM availability_templates
  WHERE is_active = TRUE;
  
  -- Generate time slots and find available consultants
  FOR time_slot IN 
    SELECT generate_series('08:00'::TIME, '17:00'::TIME, '30 minutes'::INTERVAL)::TIME
  LOOP
    slot_datetime := preferred_date + time_slot;
    
    -- Get available consultants for this time slot
    FOR consultant_record IN
      SELECT * FROM get_available_consultants(preferred_date, time_slot, service_duration_minutes)
      WHERE available_slots > 0
      ORDER BY available_slots DESC
      LIMIT max_results
    LOOP
      suggested_datetime := slot_datetime;
      consultant_id := consultant_record.consultant_id;
      consultant_name := consultant_record.consultant_name;
      available_slots := consultant_record.available_slots;
      
      -- Calculate business load score (0.0 = no load, 1.0 = fully loaded)
      business_load_score := CASE 
        WHEN total_business_slots > 0 THEN
          1.0 - (consultant_record.available_slots::DECIMAL / total_business_slots::DECIMAL)
        ELSE 0.0
      END;
      
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for business availability functions
GRANT EXECUTE ON FUNCTION get_available_consultants TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_availability_summary TO authenticated;
GRANT EXECUTE ON FUNCTION find_optimal_booking_slots TO authenticated; 