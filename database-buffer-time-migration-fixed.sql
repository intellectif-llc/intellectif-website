-- Buffer Time Migration for Intellectif Booking System (FIXED VERSION)
-- This fixes the ambiguous column reference errors in the original migration

-- ==========================================
-- SECTION 1: Add Buffer Time to Services Table
-- ==========================================

-- Add buffer time columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS buffer_before_minutes SMALLINT DEFAULT 0 CHECK (buffer_before_minutes >= 0),
ADD COLUMN IF NOT EXISTS buffer_after_minutes SMALLINT DEFAULT 5 CHECK (buffer_after_minutes >= 0),
ADD COLUMN IF NOT EXISTS allow_custom_buffer BOOLEAN DEFAULT TRUE;

-- Update existing services with default buffer times
UPDATE services 
SET 
  buffer_before_minutes = 0,
  buffer_after_minutes = 5,
  allow_custom_buffer = TRUE
WHERE buffer_after_minutes IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN services.buffer_before_minutes IS 'Buffer time in minutes before the meeting starts';
COMMENT ON COLUMN services.buffer_after_minutes IS 'Buffer time in minutes after the meeting ends';
COMMENT ON COLUMN services.allow_custom_buffer IS 'Whether consultants can override buffer times for this service';

-- ==========================================
-- SECTION 2: Consultant Buffer Preferences Table
-- ==========================================

-- Create table for consultant-specific buffer preferences
CREATE TABLE IF NOT EXISTS consultant_buffer_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Custom buffer times for this consultant-service combination
  buffer_before_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (buffer_after_minutes >= 0),
  
  -- Metadata
  notes TEXT, -- Why this consultant needs different buffer times
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure one preference per consultant-service combination
  CONSTRAINT uq_consultant_buffer_preferences UNIQUE (consultant_id, service_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultant_buffer_preferences_consultant 
  ON consultant_buffer_preferences(consultant_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_consultant_buffer_preferences_service 
  ON consultant_buffer_preferences(service_id) WHERE is_active = TRUE;

-- ==========================================
-- SECTION 3: Buffer Time Functions (FIXED)
-- ==========================================

-- Function to get effective buffer time for a consultant-service combination
CREATE OR REPLACE FUNCTION get_effective_buffer_time(
  consultant_id_param UUID,
  service_id_param UUID
) RETURNS TABLE (
  buffer_before_minutes SMALLINT,
  buffer_after_minutes SMALLINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: Enhanced function to get available consultants with buffer time consideration
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
  current_bookings INTEGER,
  available_slots INTEGER,
  total_duration_minutes INTEGER,
  buffer_before INTEGER,
  buffer_after INTEGER
) AS $$
DECLARE
  service_duration INTEGER;
BEGIN
  -- Get service duration
  SELECT duration_minutes INTO service_duration
  FROM services 
  WHERE id = service_id_param;
  
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
      da.max_bookings
    FROM consultant_buffer_info cbi
    CROSS JOIN LATERAL calculate_daily_availability(cbi.consultant_id, target_date) da
    WHERE da.available_start <= cbi.required_start_time 
      AND da.available_end >= cbi.required_end_time
  ),
  consultant_bookings AS (
    SELECT 
      ca.consultant_id,
      COUNT(*) as current_bookings
    FROM consultant_availability ca
    LEFT JOIN bookings b ON b.consultant_id = ca.consultant_id
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.scheduled_date = target_date
      AND b.status IN ('confirmed', 'pending')
      AND (
        -- Check if any existing booking conflicts with our time slot + buffer
        (b.scheduled_time - INTERVAL '5 minutes' <= ca.required_end_time AND 
         b.scheduled_time + (s.duration_minutes + 5 || ' minutes')::INTERVAL >= ca.required_start_time)
      )
    GROUP BY ca.consultant_id
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
    ci.full_name as consultant_name,
    ca.available_start,
    ca.available_end,
    ca.max_bookings,
    COALESCE(cb.current_bookings, 0) as current_bookings,
    (ca.max_bookings - COALESCE(cb.current_bookings, 0)) as available_slots,
    (service_duration + ca.buffer_before_minutes + ca.buffer_after_minutes) as total_duration_minutes,
    ca.buffer_before_minutes::INTEGER as buffer_before,
    ca.buffer_after_minutes::INTEGER as buffer_after
  FROM consultant_availability ca
  LEFT JOIN consultant_bookings cb ON ca.consultant_id = cb.consultant_id
  LEFT JOIN consultant_info ci ON ca.consultant_id = ci.id
  WHERE ca.max_bookings > COALESCE(cb.current_bookings, 0)
  ORDER BY (ca.max_bookings - COALESCE(cb.current_bookings, 0)) DESC, ci.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: Function to find optimal consultant assignment with buffer time consideration
CREATE OR REPLACE FUNCTION get_optimal_consultant_assignment(
  target_date DATE,
  target_time TIME,
  service_id_param UUID,
  assignment_strategy TEXT DEFAULT 'optimal'
) RETURNS TABLE (
  consultant_id UUID,
  consultant_name TEXT,
  assignment_reason TEXT,
  confidence_score DECIMAL(3,2)
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
        WHEN 'balanced' THEN ((ac.max_bookings - ac.current_bookings)::DECIMAL / ac.max_bookings::DECIMAL)
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
-- SECTION 4: Row Level Security for Buffer Preferences
-- ==========================================

-- Enable RLS
ALTER TABLE consultant_buffer_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Consultants can manage own buffer preferences" ON consultant_buffer_preferences;
DROP POLICY IF EXISTS "Staff can view all buffer preferences" ON consultant_buffer_preferences;

-- Consultants can manage their own buffer preferences
CREATE POLICY "Consultants can manage own buffer preferences" ON consultant_buffer_preferences
  FOR ALL USING (consultant_id = auth.uid());

-- Staff can view all buffer preferences
CREATE POLICY "Staff can view all buffer preferences" ON consultant_buffer_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_staff = TRUE
    )
  );

-- ==========================================
-- SECTION 5: Grant Permissions
-- ==========================================

-- Grant table permissions
GRANT ALL ON consultant_buffer_preferences TO authenticated;

-- Grant function permissions  
GRANT EXECUTE ON FUNCTION get_effective_buffer_time TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_consultants_with_buffer TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimal_consultant_assignment TO authenticated;

-- ==========================================
-- SECTION 6: Update Initial Services with Proper Buffer Times
-- ==========================================

-- Update discovery call (15 minutes) with 5-minute buffer
UPDATE services 
SET 
  buffer_before_minutes = 0,
  buffer_after_minutes = 5,
  allow_custom_buffer = TRUE
WHERE slug = 'discovery-call';

-- Update strategy session (60 minutes) with 5-minute buffer  
UPDATE services 
SET 
  buffer_before_minutes = 0,
  buffer_after_minutes = 5,
  allow_custom_buffer = TRUE
WHERE slug = 'strategy-session';

-- ==========================================
-- SECTION 7: Verification Queries
-- ==========================================

-- Check if buffer columns were added successfully
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name IN ('buffer_before_minutes', 'buffer_after_minutes', 'allow_custom_buffer');

-- Check if functions were created successfully
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_effective_buffer_time', 'get_available_consultants_with_buffer', 'get_optimal_consultant_assignment')
ORDER BY routine_name;

-- Test the functions with sample data (optional)
-- SELECT * FROM get_effective_buffer_time('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
-- SELECT * FROM get_available_consultants_with_buffer('2024-01-15'::DATE, '10:00'::TIME, '00000000-0000-0000-0000-000000000000'::UUID);
-- SELECT * FROM get_optimal_consultant_assignment('2024-01-15'::DATE, '10:00'::TIME, '00000000-0000-0000-0000-000000000000'::UUID, 'optimal'); 