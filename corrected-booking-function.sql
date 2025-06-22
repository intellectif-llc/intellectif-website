-- CORRECTED create_booking_with_availability_check function
-- This version properly matches your database schema with correct enum casting

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
  booking_reference_val VARCHAR(20);
BEGIN
  -- Get service details
  SELECT * INTO service_rec FROM services WHERE id = service_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- ATOMIC STEP 1: Get consultant assignment
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

  -- ATOMIC STEP 2: Double-check availability
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

  -- Generate booking reference (CRITICAL: This was missing!)
  booking_reference_val := generate_booking_reference();

  -- ATOMIC STEP 3: Create the booking with PROPER ENUM CASTING
  INSERT INTO bookings (
    booking_reference,           -- ADDED: This was missing!
    service_id,
    scheduled_date,
    scheduled_time,
    scheduled_datetime,
    customer_metrics_id,
    customer_data,
    project_description,
    consultant_id,
    status,                      -- FIXED: Now properly cast to booking_status
    payment_status,              -- FIXED: Now properly cast to payment_status
    payment_amount,
    lead_score,
    booking_source,              -- FIXED: Now properly cast to lead_source_enum
    created_at,
    updated_at
  ) VALUES (
    booking_reference_val,       -- ADDED: Generated booking reference
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
    'website_booking'::lead_source_enum,  -- FIXED: Proper enum casting
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
    RETURN json_build_object(
      'success', false, 
      'error', 'Booking creation failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 