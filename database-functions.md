# Intellectif Booking System - Database Functions

## 1. apply_template_set

```sql
CREATE OR REPLACE FUNCTION public.apply_template_set(consultant_id_param uuid, template_set_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$
```

## 2. calculate_daily_availability

```sql
CREATE OR REPLACE FUNCTION public.calculate_daily_availability(consultant_id_param uuid, target_date date)
 RETURNS TABLE(available_start time without time zone, available_end time without time zone, max_bookings smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 3. calculate_lead_score

```sql
CREATE OR REPLACE FUNCTION public.calculate_lead_score(service_price numeric, company_size text, project_description text)
 RETURNS smallint
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Business logic for lead scoring
  RETURN CASE
    WHEN service_price > 0 THEN 70  -- Paid consultation = higher intent
    WHEN LENGTH(project_description) > 100 THEN 50  -- Detailed description = serious
    ELSE 30  -- Basic free consultation
  END;
END;
$function$
```

## 4. copy_availability_template

```sql
CREATE OR REPLACE FUNCTION public.copy_availability_template(consultant_id_param uuid, source_day smallint, target_day smallint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 5. create_booking_with_availability_check

```sql
CREATE OR REPLACE FUNCTION public.create_booking_with_availability_check(
    service_id_param uuid,
    scheduled_date_param date,
    scheduled_time_param time without time zone,
    scheduled_datetime_param timestamp with time zone,
    customer_metrics_id_param uuid,
    customer_data_param jsonb,
    project_description_param text,
    assignment_strategy_param text DEFAULT 'optimal'::text,
    lead_score_param smallint DEFAULT 0,
    google_meet_data_param jsonb DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    -- Function-specific variables
    service_rec RECORD;
    consultant_assignment RECORD;
    booking_rec RECORD;

    -- Variables for derived values
    booking_reference_val character varying; -- CORRECTED: Type now matches table schema
    found_user_id uuid; -- NEW: To store the ID of a registered user if found

    -- Meeting-related variables with proper data types matching schema
    meeting_url_val text;
    meeting_platform_val character varying;
    meeting_id_val character varying;
    meeting_password_val character varying;
    google_calendar_event_id_val text;
    google_calendar_link_val text;
BEGIN
    -- Input validation
    IF service_id_param IS NULL OR customer_metrics_id_param IS NULL OR
       customer_data_param IS NULL OR project_description_param IS NULL OR
       scheduled_date_param IS NULL OR scheduled_time_param IS NULL OR
       scheduled_datetime_param IS NULL OR (customer_data_param->>'email') IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Required parameters, including a customer email, cannot be null');
    END IF;

    -- NEW ATOMIC STEP 1: Find registered user by email to link the booking
    -- This professionally handles both guest and registered user bookings.
    -- If no user is found, found_user_id will be NULL, which is the correct state for a guest booking.
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = customer_data_param->>'email'
    LIMIT 1;

    -- Get service details
    SELECT * INTO service_rec FROM services WHERE id = service_id_param AND is_active = true;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Service not found or inactive');
    END IF;

    -- ATOMIC STEP 2: Get consultant assignment
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

    -- ATOMIC STEP 3: Double-check availability hasn't changed (race condition protection)
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

    -- Extract Google Meet data if provided, otherwise set to NULL
    IF google_meet_data_param IS NOT NULL AND jsonb_typeof(google_meet_data_param) = 'object' THEN
        meeting_url_val := google_meet_data_param->>'meeting_url';
        meeting_platform_val := COALESCE(google_meet_data_param->>'meeting_platform', 'google_meet');
        meeting_id_val := google_meet_data_param->>'meeting_id';
        meeting_password_val := google_meet_data_param->>'meeting_password';
        google_calendar_event_id_val := google_meet_data_param->>'google_calendar_event_id';
        google_calendar_link_val := google_meet_data_param->>'google_calendar_link';
    ELSE
        meeting_url_val := NULL;
        meeting_platform_val := NULL;
        meeting_id_val := NULL;
        meeting_password_val := NULL;
        google_calendar_event_id_val := NULL;
        google_calendar_link_val := NULL;
    END IF;

    -- ATOMIC STEP 4: Create the booking, now with the user_id correctly linked if they are registered
    INSERT INTO bookings (
        user_id, -- ADDED: Link to the registered user if found
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
        meeting_platform,
        meeting_url,
        meeting_id,
        meeting_password,
        google_calendar_event_id,
        google_calendar_link,
        created_at,
        updated_at
    ) VALUES (
        found_user_id, -- ADDED: Value can be UUID or NULL
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
        meeting_platform_val,
        meeting_url_val,
        meeting_id_val,
        meeting_password_val,
        google_calendar_event_id_val,
        google_calendar_link_val,
        NOW(),
        NOW()
    )
    RETURNING * INTO booking_rec;

    -- Return success with comprehensive booking and consultant details
    RETURN json_build_object(
        'success', true,
        'booking', json_build_object(
            'id', booking_rec.id,
            'user_id', booking_rec.user_id, -- ADDED: Return the linked user_id for clarity
            'booking_reference', booking_rec.booking_reference,
            'status', booking_rec.status,
            'scheduled_datetime', booking_rec.scheduled_datetime,
            'payment_status', booking_rec.payment_status,
            'payment_amount', booking_rec.payment_amount,
            'follow_up_required', booking_rec.follow_up_required,
            'meeting_url', booking_rec.meeting_url,
            'meeting_platform', booking_rec.meeting_platform,
            'meeting_id', booking_rec.meeting_id,
            'google_calendar_event_id', booking_rec.google_calendar_event_id,
            'google_calendar_link', booking_rec.google_calendar_link,
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
        RETURN json_build_object(
            'success', false,
            'error', 'Booking creation failed: ' || SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$;
```

## 6. find_optimal_booking_slots

```sql
CREATE OR REPLACE FUNCTION public.find_optimal_booking_slots(preferred_date date, service_duration_minutes integer DEFAULT 60, max_results integer DEFAULT 10)
 RETURNS TABLE(suggested_datetime timestamp with time zone, consultant_id uuid, consultant_name text, available_slots integer, business_load_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 7. generate_booking_reference

```sql
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
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
$function$
```

## 8. get_availability_summary

```sql
CREATE OR REPLACE FUNCTION public.get_availability_summary(consultant_id_param uuid, start_date_param date, end_date_param date)
 RETURNS TABLE(date_val date, day_name text, total_hours numeric, available_slots integer, has_timeoff boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    date_iter DATE;
    availability_record RECORD;
    slot_count INTEGER;
    total_minutes INTEGER;
BEGIN
    date_iter := start_date_param;

    WHILE date_iter <= end_date_param LOOP
        slot_count := 0;
        total_minutes := 0;

        -- Calculate availability for this date
        FOR availability_record IN
            SELECT available_start, available_end, max_bookings
            FROM calculate_daily_availability(consultant_id_param, date_iter)
        LOOP
            total_minutes := total_minutes + EXTRACT(EPOCH FROM (availability_record.available_end - availability_record.available_start)) / 60;
            slot_count := slot_count + availability_record.max_bookings;
        END LOOP;

        date_val := date_iter;
        day_name := TO_CHAR(date_iter, 'Day');
        total_hours := total_minutes / 60.0;
        available_slots := slot_count;
        has_timeoff := EXISTS (
            SELECT 1 FROM availability_timeoff
            WHERE consultant_id = consultant_id_param
              AND date_iter BETWEEN start_date AND end_date
              AND is_approved = TRUE
        );

        RETURN NEXT;
        date_iter := date_iter + INTERVAL '1 day';
    END LOOP;
END;
$function$
```

## 9 .get_available_consultants

```sql
CREATE OR REPLACE FUNCTION public.get_available_consultants(target_date date, target_time time without time zone, service_duration_minutes integer DEFAULT 60)
 RETURNS TABLE(consultant_id uuid, consultant_name text, available_start time without time zone, available_end time without time zone, max_bookings smallint, current_bookings integer, available_slots integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    end_time TIME;
BEGIN
    end_time := target_time + (service_duration_minutes || ' minutes')::INTERVAL;

    RETURN QUERY
    WITH consultant_availability AS (
        SELECT
            consultants.consultant_id,
            cda.available_start,
            cda.available_end,
            cda.max_bookings
        FROM (
            SELECT DISTINCT at.consultant_id FROM availability_templates at WHERE at.is_active = TRUE
        ) consultants
        CROSS JOIN LATERAL calculate_daily_availability(consultants.consultant_id, target_date) cda
        WHERE cda.available_start <= target_time
          AND cda.available_end >= end_time
    ),
    consultant_bookings AS (
        SELECT
            b.consultant_id,
            COUNT(*)::INTEGER as current_bookings
        FROM bookings b
        INNER JOIN services s ON b.service_id = s.id
        WHERE b.scheduled_date = target_date
          AND b.status IN ('confirmed', 'pending')
          AND b.consultant_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM consultant_availability ca
            WHERE ca.consultant_id = b.consultant_id
            AND (
              -- Check if booking overlaps with our time slot
              b.scheduled_time < end_time AND
              b.scheduled_time + (s.duration_minutes || ' minutes')::INTERVAL > target_time
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
$function$
```

## 10. get_available_consultants_with_buffer

```sql
CREATE OR REPLACE FUNCTION public.get_available_consultants_with_buffer(target_date date, target_time time without time zone, service_id_param uuid)
 RETURNS TABLE(consultant_id uuid, consultant_name text, available_start time without time zone, available_end time without time zone, max_bookings smallint, current_bookings bigint, available_slots bigint, total_duration_minutes integer, buffer_before integer, buffer_after integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
          -- FIXED: Remove buffer from existing booking conflict check
          -- The new booking's required_start_time and required_end_time already include buffer
          -- So we only need to check if the ACTUAL existing booking time conflicts
          --
          -- BEFORE (BUGGY): Both bookings had buffer applied = double buffer
          -- AFTER (FIXED): Only new booking has buffer applied = correct buffer
          --
          -- Existing booking actual time range: [booking_start, booking_end]
          -- New booking required time range: [required_start_time, required_end_time] (already includes buffer)
          b.scheduled_time <= ca.required_end_time AND
          (b.scheduled_time + (s.duration_minutes || ' minutes')::INTERVAL)::TIME >= ca.required_start_time
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
$function$
```

## 11.get_business_availability_summary

```sql
CREATE OR REPLACE FUNCTION public.get_business_availability_summary(start_date_param date, end_date_param date, service_id_param uuid, slot_check_interval_minutes integer DEFAULT 15)
 RETURNS TABLE(date_val date, day_name text, total_consultants bigint, available_consultants bigint, total_slots bigint, available_slots bigint, peak_availability_time time without time zone, peak_available_slots integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

        "date_val" := date_iter;
        "day_name" := TO_CHAR(date_iter, 'Day');
        "available_slots" := GREATEST(0, COALESCE(total_slots, 0) - num_bookings);
        "peak_available_slots" := GREATEST(0, current_peak_slots);

        RETURN NEXT;
        date_iter := date_iter + INTERVAL '1 day';
    END LOOP;
END;
$function$
```

## 12. get_effective_buffer_time

```sql
CREATE OR REPLACE FUNCTION public.get_effective_buffer_time(consultant_id_param uuid, service_id_param uuid)
 RETURNS TABLE(buffer_before_minutes smallint, buffer_after_minutes smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cbp.buffer_before_minutes, s.buffer_before_minutes, 0)::SMALLINT,
    COALESCE(cbp.buffer_after_minutes, s.buffer_after_minutes, 5)::SMALLINT
  FROM services s
  LEFT JOIN consultant_buffer_preferences cbp
    ON cbp.consultant_id = consultant_id_param
    AND cbp.service_id = service_id_param
    AND cbp.is_active = TRUE
  WHERE s.id = service_id_param;
END;
$function$
```

## 13. get_optimal_consultant_assignment

```sql
CREATE OR REPLACE FUNCTION public.get_optimal_consultant_assignment(target_date date, target_time time without time zone, service_id_param uuid, assignment_strategy text DEFAULT 'optimal'::text)
 RETURNS TABLE(consultant_id uuid, consultant_name text, assignment_reason text, confidence_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 14. get_user_email

```sql
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT email FROM auth.users WHERE id = user_id;
$function$
```

## 15.get_user_phone

```sql
CREATE OR REPLACE FUNCTION public.get_user_phone(user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT phone FROM auth.users WHERE id = user_id;
$function$
```

## 16. get_user_profile

```sql
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 17. handle_new_user

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  full_name_val TEXT;
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- This first block handles the original task of creating a profile.
  -- It is wrapped in its own BEGIN/EXCEPTION block to ensure that even if profile creation fails,
  -- the function can still attempt to link existing records.
  BEGIN
    -- Get first_name and last_name from metadata (preferred)
    first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
    last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

    -- If separate names are empty, try to parse full_name as a fallback
    IF first_name_val = '' AND last_name_val = '' THEN
      full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
      IF full_name_val != '' THEN
        first_name_val := SPLIT_PART(full_name_val, ' ', 1);
        last_name_val := TRIM(SUBSTRING(full_name_val FROM LENGTH(SPLIT_PART(full_name_val, ' ', 1)) + 2));
      END IF;
    END IF;

    -- Insert profile record into public.profiles
    INSERT INTO public.profiles (id, first_name, last_name, company)
    VALUES (
      NEW.id,
      first_name_val,
      last_name_val,
      COALESCE(NEW.raw_user_meta_data->>'company', '')
    );
  EXCEPTION
    WHEN others THEN
      RAISE WARNING '[handle_new_user] - Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  -- This second block contains the new logic for linking existing records.
  -- It is also wrapped in its own exception block to log errors without failing the entire trigger.
  BEGIN
    -- Step 1: Find and update customer_metrics records.
    -- It finds records with a matching email (case-insensitive) that are not yet linked to a user.
    UPDATE public.customer_metrics
    SET user_id = NEW.id, updated_at = now()
    WHERE lower(public.customer_metrics.email) = lower(NEW.email) AND public.customer_metrics.user_id IS NULL;

    -- Step 2: Find and update associated bookings records.
    -- It updates bookings that belong to the customer_metrics records we just updated in Step 1.
    UPDATE public.bookings
    SET user_id = NEW.id, updated_at = now()
    WHERE public.bookings.customer_metrics_id IN (
      SELECT id FROM public.customer_metrics WHERE public.customer_metrics.user_id = NEW.id
    ) AND public.bookings.user_id IS NULL;

  EXCEPTION
    WHEN others THEN
      RAISE WARNING '[handle_new_user] - Failed to link existing records for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$
```

## 18. is_staff_user

```sql
CREATE OR REPLACE FUNCTION public.is_staff_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user has staff role in auth.users metadata
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      raw_user_meta_data->>'is_staff' = 'true'
      OR raw_user_meta_data->>'role' = 'staff'
      OR raw_user_meta_data->>'role' = 'consultant'
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$function$
```

## 19. save_template_set

```sql
CREATE OR REPLACE FUNCTION public.save_template_set(consultant_id_param uuid, set_name_param character varying, description_param text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
```

## 20. set_booking_reference

```sql
CREATE OR REPLACE FUNCTION public.set_booking_reference()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$function$
```

## 21. update_user_profile

```sql
CREATE OR REPLACE FUNCTION public.update_user_profile(user_id uuid, first_name_param text DEFAULT NULL::text, last_name_param text DEFAULT NULL::text, phone_param text DEFAULT NULL::text, company_param text DEFAULT NULL::text, timezone_param text DEFAULT NULL::text, preferred_contact_method_param contact_method DEFAULT NULL::contact_method, marketing_consent_param boolean DEFAULT NULL::boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  affected_rows INTEGER;
  final_first_name TEXT;
  final_last_name TEXT;
  final_full_name TEXT;
  current_meta_data JSONB;
BEGIN
  -- Validate input
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Get current metadata to preserve existing values
  SELECT raw_user_meta_data INTO current_meta_data FROM auth.users WHERE id = user_id;

  -- Determine final names to use for updates
  final_first_name := COALESCE(first_name_param, current_meta_data->>'first_name', '');
  final_last_name := COALESCE(last_name_param, current_meta_data->>'last_name', '');
  final_full_name := TRIM(final_first_name || ' ' || final_last_name);

  -- Update auth.users metadata and phone, ensuring full_name is in sync
  UPDATE auth.users
  SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'first_name', final_first_name,
        'last_name', final_last_name,
        'full_name', final_full_name,
        'company', COALESCE(company_param, current_meta_data->>'company', ''),
        'timezone', COALESCE(timezone_param, current_meta_data->>'timezone', 'UTC'),
        'phone', COALESCE(phone_param, phone)
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
    final_first_name,
    final_last_name,
    COALESCE(company_param, ''),
    COALESCE(timezone_param, 'UTC'),
    COALESCE(preferred_contact_method_param, 'email'::contact_method),
    COALESCE(marketing_consent_param, FALSE),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = CASE
      WHEN first_name_param IS NOT NULL THEN first_name_param
      ELSE profiles.first_name
    END,
    last_name = CASE
      WHEN last_name_param IS NOT NULL THEN last_name_param
      ELSE profiles.last_name
    END,
    company = CASE
      WHEN company_param IS NOT NULL THEN company_param
      ELSE profiles.company
    END,
    timezone = CASE
      WHEN timezone_param IS NOT NULL THEN timezone_param
      ELSE profiles.timezone
    END,
    preferred_contact_method = CASE
      WHEN preferred_contact_method_param IS NOT NULL THEN preferred_contact_method_param
      ELSE profiles.preferred_contact_method
    END,
    marketing_consent = CASE
      WHEN marketing_consent_param IS NOT NULL THEN marketing_consent_param
      ELSE profiles.marketing_consent
    END,
    updated_at = NOW();

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
$function$
```

## 22. Google functions

-- Secure token storage/retrieval functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION private.store_google_refresh_token(
p_user_id UUID,
p_refresh_token TEXT
) RETURNS VOID;

CREATE OR REPLACE FUNCTION private.get_decrypted_google_refresh_token(
p_user_id UUID
) RETURNS TEXT;
