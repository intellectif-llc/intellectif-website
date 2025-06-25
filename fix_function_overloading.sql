-- Fix Function Overloading Issue
-- This script removes the old version of create_booking_with_availability_check
-- to resolve PostgreSQL function overloading conflicts

-- Step 1: Drop the old function version (without google_meet_data_param)
DROP FUNCTION IF EXISTS public.create_booking_with_availability_check(
    uuid, -- service_id_param
    date, -- scheduled_date_param  
    time, -- scheduled_time_param
    timestamptz, -- scheduled_datetime_param
    uuid, -- customer_metrics_id_param
    jsonb, -- customer_data_param
    text, -- project_description_param
    text, -- assignment_strategy_param
    smallint -- lead_score_param
);

-- Step 2: Verify only the new function remains
-- You can check this by running:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'create_booking_with_availability_check';
-- Should return only ONE row with 10 arguments

-- Step 3: The new function with google_meet_data_param should remain intact
-- (It's already deployed based on your create_booking_with_availability_check_production.sql)

-- Note: Run this in your Supabase SQL Editor to fix the overloading issue 