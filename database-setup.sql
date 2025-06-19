-- Intellectif Booking System - Database Setup
-- Run this in your Supabase SQL editor

-- 1. Create required enums first
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'consultant', 'sales');
CREATE TYPE contact_method AS ENUM ('email', 'phone', 'both');

-- 2. Create profiles table (optimized for Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  role user_role NOT NULL DEFAULT 'customer',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  avatar_url TEXT,
  bio TEXT,

  -- Business preferences
  preferred_contact_method contact_method DEFAULT 'email',
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints for data integrity
  CONSTRAINT chk_profiles_names_not_empty CHECK (
    LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0
  )
);

-- 3. Enable Row Level Security on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Create helper functions
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_phone(user_id UUID)
RETURNS TEXT AS $$
  SELECT phone FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 6. Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Create function to update both auth.users and profiles
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  first_name_param TEXT DEFAULT NULL,
  last_name_param TEXT DEFAULT NULL,
  phone_param TEXT DEFAULT NULL,
  company_param TEXT DEFAULT NULL,
  timezone_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update auth.users metadata and phone
  UPDATE auth.users 
  SET 
    raw_user_meta_data = raw_user_meta_data || 
      jsonb_build_object(
        'first_name', COALESCE(first_name_param, raw_user_meta_data->>'first_name'),
        'last_name', COALESCE(last_name_param, raw_user_meta_data->>'last_name'),
        'company', COALESCE(company_param, raw_user_meta_data->>'company')
      ),
    phone = COALESCE(phone_param, phone),
    updated_at = NOW()
  WHERE id = user_id;

  -- Update or insert into profiles table
  INSERT INTO profiles (id, first_name, last_name, company, timezone, updated_at)
  VALUES (
    user_id,
    COALESCE(first_name_param, ''),
    COALESCE(last_name_param, ''),
    COALESCE(company_param, ''),
    COALESCE(timezone_param, 'UTC'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(first_name_param, profiles.first_name),
    last_name = COALESCE(last_name_param, profiles.last_name),
    company = COALESCE(company_param, profiles.company),
    timezone = COALESCE(timezone_param, profiles.timezone),
    updated_at = NOW();

  -- Return success result
  SELECT json_build_object('success', true, 'user_id', user_id) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles USING btree (id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_staff ON profiles USING btree (is_staff) WHERE is_staff = TRUE;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_phone TO authenticated; 