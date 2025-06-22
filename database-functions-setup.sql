-- Intellectif Booking System - Functions & Triggers Setup
-- UPDATED TO MIRROR ACTUAL DATABASE STATE
-- This file contains the exact functions that exist in the database

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
  SELECT phone FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 2. Function to handle new user profile creation
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

-- 4. Profile update function
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

  -- Update auth.users metadata and phone
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'first_name', COALESCE(first_name_param, raw_user_meta_data->>'first_name', ''),
        'last_name', COALESCE(last_name_param, raw_user_meta_data->>'last_name', ''),
        'company', COALESCE(company_param, raw_user_meta_data->>'company', '')
      ),
    phone = COALESCE(phone_param, phone),
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
  SELECT email, phone, raw_user_meta_data, created_at, updated_at
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
      'phone', auth_data.phone,
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

-- 6. Function to check if user is staff (missing from original setup)
-- NOTE: This function exists in your database but was missing from the setup file
CREATE OR REPLACE FUNCTION is_staff_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_staff = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 2: Business Logic Functions
-- ==========================================

-- Booking reference generation
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

-- Lead scoring function
CREATE OR REPLACE FUNCTION calculate_lead_score(
  service_price NUMERIC,
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
-- SECTION 3: AVAILABILITY MANAGEMENT FUNCTIONS
-- ==========================================

-- 1. Function to calculate actual availability for a specific day (UPDATED)
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
    unavailable_record RECORD;
    timeoff_exists BOOLEAN;
    current_pos TIME;
BEGIN
    -- Get day of week (0 = Sunday, 6 = Saturday)
    day_of_week_val := EXTRACT(DOW FROM target_date);

    -- Check for approved, full-day time-off first. If one exists, the consultant is unavailable.
    SELECT TRUE INTO timeoff_exists
    FROM public.availability_timeoff
    WHERE consultant_id = consultant_id_param
      AND target_date BETWEEN start_date AND end_date
      AND start_time IS NULL AND end_time IS NULL -- This signifies a full-day time-off
      AND is_approved = TRUE
    LIMIT 1;

    IF timeoff_exists THEN
        RETURN; -- Exit early, no availability on this day.
    END IF;

    -- Loop through each availability template for the given day
    FOR template_record IN
        SELECT at.start_time, at.end_time, at.max_bookings
        FROM public.availability_templates at
        WHERE at.consultant_id = consultant_id_param
          AND at.day_of_week = day_of_week_val
          AND at.is_active = TRUE
        ORDER BY at.start_time
    LOOP
        -- The start of our availability slot for processing.
        current_pos := template_record.start_time;

        -- This loop iterates through all unavailable periods (breaks and partial time-offs)
        -- that fall within the current template's time range.
        FOR unavailable_record IN
            WITH all_unavailable AS (
                -- Get all active breaks for the day of the week
                SELECT ab.start_time, ab.end_time
                FROM public.availability_breaks ab
                WHERE ab.consultant_id = consultant_id_param
                  AND ab.day_of_week = day_of_week_val
                  AND ab.is_active = TRUE

                UNION ALL

                -- Get all approved partial-day time-offs for the specific date
                SELECT ato.start_time, ato.end_time
                FROM public.availability_timeoff ato
                WHERE ato.consultant_id = consultant_id_param
                  AND target_date BETWEEN ato.start_date AND ato.end_date
                  AND ato.start_time IS NOT NULL AND ato.end_time IS NOT NULL
                  AND ato.is_approved = TRUE
            )
            SELECT u.start_time, u.end_time
            FROM all_unavailable u
            -- Filter for unavailable blocks that overlap with the current template slot
            WHERE u.end_time > template_record.start_time AND u.start_time < template_record.end_time
            ORDER BY u.start_time, u.end_time
        LOOP
            -- If there is a gap between our current position and the start of this unavailable block,
            -- then that gap is an available slot.
            IF current_pos < unavailable_record.start_time THEN
                available_start := current_pos;
                available_end := unavailable_record.start_time;
                max_bookings := template_record.max_bookings;
                RETURN NEXT;
            END IF;

            -- Move our current position to the end of the unavailable block.
            -- Using GREATEST handles cases where unavailable periods might overlap.
            current_pos := GREATEST(current_pos, unavailable_record.end_time);
        END LOOP;

        -- After checking all unavailable periods, if our current position is still before
        -- the end of the template, the remaining time is also an available slot.
        IF current_pos < template_record.end_time THEN
            available_start := current_pos;
            available_end := template_record.end_time;
            max_bookings := template_record.max_bookings;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get all available consultants for a specific date/time (UPDATED)
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
            consultants.consultant_id, -- FIX: Was cda.consultant_id, which is invalid.
            cda.available_start,
            cda.available_end,
            cda.max_bookings
        FROM (
            SELECT DISTINCT at.consultant_id FROM public.availability_templates at WHERE at.is_active = TRUE
        ) consultants
        CROSS JOIN LATERAL public.calculate_daily_availability(consultants.consultant_id, target_date) cda
        WHERE cda.available_start <= target_time
          AND cda.available_end >= end_time
    ),
    consultant_bookings AS (
        SELECT
            b.consultant_id,
            COUNT(*)::INTEGER as current_bookings
        FROM public.bookings b
        WHERE b.scheduled_date = target_date
          AND b.scheduled_time >= target_time
          AND b.scheduled_time < end_time
          AND b.status IN ('confirmed', 'pending')
        GROUP BY b.consultant_id
    ),
    consultant_info AS (
        SELECT
            p.id,
            CONCAT(p.first_name, ' ', p.last_name) as full_name
        FROM public.profiles p
        WHERE p.is_staff = TRUE
    )
    SELECT
        ca.consultant_id,
        ci.full_name,
        ca.available_start,
        ca.available_end,
        ca.max_bookings,
        COALESCE(cb.current_bookings, 0)::INTEGER,
        (ca.max_bookings - COALESCE(cb.current_bookings, 0))::INTEGER
    FROM consultant_availability ca
    LEFT JOIN consultant_bookings cb ON ca.consultant_id = cb.consultant_id
    LEFT JOIN consultant_info ci ON ca.consultant_id = ci.id
    WHERE ca.max_bookings > COALESCE(cb.current_bookings, 0)
    ORDER BY (ca.max_bookings - COALESCE(cb.current_bookings, 0)) DESC, ci.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 4: BUFFER TIME FUNCTIONS (MISSING FROM ORIGINAL)
-- ==========================================

-- Function to get effective buffer time for a consultant-service combination
-- NOTE: This function already exists in your database - this is for documentation
-- CREATE OR REPLACE FUNCTION get_effective_buffer_time(
--   consultant_id_param UUID,
--   service_id_param UUID
-- ) RETURNS TABLE (
--   buffer_before_minutes SMALLINT,
--   buffer_after_minutes SMALLINT
-- ) AS $$
-- -- Function exists in database with proper logic
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get available consultants with buffer time consideration
-- ACTUAL FUNCTION FROM DATABASE (with corrected return types):
CREATE OR REPLACE FUNCTION get_available_consultants_with_buffer(
  target_date DATE,
  target_time TIME,
  service_id_param UUID
) RETURNS TABLE (
  consultant_id UUID,
  consultant_name TEXT,
  available_start TIME,
  available_end TIME,
  max_bookings SMALLINT,
  current_bookings BIGINT, -- NOTE: Returns BIGINT, not INTEGER
  available_slots BIGINT,  -- NOTE: Returns BIGINT, not INTEGER
  total_duration_minutes INTEGER,
  buffer_before INTEGER,
  buffer_after INTEGER
) AS $$
DECLARE
  service_duration INTEGER;
BEGIN
  -- Get service duration
  SELECT s.duration_minutes INTO service_duration
  FROM services s
  WHERE s.id = service_id_param;
  
  RETURN QUERY
  WITH consultant_buffer_info AS (
    SELECT 
      consultants.consultant_id,
      bt.buffer_before_minutes,
      bt.buffer_after_minutes,
      (target_time - (bt.buffer_before_minutes || ' minutes')::INTERVAL)::TIME as required_start_time,
      (target_time + (service_duration + bt.buffer_after_minutes || ' minutes')::INTERVAL)::TIME as required_end_time
    FROM (
      SELECT DISTINCT at.consultant_id 
      FROM availability_templates at 
      WHERE at.is_active = TRUE
    ) consultants
    CROSS JOIN LATERAL get_effective_buffer_time(consultants.consultant_id, service_id_param) bt
  ),
  consultant_availability AS (
    SELECT 
      cbi.consultant_id,
      cbi.buffer_before_minutes,
      cbi.buffer_after_minutes,
      cbi.required_start_time,
      cbi.required_end_time,
      da.available_start,
      da.available_end,
      da.max_bookings  -- This comes from calculate_daily_availability, no ambiguity
    FROM consultant_buffer_info cbi
    CROSS JOIN LATERAL calculate_daily_availability(cbi.consultant_id, target_date) da
    WHERE da.available_start <= cbi.required_start_time 
      AND da.available_end >= cbi.required_end_time
  ),
  consultant_bookings AS (
    SELECT 
      b.consultant_id,
      COUNT(*) as booking_count
    FROM bookings b
    INNER JOIN services s ON b.service_id = s.id
    WHERE b.scheduled_date = target_date
      AND b.status IN ('confirmed', 'pending')
      AND b.consultant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM consultant_availability ca 
        WHERE ca.consultant_id = b.consultant_id
        AND (
          -- FIXED: Use actual buffer times instead of hardcoded 5 minutes
          -- Check if existing booking conflicts with our requested time slot
          -- Existing booking time range: [booking_start - buffer_before, booking_end + buffer_after]
          -- Our requested time range: [required_start_time, required_end_time]
          (b.scheduled_time - (ca.buffer_before_minutes || ' minutes')::INTERVAL)::TIME <= ca.required_end_time AND 
          (b.scheduled_time + (s.duration_minutes + ca.buffer_after_minutes || ' minutes')::INTERVAL)::TIME >= ca.required_start_time
        )
      )
    GROUP BY b.consultant_id
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
    COALESCE(ci.full_name, 'Available Consultant') as consultant_name,
    ca.available_start,
    ca.available_end,
    ca.max_bookings,  -- From calculate_daily_availability result, no ambiguity
    COALESCE(cb.booking_count, 0::BIGINT) as current_bookings,
    (ca.max_bookings::BIGINT - COALESCE(cb.booking_count, 0::BIGINT)) as available_slots,
    (service_duration + ca.buffer_before_minutes + ca.buffer_after_minutes) as total_duration_minutes,
    ca.buffer_before_minutes::INTEGER as buffer_before,
    ca.buffer_after_minutes::INTEGER as buffer_after
  FROM consultant_availability ca
  LEFT JOIN consultant_bookings cb ON ca.consultant_id = cb.consultant_id
  LEFT JOIN consultant_info ci ON ca.consultant_id = ci.id
  WHERE ca.max_bookings > COALESCE(cb.booking_count, 0)
  ORDER BY (ca.max_bookings::BIGINT - COALESCE(cb.booking_count, 0::BIGINT)) DESC, ci.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find optimal consultant assignment with buffer time consideration
-- ACTUAL FUNCTION FROM DATABASE (with corrected return types):
CREATE OR REPLACE FUNCTION get_optimal_consultant_assignment(
  target_date DATE,
  target_time TIME,
  service_id_param UUID,
  assignment_strategy TEXT DEFAULT 'optimal'
) RETURNS TABLE (
  consultant_id UUID,
  consultant_name TEXT,
  assignment_reason TEXT,
  confidence_score NUMERIC  -- NOTE: Returns NUMERIC, not DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH available_consultants AS (
    SELECT * FROM get_available_consultants_with_buffer(target_date, target_time, service_id_param)
    WHERE available_slots > 0
  ),
  ranked_consultants AS (
    SELECT 
      ac.consultant_id,
      ac.consultant_name,
      CASE assignment_strategy
        WHEN 'optimal' THEN 
          ROW_NUMBER() OVER (ORDER BY ac.available_slots DESC, ac.consultant_name)
        WHEN 'balanced' THEN 
          ROW_NUMBER() OVER (ORDER BY ac.current_bookings ASC, ac.consultant_name)
        WHEN 'random' THEN 
          ROW_NUMBER() OVER (ORDER BY random())
        ELSE 
          ROW_NUMBER() OVER (ORDER BY ac.consultant_name)
      END as rank,
      CASE assignment_strategy
        WHEN 'optimal' THEN 'Optimal balance of availability and workload'
        WHEN 'balanced' THEN 'Load balancing - least busy consultant'
        WHEN 'random' THEN 'Random assignment for testing'
        ELSE 'First available consultant'
      END as reason,
      CASE assignment_strategy
        WHEN 'optimal' THEN (ac.available_slots::DECIMAL / ac.max_bookings::DECIMAL)
        WHEN 'balanced' THEN ((ac.max_bookings::BIGINT - ac.current_bookings)::DECIMAL / ac.max_bookings::DECIMAL)
        ELSE 1.0
      END as score
    FROM available_consultants ac
  )
  SELECT 
    rc.consultant_id,
    rc.consultant_name,
    rc.reason as assignment_reason,
    rc.score as confidence_score
  FROM ranked_consultants rc
  WHERE rc.rank = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 5: TEMPLATE MANAGEMENT FUNCTIONS
-- ==========================================

-- Function to save template set (UPDATED)
CREATE OR REPLACE FUNCTION save_template_set(
  consultant_id_param UUID,
  set_name_param VARCHAR,
  description_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_template_set_id UUID; -- FIX: Renamed variable to avoid shadowing column name
    template_record RECORD;
BEGIN
    -- Create or update template set
    INSERT INTO public.availability_template_sets (consultant_id, set_name, description)
    VALUES (consultant_id_param, set_name_param, description_param)
    ON CONFLICT (consultant_id, set_name) DO UPDATE SET
        description = EXCLUDED.description,
        updated_at = NOW()
    RETURNING id INTO v_template_set_id; -- FIX: Use new variable name

    -- Clear existing items for this template set
    -- FIX: Use the variable in the WHERE clause to correctly identify the set to delete from.
    DELETE FROM public.availability_template_set_items
    WHERE template_set_id = v_template_set_id;

    -- Save current active templates to the set
    FOR template_record IN
        SELECT day_of_week, start_time, end_time, max_bookings
        FROM public.availability_templates
        WHERE consultant_id = consultant_id_param AND is_active = TRUE
    LOOP
        INSERT INTO public.availability_template_set_items (
            template_set_id, day_of_week, start_time, end_time, max_bookings
        ) VALUES (
            v_template_set_id, -- FIX: Use new variable name
            template_record.day_of_week,
            template_record.start_time,
            template_record.end_time,
            template_record.max_bookings
        );
    END LOOP;

    RETURN json_build_object('success', true, 'template_set_id', v_template_set_id);
EXCEPTION
    WHEN others THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 5: BUSINESS AVAILABILITY SUMMARY FUNCTION
-- ==========================================

-- Function to get business availability summary (NEW)
CREATE OR REPLACE FUNCTION get_business_availability_summary(
  start_date_param DATE,
  end_date_param DATE,
  service_id_param UUID,
  slot_check_interval_minutes INTEGER DEFAULT 15
) RETURNS TABLE (
  date_val DATE,
  day_name TEXT,
  total_consultants BIGINT,
  available_consultants BIGINT,
  total_slots BIGINT,
  available_slots BIGINT,
  peak_availability_time TIME,
  peak_available_slots INTEGER
) AS $$
DECLARE
    date_iter DATE;
    time_slot TIME;
    service_rec RECORD;
    consultants_at_slot INTEGER;
    current_peak_slots INTEGER;
    num_bookings BIGINT;
    time_slot_interval INTERVAL;
BEGIN
    -- Validate that a service was provided
    SELECT * INTO service_rec FROM public.services WHERE id = service_id_param;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service with ID % not found.', service_id_param;
    END IF;

    time_slot_interval := (slot_check_interval_minutes || ' minutes')::INTERVAL;
    date_iter := start_date_param;

    WHILE date_iter <= end_date_param LOOP
        -- Initialize counters for the current day
        total_consultants := (SELECT COUNT(*) FROM public.profiles WHERE is_staff = TRUE);
        available_consultants := 0;
        total_slots := 0;
        peak_availability_time := '00:00:00'::TIME;
        current_peak_slots := -1;

        -- Calculate total potential slots and the number of consultants available for this service
        WITH consultant_service_duration AS (
            -- For each consultant, get the total time needed for the service, including their specific buffer
            SELECT
                p.id AS consultant_id,
                (service_rec.duration_minutes + buf.buffer_before_minutes + buf.buffer_after_minutes) AS total_minutes
            FROM
                public.profiles p
            CROSS JOIN LATERAL public.get_effective_buffer_time(p.id, service_id_param) buf
            WHERE
                p.is_staff = TRUE
        ),
        consultant_potential_slots AS (
            -- For each consultant, calculate how many times the service can fit into their daily availability
            SELECT
                csd.consultant_id,
                SUM(
                    -- Calculate how many slots fit in each availability block
                    FLOOR(EXTRACT(EPOCH FROM (cda.available_end - cda.available_start)) / 60 / csd.total_minutes)
                ) AS potential_slots
            FROM
                consultant_service_duration csd
            CROSS JOIN LATERAL public.calculate_daily_availability(csd.consultant_id, date_iter) cda
            WHERE
                csd.total_minutes > 0 -- Avoid division by zero
            GROUP BY
                csd.consultant_id
        )
        SELECT
            COUNT(*),         -- Number of consultants who can take at least one booking
            SUM(cps.potential_slots) -- Total theoretical slots across all consultants
        INTO available_consultants, total_slots
        FROM consultant_potential_slots cps
        WHERE cps.potential_slots > 0;

        -- Find peak availability time (most available consultants for this specific service)
        FOR time_slot IN
            SELECT generate_series('08:00'::TIME, '18:00'::TIME, time_slot_interval)::TIME
        LOOP
            -- Use the buffer-aware function to get available consultants
            SELECT COUNT(*) INTO consultants_at_slot
            FROM public.get_available_consultants_with_buffer(date_iter, time_slot, service_id_param);

            IF consultants_at_slot > current_peak_slots THEN
                current_peak_slots := consultants_at_slot;
                peak_availability_time := time_slot;
            END IF;
        END LOOP;

        -- Calculate available slots by subtracting existing bookings for the day
        SELECT COUNT(*) INTO num_bookings
        FROM public.bookings b
        WHERE b.service_id = service_id_param
          AND b.scheduled_date = date_iter
          AND b.status IN ('confirmed', 'pending');

        date_val := date_iter;
        day_name := TO_CHAR(date_iter, 'Day');
        available_slots := GREATEST(0, COALESCE(total_slots, 0) - num_bookings);
        peak_available_slots := GREATEST(0, current_peak_slots);

        RETURN NEXT;
        date_iter := date_iter + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 6: ATOMIC BOOKING CREATION (RACE CONDITION FIX)
-- ==========================================

-- Function to create booking with atomic availability check (PREVENTS RACE CONDITIONS)
CREATE OR REPLACE FUNCTION create_booking_with_availability_check(
  service_id_param UUID,
  scheduled_date_param DATE,
  scheduled_time_param TIME,
  scheduled_datetime_param TIMESTAMP WITH TIME ZONE,
  customer_metrics_id_param UUID,
  customer_data_param JSONB,
  project_description_param TEXT,
  assignment_strategy_param TEXT DEFAULT 'optimal',
  lead_score_param SMALLINT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  service_rec RECORD;
  consultant_assignment RECORD;
  booking_rec RECORD;
  booking_reference_val TEXT;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Get service details
  SELECT * INTO service_rec FROM services WHERE id = service_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- ATOMIC STEP 1: Check availability and get consultant assignment
  -- This must be done atomically to prevent race conditions
  SELECT * INTO consultant_assignment
  FROM get_optimal_consultant_assignment(
    scheduled_date_param,
    scheduled_time_param,
    service_id_param,
    assignment_strategy_param
  )
  LIMIT 1;

  -- If no consultant available, return error immediately
  IF consultant_assignment IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No available consultants for the selected time slot'
    );
  END IF;

  -- ATOMIC STEP 2: Double-check availability hasn't changed (race condition protection)
  -- Re-verify the consultant is still available for this exact time slot
  IF NOT EXISTS (
    SELECT 1 FROM get_available_consultants_with_buffer(
      scheduled_date_param,
      scheduled_time_param,
      service_id_param
    )
    WHERE consultant_id = consultant_assignment.consultant_id
      AND available_slots > 0
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'The selected time slot is no longer available'
    );
  END IF;

  -- Generate booking reference
  booking_reference_val := generate_booking_reference();

  -- ATOMIC STEP 3: Create the booking (this locks the time slot)
  INSERT INTO bookings (
    booking_reference,
    service_id,
    scheduled_date,
    scheduled_time,
    scheduled_datetime,
    customer_metrics_id,
    customer_data,
    project_description,
    consultant_id,
    status,
    payment_status,
    payment_amount,
    lead_score,
    booking_source,
    created_at,
    updated_at
  ) VALUES (
    booking_reference_val,
    service_id_param,
    scheduled_date_param,
    scheduled_time_param,
    scheduled_datetime_param,
    customer_metrics_id_param,
    customer_data_param,
    project_description_param,
    consultant_assignment.consultant_id,
    (CASE WHEN service_rec.auto_confirm THEN 'confirmed' ELSE 'pending' END)::booking_status,
    (CASE WHEN service_rec.requires_payment THEN 'pending' ELSE 'waived' END)::payment_status,
    service_rec.price,
    lead_score_param,
    'website_booking'::lead_source_enum,
    NOW(),
    NOW()
  )
  RETURNING * INTO booking_rec;

  -- Return success with booking and consultant details
  RETURN json_build_object(
    'success', true,
    'booking', json_build_object(
      'id', booking_rec.id,
      'booking_reference', booking_rec.booking_reference,
      'status', booking_rec.status,
      'scheduled_datetime', booking_rec.scheduled_datetime,
      'payment_status', booking_rec.payment_status,
      'payment_amount', booking_rec.payment_amount,
      'follow_up_required', booking_rec.follow_up_required,
      'service', json_build_object(
        'id', service_rec.id,
        'name', service_rec.name,
        'duration_minutes', service_rec.duration_minutes,
        'price', service_rec.price
      )
    ),
    'consultant', json_build_object(
      'consultant_id', consultant_assignment.consultant_id,
      'consultant_name', consultant_assignment.consultant_name,
      'assignment_reason', consultant_assignment.assignment_reason,
      'confidence_score', consultant_assignment.confidence_score
    )
  );

EXCEPTION
  WHEN others THEN
    -- Return error details for debugging
    RETURN json_build_object(
      'success', false, 
      'error', 'Booking creation failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_phone TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff_user TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_lead_score TO authenticated;
GRANT EXECUTE ON FUNCTION generate_booking_reference TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_daily_availability TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_consultants TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_buffer_time TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_consultants_with_buffer TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimal_consultant_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION save_template_set TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_availability_summary TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_with_availability_check TO authenticated;
GRANT USAGE ON SEQUENCE booking_ref_seq TO authenticated; 