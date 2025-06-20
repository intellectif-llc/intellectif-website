-- Buffer Time Migration for Intellectif Booking System (CORRECTED)
-- This adds buffer time functionality to services and consultant preferences

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
-- SECTION 3: Enhanced Availability Functions with Buffer Time
-- ==========================================

-- Function to get effective buffer time for a consultant-service combination
CREATE OR REPLACE FUNCTION get_effective_buffer_time(
  consultant_id_param UUID,
  service_id_param UUID
) RETURNS TABLE (
  buffer_before_minutes SMALLINT,
  buffer_after_minutes SMALLINT
) AS $$
DECLARE
  service_allows_custom BOOLEAN;
  service_default_before SMALLINT;
  service_default_after SMALLINT;
  custom_before SMALLINT;
  custom_after SMALLINT;
BEGIN
  -- Get service defaults and custom allowance
  SELECT 
    s.buffer_before_minutes, 
    s.buffer_after_minutes, 
    s.allow_custom_buffer
  INTO service_default_before, service_default_after, service_allows_custom
  FROM services s
  WHERE s.id = service_id_param;
  
  -- If service allows custom buffer and consultant has preferences, use them
  IF service_allows_custom THEN
    SELECT 
      cbp.buffer_before_minutes, 
      cbp.buffer_after_minutes
    INTO custom_before, custom_after
    FROM consultant_buffer_preferences cbp
    WHERE cbp.consultant_id = consultant_id_param 
      AND cbp.service_id = service_id_param 
      AND cbp.is_active = TRUE;
  END IF;
  
  -- Return custom if available, otherwise service defaults
  buffer_before_minutes := COALESCE(custom_before, service_default_before, 0);
  buffer_after_minutes := COALESCE(custom_after, service_default_after, 5);
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get available consultants with buffer time consideration
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
  total_duration_minutes INTEGER, -- Including buffer time
  buffer_before INTEGER,
  buffer_after INTEGER
) AS $$
DECLARE
  service_duration INTEGER;
  consultant_rec RECORD;
  availability_rec RECORD;
  buffer_rec RECORD;
  required_start_time TIME;
  required_end_time TIME;
  booking_count INTEGER;
BEGIN
  -- Get service duration
  SELECT duration_minutes INTO service_duration
  FROM services 
  WHERE id = service_id_param;
  
  -- Get all consultants and check availability with their specific buffer times
  FOR consultant_rec IN
    SELECT DISTINCT consultant_id FROM availability_templates WHERE is_active = TRUE
  LOOP
    -- Get buffer time for this consultant-service combination
    SELECT * INTO buffer_rec
    FROM get_effective_buffer_time(consultant_rec.consultant_id, service_id_param);
    
    -- Calculate required time slot including buffer
    required_start_time := target_time - (buffer_rec.buffer_before_minutes || ' minutes')::INTERVAL;
    required_end_time := target_time + (service_duration + buffer_rec.buffer_after_minutes || ' minutes')::INTERVAL;
    
    -- Check if consultant is available for the entire duration including buffer
    FOR availability_rec IN
      SELECT da.available_start, da.available_end, da.max_bookings
      FROM calculate_daily_availability(consultant_rec.consultant_id, target_date) da
      WHERE da.available_start <= required_start_time 
        AND da.available_end >= required_end_time
    LOOP
      -- Count current bookings that would conflict (including buffer zones)
      SELECT COUNT(*) INTO booking_count
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.consultant_id = consultant_rec.consultant_id
        AND b.scheduled_date = target_date
        AND b.status IN ('confirmed', 'pending')
        AND (
          -- Check if any existing booking conflicts with our time slot + buffer
          (b.scheduled_time - INTERVAL '5 minutes' <= required_end_time AND 
           b.scheduled_time + (s.duration_minutes + 5 || ' minutes')::INTERVAL >= required_start_time)
        );
      
      -- If there are available slots
      IF availability_rec.max_bookings > booking_count THEN
        consultant_id := consultant_rec.consultant_id;
        
        -- Get consultant name
        SELECT CONCAT(first_name, ' ', last_name) INTO consultant_name
        FROM profiles 
        WHERE id = consultant_rec.consultant_id;
        
        available_start := availability_rec.available_start;
        available_end := availability_rec.available_end;
        max_bookings := availability_rec.max_bookings;
        current_bookings := booking_count;
        available_slots := availability_rec.max_bookings - booking_count;
        total_duration_minutes := service_duration + buffer_rec.buffer_before_minutes + buffer_rec.buffer_after_minutes;
        buffer_before := buffer_rec.buffer_before_minutes;
        buffer_after := buffer_rec.buffer_after_minutes;
        
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find optimal consultant assignment with buffer time consideration
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
DECLARE
  consultant_rec RECORD;
  best_consultant_id UUID;
  best_consultant_name TEXT;
  best_reason TEXT;
  best_score DECIMAL(3,2) := 0;
BEGIN
  -- Get available consultants with buffer consideration
  FOR consultant_rec IN
    SELECT * FROM get_available_consultants_with_buffer(target_date, target_time, service_id_param)
    WHERE available_slots > 0
  LOOP
    CASE assignment_strategy
      WHEN 'optimal' THEN
        -- Balanced approach: availability quality + workload balance
        IF consultant_rec.available_slots > best_score THEN
          best_consultant_id := consultant_rec.consultant_id;
          best_consultant_name := consultant_rec.consultant_name;
          best_reason := 'Optimal balance of availability and workload';
          best_score := consultant_rec.available_slots;
        END IF;
        
      WHEN 'balanced' THEN
        -- Pure load balancing
        IF consultant_rec.current_bookings < best_score OR best_score = 0 THEN
          best_consultant_id := consultant_rec.consultant_id;
          best_consultant_name := consultant_rec.consultant_name;
          best_reason := 'Load balancing - least busy consultant';
          best_score := consultant_rec.max_bookings - consultant_rec.current_bookings;
        END IF;
        
      WHEN 'random' THEN
        -- Random assignment for A/B testing
        IF random() > 0.5 THEN
          best_consultant_id := consultant_rec.consultant_id;
          best_consultant_name := consultant_rec.consultant_name;
          best_reason := 'Random assignment for testing';
          best_score := 1.0;
        END IF;
        
      ELSE
        -- Default to first available
        IF best_consultant_id IS NULL THEN
          best_consultant_id := consultant_rec.consultant_id;
          best_consultant_name := consultant_rec.consultant_name;
          best_reason := 'First available consultant';
          best_score := 1.0;
        END IF;
    END CASE;
  END LOOP;
  
  -- Return result
  IF best_consultant_id IS NOT NULL THEN
    consultant_id := best_consultant_id;
    consultant_name := best_consultant_name;
    assignment_reason := best_reason;
    confidence_score := best_score;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SECTION 4: Row Level Security for Buffer Preferences
-- ==========================================

-- Enable RLS
ALTER TABLE consultant_buffer_preferences ENABLE ROW LEVEL SECURITY;

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

-- Check if buffer preferences table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'consultant_buffer_preferences'
ORDER BY ordinal_position;

-- Check if functions were created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_effective_buffer_time', 'get_available_consultants_with_buffer', 'get_optimal_consultant_assignment');

-- Sample query to test buffer time calculation
SELECT 
  s.name,
  s.duration_minutes,
  s.buffer_before_minutes,
  s.buffer_after_minutes,
  (s.duration_minutes + s.buffer_before_minutes + s.buffer_after_minutes) as total_time_needed
FROM services s
WHERE s.is_active = TRUE;

-- Test getting effective buffer time for a consultant-service combination
-- (Replace with actual UUIDs when testing)
-- SELECT * FROM get_effective_buffer_time(
--   'consultant-uuid-here'::UUID, 
--   (SELECT id FROM services WHERE slug = 'discovery-call')
-- ); 