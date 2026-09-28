-- -----------------------------------------------------------------------------
-- TAGPUAN ERP - MIGRATION 20260830000004: KIOSK PIN & PROFILE SECURITY SCHEMA
-- Adds kiosk_pin and is_pin_configured to public.profiles table
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kiosk_pin VARCHAR(6) NULL,
ADD COLUMN IF NOT EXISTS is_pin_configured BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index on role and branch for high-performance kiosk PIN verification lookups
CREATE INDEX IF NOT EXISTS idx_profiles_kiosk_pin ON public.profiles(role, branch_id, kiosk_pin);

-- Comments describing columns and security requirements
COMMENT ON COLUMN public.profiles.kiosk_pin IS 'Secure 4 to 6-digit numeric PIN for Manager and Owner Kiosk terminal authorization';
COMMENT ON COLUMN public.profiles.is_pin_configured IS 'Flag tracking whether a Manager has configured their personal Kiosk PIN';
