-- ====================================================================
-- FIX RLS POLICY INFINITE RECURSION
-- This script fixes the "infinite recursion detected in policy" error
-- ====================================================================

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- Create a SAFE policy that uses auth.users instead of profiles table
-- This avoids the circular dependency
CREATE POLICY "Staff can view all profiles" ON profiles
  FOR SELECT USING (
    -- Use auth.users.raw_user_meta_data or a direct role check
    -- This avoids querying profiles table from within profiles policy
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'is_staff' = 'true'
      OR email IN (
        -- Add your admin emails here
        'admin@intellectif.com',
        'consultant@intellectif.com'
      )
    )
  );

-- Alternative approach: Create a simple function that doesn't query profiles
CREATE OR REPLACE FUNCTION is_staff_user(user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic policy again and create a better one
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- Create a NON-RECURSIVE policy using the helper function
CREATE POLICY "Staff can view all profiles" ON profiles
  FOR SELECT USING (is_staff_user(auth.uid()));

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_staff_user TO authenticated;

-- Verify the fix by checking all policies
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