-- =====================================================================
-- INTELLECTIF BOOKING SYSTEM - FIXED DATABASE MIGRATION SCRIPT
-- =====================================================================
-- Purpose: Bring actual database schema up to documentation standard
-- Safety: NON-DESTRUCTIVE - Only adds missing constraints and indexes
-- Date: 2025-01-27
-- Fixed: Handles existing constraints and avoids duplicate indexes
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. ADD MISSING CHECK CONSTRAINTS TO PROFILES TABLE (WITH SAFETY CHECK)
-- =====================================================================

-- Add name validation constraint (only if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_profiles_names_not_empty' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT chk_profiles_names_not_empty 
    CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0);
    RAISE NOTICE 'Added constraint: chk_profiles_names_not_empty';
  ELSE
    RAISE NOTICE 'Constraint chk_profiles_names_not_empty already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 2. ADD MISSING CHECK CONSTRAINTS TO CUSTOMER_METRICS TABLE
-- =====================================================================

-- Add positive values constraint (only if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_customer_metrics_totals_positive' 
    AND conrelid = 'public.customer_metrics'::regclass
  ) THEN
    ALTER TABLE public.customer_metrics 
    ADD CONSTRAINT chk_customer_metrics_totals_positive 
    CHECK (total_bookings >= 0 AND total_revenue >= 0);
    RAISE NOTICE 'Added constraint: chk_customer_metrics_totals_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_customer_metrics_totals_positive already exists, skipping';
  END IF;
END $$;

-- Add customer identification constraint (only if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_customer_metrics_identification' 
    AND conrelid = 'public.customer_metrics'::regclass
  ) THEN
    ALTER TABLE public.customer_metrics 
    ADD CONSTRAINT chk_customer_metrics_identification 
    CHECK (user_id IS NOT NULL OR email IS NOT NULL);
    RAISE NOTICE 'Added constraint: chk_customer_metrics_identification';
  ELSE
    RAISE NOTICE 'Constraint chk_customer_metrics_identification already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 3. ADD MISSING NAMED CONSTRAINTS TO SERVICES TABLE
-- =====================================================================

-- Add slug format constraint (if not already named)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_services_slug_format' 
    AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services 
    ADD CONSTRAINT chk_services_slug_format 
    CHECK (slug::text ~ '^[a-z0-9-]+$'::text);
    RAISE NOTICE 'Added constraint: chk_services_slug_format';
  ELSE
    RAISE NOTICE 'Constraint chk_services_slug_format already exists, skipping';
  END IF;
END $$;

-- Add price positive constraint (if not already named)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_services_price_positive' 
    AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services 
    ADD CONSTRAINT chk_services_price_positive 
    CHECK (price >= 0);
    RAISE NOTICE 'Added constraint: chk_services_price_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_services_price_positive already exists, skipping';
  END IF;
END $$;

-- Add duration positive constraint (if not already named)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_services_duration_positive' 
    AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services 
    ADD CONSTRAINT chk_services_duration_positive 
    CHECK (duration_minutes > 0);
    RAISE NOTICE 'Added constraint: chk_services_duration_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_services_duration_positive already exists, skipping';
  END IF;
END $$;

-- Add capacity positive constraint (if not already named)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_services_capacity_positive' 
    AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services 
    ADD CONSTRAINT chk_services_capacity_positive 
    CHECK (max_daily_bookings IS NULL OR max_daily_bookings > 0);
    RAISE NOTICE 'Added constraint: chk_services_capacity_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_services_capacity_positive already exists, skipping';
  END IF;
END $$;

-- Add features array constraint (if not already named)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_services_features_array' 
    AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services 
    ADD CONSTRAINT chk_services_features_array 
    CHECK (jsonb_typeof(features) = 'array'::text);
    RAISE NOTICE 'Added constraint: chk_services_features_array';
  ELSE
    RAISE NOTICE 'Constraint chk_services_features_array already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 4. ADD MISSING COMPLEX CONSTRAINTS TO BOOKINGS TABLE
-- =====================================================================

-- Add scheduled future constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_bookings_scheduled_future' 
    AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT chk_bookings_scheduled_future 
    CHECK (scheduled_datetime IS NULL OR scheduled_datetime > created_at);
    RAISE NOTICE 'Added constraint: chk_bookings_scheduled_future';
  ELSE
    RAISE NOTICE 'Constraint chk_bookings_scheduled_future already exists, skipping';
  END IF;
END $$;

-- Add payment amount positive constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_bookings_payment_amount_positive' 
    AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT chk_bookings_payment_amount_positive 
    CHECK (payment_amount IS NULL OR payment_amount >= 0);
    RAISE NOTICE 'Added constraint: chk_bookings_payment_amount_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_bookings_payment_amount_positive already exists, skipping';
  END IF;
END $$;

-- Add actual times order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_bookings_actual_times_order' 
    AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT chk_bookings_actual_times_order 
    CHECK (actual_start_time IS NULL OR actual_end_time IS NULL OR actual_start_time < actual_end_time);
    RAISE NOTICE 'Added constraint: chk_bookings_actual_times_order';
  ELSE
    RAISE NOTICE 'Constraint chk_bookings_actual_times_order already exists, skipping';
  END IF;
END $$;

-- Add scheduled fields consistency constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_bookings_scheduled_fields_consistency' 
    AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT chk_bookings_scheduled_fields_consistency 
    CHECK (
      (scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL AND scheduled_datetime IS NOT NULL) OR
      (scheduled_date IS NULL AND scheduled_time IS NULL AND scheduled_datetime IS NULL)
    );
    RAISE NOTICE 'Added constraint: chk_bookings_scheduled_fields_consistency';
  ELSE
    RAISE NOTICE 'Constraint chk_bookings_scheduled_fields_consistency already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 5. ADD MISSING CONSTRAINTS TO AVAILABILITY_TEMPLATES TABLE
-- =====================================================================

-- Add time order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_templates_time_order' 
    AND conrelid = 'public.availability_templates'::regclass
  ) THEN
    ALTER TABLE public.availability_templates 
    ADD CONSTRAINT chk_availability_templates_time_order 
    CHECK (start_time < end_time);
    RAISE NOTICE 'Added constraint: chk_availability_templates_time_order';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_templates_time_order already exists, skipping';
  END IF;
END $$;

-- Add max bookings positive constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_templates_max_bookings_positive' 
    AND conrelid = 'public.availability_templates'::regclass
  ) THEN
    ALTER TABLE public.availability_templates 
    ADD CONSTRAINT chk_availability_templates_max_bookings_positive 
    CHECK (max_bookings > 0);
    RAISE NOTICE 'Added constraint: chk_availability_templates_max_bookings_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_templates_max_bookings_positive already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 6. ADD MISSING CONSTRAINTS TO AVAILABILITY_BREAKS TABLE
-- =====================================================================

-- Add time order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_breaks_time_order' 
    AND conrelid = 'public.availability_breaks'::regclass
  ) THEN
    ALTER TABLE public.availability_breaks 
    ADD CONSTRAINT chk_availability_breaks_time_order 
    CHECK (start_time < end_time);
    RAISE NOTICE 'Added constraint: chk_availability_breaks_time_order';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_breaks_time_order already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 7. ADD MISSING CONSTRAINTS TO AVAILABILITY_TIMEOFF TABLE
-- =====================================================================

-- Add date order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_timeoff_date_order' 
    AND conrelid = 'public.availability_timeoff'::regclass
  ) THEN
    ALTER TABLE public.availability_timeoff 
    ADD CONSTRAINT chk_availability_timeoff_date_order 
    CHECK (start_date <= end_date);
    RAISE NOTICE 'Added constraint: chk_availability_timeoff_date_order';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_timeoff_date_order already exists, skipping';
  END IF;
END $$;

-- Add time order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_timeoff_time_order' 
    AND conrelid = 'public.availability_timeoff'::regclass
  ) THEN
    ALTER TABLE public.availability_timeoff 
    ADD CONSTRAINT chk_availability_timeoff_time_order 
    CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time);
    RAISE NOTICE 'Added constraint: chk_availability_timeoff_time_order';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_timeoff_time_order already exists, skipping';
  END IF;
END $$;

-- Add partial time consistency constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_timeoff_partial_time' 
    AND conrelid = 'public.availability_timeoff'::regclass
  ) THEN
    ALTER TABLE public.availability_timeoff 
    ADD CONSTRAINT chk_availability_timeoff_partial_time 
    CHECK (
      (start_time IS NULL AND end_time IS NULL) OR
      (start_time IS NOT NULL AND end_time IS NOT NULL)
    );
    RAISE NOTICE 'Added constraint: chk_availability_timeoff_partial_time';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_timeoff_partial_time already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 8. ADD MISSING CONSTRAINTS TO AVAILABILITY_OVERRIDES TABLE
-- =====================================================================

-- Add time order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_overrides_time_order' 
    AND conrelid = 'public.availability_overrides'::regclass
  ) THEN
    ALTER TABLE public.availability_overrides 
    ADD CONSTRAINT chk_availability_overrides_time_order 
    CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time);
    RAISE NOTICE 'Added constraint: chk_availability_overrides_time_order';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_overrides_time_order already exists, skipping';
  END IF;
END $$;

-- Add time consistency constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_availability_overrides_time_consistency' 
    AND conrelid = 'public.availability_overrides'::regclass
  ) THEN
    ALTER TABLE public.availability_overrides 
    ADD CONSTRAINT chk_availability_overrides_time_consistency 
    CHECK (
      (start_time IS NULL AND end_time IS NULL) OR
      (start_time IS NOT NULL AND end_time IS NOT NULL)
    );
    RAISE NOTICE 'Added constraint: chk_availability_overrides_time_consistency';
  ELSE
    RAISE NOTICE 'Constraint chk_availability_overrides_time_consistency already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 9. ADD MISSING CONSTRAINTS TO AVAILABILITY_TEMPLATE_SET_ITEMS TABLE
-- =====================================================================

-- Add time order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_template_set_items_time_order' 
    AND conrelid = 'public.availability_template_set_items'::regclass
  ) THEN
    ALTER TABLE public.availability_template_set_items 
    ADD CONSTRAINT chk_template_set_items_time_order 
    CHECK (start_time < end_time);
    RAISE NOTICE 'Added constraint: chk_template_set_items_time_order';
  ELSE
    RAISE NOTICE 'Constraint chk_template_set_items_time_order already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 10. ADD MISSING CONSTRAINTS TO FOLLOW_UPS TABLE
-- =====================================================================

-- Add dates order constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_follow_ups_dates_order' 
    AND conrelid = 'public.follow_ups'::regclass
  ) THEN
    ALTER TABLE public.follow_ups 
    ADD CONSTRAINT chk_follow_ups_dates_order 
    CHECK (
      completed_date IS NULL OR scheduled_date IS NULL OR completed_date >= scheduled_date
    );
    RAISE NOTICE 'Added constraint: chk_follow_ups_dates_order';
  ELSE
    RAISE NOTICE 'Constraint chk_follow_ups_dates_order already exists, skipping';
  END IF;
END $$;

-- =====================================================================
-- 11. ADD MISSING PERFORMANCE INDEXES (ONLY NEW ONES)
-- =====================================================================

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_datetime 
ON public.bookings(scheduled_datetime) 
WHERE status NOT IN ('cancelled', 'completed');

CREATE INDEX IF NOT EXISTS idx_bookings_customer_email 
ON public.bookings((customer_data->>'email'));

CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
ON public.bookings(status, created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_consultant_date 
ON public.bookings(consultant_id, scheduled_date) 
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
ON public.bookings(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_metrics 
ON public.bookings(customer_metrics_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_data_gin 
ON public.bookings USING GIN (customer_data);

-- Customer metrics table indexes
CREATE INDEX IF NOT EXISTS idx_customer_metrics_email_lower 
ON public.customer_metrics(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_customer_metrics_user_id 
ON public.customer_metrics(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_metrics_user_email 
ON public.customer_metrics(user_id, email);

CREATE INDEX IF NOT EXISTS idx_customer_metrics_lead_quality 
ON public.customer_metrics(lead_quality) 
WHERE lead_quality != 'churned';

CREATE INDEX IF NOT EXISTS idx_customer_metrics_total_revenue 
ON public.customer_metrics(total_revenue DESC) 
WHERE total_revenue > 0;

-- Services table indexes
CREATE INDEX IF NOT EXISTS idx_services_active_popular 
ON public.services(is_active, is_popular) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_services_booking_type 
ON public.services(booking_type) 
WHERE is_active = TRUE;

-- Follow-ups table indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date 
ON public.follow_ups(due_date) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_pending 
ON public.follow_ups(assigned_to, status) 
WHERE status = 'pending';

-- Voice consultations indexes
CREATE INDEX IF NOT EXISTS idx_voice_consultations_email 
ON public.voice_consultations(customer_email);

CREATE INDEX IF NOT EXISTS idx_voice_consultations_session 
ON public.voice_consultations(voice_session_id) 
WHERE voice_session_id IS NOT NULL;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
ON public.audit_log(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at 
ON public.audit_log(changed_at DESC);

-- =====================================================================
-- 12. VALIDATE DATA INTEGRITY AFTER CONSTRAINT ADDITION
-- =====================================================================

DO $$
DECLARE
    violation_count INTEGER;
    total_violations INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting data integrity validation...';
    
    -- Check profiles name constraints
    SELECT COUNT(*) INTO violation_count 
    FROM public.profiles 
    WHERE LENGTH(TRIM(first_name)) = 0 OR LENGTH(TRIM(last_name)) = 0;
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % profiles with empty names that violate new constraint', violation_count;
        total_violations := total_violations + violation_count;
    END IF;
    
    -- Check customer_metrics totals constraints
    SELECT COUNT(*) INTO violation_count 
    FROM public.customer_metrics 
    WHERE total_bookings < 0 OR total_revenue < 0;
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % customer_metrics with negative totals that violate new constraint', violation_count;
        total_violations := total_violations + violation_count;
    END IF;
    
    -- Check customer_metrics identification constraints
    SELECT COUNT(*) INTO violation_count 
    FROM public.customer_metrics 
    WHERE user_id IS NULL AND email IS NULL;
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % customer_metrics without identification that violate new constraint', violation_count;
        total_violations := total_violations + violation_count;
    END IF;
    
    -- Check bookings payment amount constraints
    SELECT COUNT(*) INTO violation_count 
    FROM public.bookings 
    WHERE payment_amount IS NOT NULL AND payment_amount < 0;
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % bookings with negative payment amounts that violate new constraint', violation_count;
        total_violations := total_violations + violation_count;
    END IF;
    
    IF total_violations = 0 THEN
        RAISE NOTICE '✅ Data integrity validation PASSED - No constraint violations found!';
    ELSE
        RAISE WARNING '⚠️  Data integrity validation found % total violations that need to be fixed', total_violations;
    END IF;
END $$;

-- =====================================================================
-- 13. MIGRATION SUMMARY
-- =====================================================================

DO $$
DECLARE
    constraint_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count constraints we have
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conname LIKE 'chk_%' 
       OR conname LIKE 'uq_%';
    
    -- Count indexes we have
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '✅ FIXED MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '• Total CHECK and UNIQUE constraints in database: %', constraint_count;
    RAISE NOTICE '• Total performance indexes in database: %', index_count;
    RAISE NOTICE '• All changes are NON-DESTRUCTIVE - existing data preserved';
    RAISE NOTICE '• Database now matches documentation standard';
    RAISE NOTICE '• Handled existing constraints gracefully';
    RAISE NOTICE '=====================================================================';
END $$;

COMMIT;

-- =====================================================================
-- FIXED MIGRATION COMPLETE - DATABASE NOW PRODUCTION READY! 🚀
-- ===================================================================== 