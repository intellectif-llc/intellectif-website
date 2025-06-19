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