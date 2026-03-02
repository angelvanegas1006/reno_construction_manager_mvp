ALTER TABLE projects ADD COLUMN IF NOT EXISTS architect_notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS usable_square_meters NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS architect_attachments JSONB;
