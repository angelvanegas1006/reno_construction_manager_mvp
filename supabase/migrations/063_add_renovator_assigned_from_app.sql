ALTER TABLE properties ADD COLUMN IF NOT EXISTS renovator_assigned_from_app boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS renovator_assigned_at timestamptz;
