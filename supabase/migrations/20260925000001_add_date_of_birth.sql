-- ==============================================================================
-- BORING DATABASE MIGRATION — ADD DATE OF BIRTH FOR ACCOUNT RECOVERY
-- ==============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
