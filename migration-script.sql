-- ====================================================================
-- INTELLECTIF BOOKING SYSTEM - COMPLETE MIGRATION SCRIPT
-- Enhanced Availability Management System with Business-Wide Pooling
-- ====================================================================
-- 
-- This script migrates from the basic availability system to the 
-- enhanced system with advanced features including:
-- - Break management within daily availability
-- - Vacation/time-off periods with date ranges
-- - Template sets for easy copying
-- - Business-wide availability pooling
-- - Multi-consultant booking optimization
--
-- IMPORTANT: This script assumes you have the basic profile system 
-- already set up from database-functions-setup.sql
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: CREATE NEW ENUMS FOR ENHANCED AVAILABILITY SYSTEM
-- ====================================================================

-- Create enum for break types (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'break_type_enum') THEN
        CREATE TYPE break_type_enum AS ENUM ('break', 'lunch', 'meeting', 'buffer', 'personal');
    END IF;
END $$;

-- Create enum for time-off types (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timeoff_type_enum') THEN
        CREATE TYPE timeoff_type_enum AS ENUM ('vacation', 'sick', 'personal', 'conference', 'training', 'holiday');
    END IF;
END $$;

-- ====================================================================
-- SECTION 2: ENHANCE EXISTING AVAILABILITY_TEMPLATES TABLE
-- ====================================================================

-- Add new columns to existing availability_templates table (if they don't exist)
DO $$ 
BEGIN
    -- Add timezone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'availability_templates' 
                   AND column_name = 'timezone') THEN
        ALTER TABLE availability_templates ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
    END IF;
    
    -- Add template_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'availability_templates' 
                   AND column_name = 'template_name') THEN
        ALTER TABLE availability_templates ADD COLUMN template_name VARCHAR(100);
    END IF;
    
    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'availability_templates' 
                   AND column_name = 'notes') THEN
        ALTER TABLE availability_templates ADD COLUMN notes TEXT;
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'availability_templates' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE availability_templates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- ====================================================================
-- SECTION 3: CREATE NEW TABLES FOR ENHANCED AVAILABILITY SYSTEM
-- ====================================================================

-- Table for recurring breaks within daily availability
CREATE TABLE IF NOT EXISTS availability_breaks (
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

-- Table for vacation/time-off periods (date ranges)
CREATE TABLE IF NOT EXISTS availability_timeoff (
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

-- Table for saving collections of templates as sets
CREATE TABLE IF NOT EXISTS availability_template_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_availability_template_sets_consultant_name UNIQUE (consultant_id, set_name)
);

-- Linking table for templates within a template set
CREATE TABLE IF NOT EXISTS availability_template_set_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_set_id UUID NOT NULL REFERENCES availability_template_sets(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_bookings SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT chk_template_set_items_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT chk_template_set_items_time_order CHECK (start_time < end_time)
);

-- ====================================================================
-- SECTION 4: CREATE PERFORMANCE INDEXES
-- ====================================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_availability_templates_consultant_day;
DROP INDEX IF EXISTS idx_availability_overrides_consultant_date;

-- Create new optimized indexes
CREATE INDEX IF NOT EXISTS idx_availability_templates_consultant_day 
ON availability_templates(consultant_id, day_of_week) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_availability_breaks_consultant_day 
ON availability_breaks(consultant_id, day_of_week) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_availability_timeoff_consultant_dates 
ON availability_timeoff(consultant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_availability_timeoff_date_range 
ON availability_timeoff(start_date, end_date);

-- ====================================================================
-- SECTION 5: ENHANCED AVAILABILITY MANAGEMENT FUNCTIONS
-- ====================================================================

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

-- 3. Function to save template set
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- SECTION 6: BUSINESS-WIDE AVAILABILITY POOLING FUNCTIONS
-- ====================================================================

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
    date_iter DATE;
    time_slot TIME;
    max_slots INTEGER;
    peak_time TIME;
BEGIN
    date_iter := start_date_param;

    WHILE date_iter <= end_date_param LOOP
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
        CROSS JOIN LATERAL calculate_daily_availability(consultants.consultant_id, date_iter) cda
        LEFT JOIN (
            SELECT
                consultant_id,
                COUNT(*) as current_bookings
            FROM bookings
            WHERE scheduled_date = date_iter
              AND status IN ('confirmed', 'pending')
            GROUP BY consultant_id
        ) cb ON consultants.consultant_id = cb.consultant_id;

        -- Find peak availability time (most available slots)
        FOR time_slot IN
            SELECT generate_series('08:00'::TIME, '18:00'::TIME, '30 minutes'::INTERVAL)::TIME
        LOOP
            SELECT COUNT(*) INTO max_slots
            FROM get_available_consultants(date_iter, time_slot, service_duration_minutes);

            IF max_slots > peak_available_slots THEN
                peak_available_slots := max_slots;
                peak_availability_time := time_slot;
            END IF;
        END LOOP;

        -- Return row for this date
        date_val := date_iter;
        day_name := TO_CHAR(date_iter, 'Day');
        peak_availability_time := peak_time;

        RETURN NEXT;
        date_iter := date_iter + INTERVAL '1 day';
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

-- ====================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on new tables
ALTER TABLE availability_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_timeoff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_set_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can manage own availability breaks" ON availability_breaks;
DROP POLICY IF EXISTS "Staff can manage own availability timeoff" ON availability_timeoff;
DROP POLICY IF EXISTS "Staff can manage own availability overrides" ON availability_overrides;
DROP POLICY IF EXISTS "Staff can manage own template sets" ON availability_template_sets;
DROP POLICY IF EXISTS "Staff can manage own template set items" ON availability_template_set_items;

-- Create RLS policies for new tables
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

-- ====================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ====================================================================

-- Grant table permissions
GRANT ALL ON availability_breaks TO authenticated;
GRANT ALL ON availability_timeoff TO authenticated;
GRANT ALL ON availability_overrides TO authenticated;
GRANT ALL ON availability_template_sets TO authenticated;
GRANT ALL ON availability_template_set_items TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION calculate_daily_availability(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION copy_availability_template(UUID, SMALLINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION save_template_set(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_template_set(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_availability_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_consultants(DATE, TIME, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_availability_summary(DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_optimal_booking_slots(DATE, INTEGER, INTEGER) TO authenticated;

-- ====================================================================
-- SECTION 9: VERIFICATION QUERIES
-- ====================================================================

-- Verify all new tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'availability_breaks',
    'availability_timeoff', 
    'availability_template_sets',
    'availability_template_set_items'
)
ORDER BY table_name;

-- Verify all new functions were created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'calculate_daily_availability',
    'copy_availability_template',
    'save_template_set',
    'apply_template_set',
    'get_availability_summary',
    'get_available_consultants',
    'get_business_availability_summary',
    'find_optimal_booking_slots'
)
ORDER BY routine_name;

-- Verify new columns were added to availability_templates
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'availability_templates'
AND column_name IN ('timezone', 'template_name', 'notes', 'updated_at')
ORDER BY column_name;

COMMIT;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
-- 
-- The enhanced availability management system is now ready!
-- 
-- New capabilities include:
-- ✅ Break management within daily availability
-- ✅ Vacation/time-off periods with approval workflow
-- ✅ Template sets for easy copying between days
-- ✅ Business-wide availability pooling
-- ✅ Multi-consultant booking optimization
-- ✅ Smart load balancing across consultants
-- ✅ Peak availability time analysis
-- 
-- Next steps:
-- 1. Test the new functions with sample data
-- 2. Implement frontend UI for the new features
-- 3. Set up consultant availability templates
-- 4. Configure break schedules and time-off periods
-- 
-- ==================================================================== 