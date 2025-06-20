-- ====================================================================
-- SAFE RLS POLICIES UPDATE SCRIPT
-- Adds missing availability_overrides RLS policies without errors
-- ====================================================================

-- Enable RLS on all availability tables (safe - won't error if already enabled)
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_timeoff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_template_set_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - won't error if they don't exist)
DROP POLICY IF EXISTS "Staff can manage own availability templates" ON availability_templates;
DROP POLICY IF EXISTS "Staff can manage own availability breaks" ON availability_breaks;
DROP POLICY IF EXISTS "Staff can manage own availability timeoff" ON availability_timeoff;
DROP POLICY IF EXISTS "Staff can manage own availability overrides" ON availability_overrides;
DROP POLICY IF EXISTS "Staff can manage own template sets" ON availability_template_sets;
DROP POLICY IF EXISTS "Staff can manage own template set items" ON availability_template_set_items;

-- Create all RLS policies (fresh and clean)
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

-- Grant table permissions (safe - won't error if already granted)
GRANT ALL ON availability_templates TO authenticated;
GRANT ALL ON availability_breaks TO authenticated;
GRANT ALL ON availability_timeoff TO authenticated;
GRANT ALL ON availability_overrides TO authenticated;
GRANT ALL ON availability_template_sets TO authenticated;
GRANT ALL ON availability_template_set_items TO authenticated;

-- Verification query to check all policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'availability_templates',
  'availability_breaks', 
  'availability_timeoff',
  'availability_overrides',
  'availability_template_sets',
  'availability_template_set_items'
)
ORDER BY tablename, policyname; 