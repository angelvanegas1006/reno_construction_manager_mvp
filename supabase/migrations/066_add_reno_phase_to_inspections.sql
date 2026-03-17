-- Add reno_phase_at_creation to property_inspections to track in which phase the check was completed
-- This column is intentionally left NULL for historical records since we cannot reliably know
-- which phase the property was in when the check was originally performed.
-- It will be populated going forward when an inspector completes a final check.
ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS reno_phase_at_creation text;
