-- Add WIP Due Diligence boolean checkboxes and construction estimate attachment
ALTER TABLE projects ADD COLUMN IF NOT EXISTS licenses_ok boolean;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS utilities_ok boolean;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_estimate_ok boolean;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_estimate_attachment jsonb;
