-- Añadir columnas en projects para campos traídos de Airtable (tabla Projects).
-- Field IDs documentados en sync-projects.ts. "Properties linked" no se persiste aquí (relación vía properties.project_id).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS investment_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS properties_to_convert TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS renovation_spend NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_unique_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_settlement_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_cluster TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_set_up_team_notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_keys_location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS renovator TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS est_reno_start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reno_start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reno_end_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS est_reno_end_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reno_duration NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS already_tenanted TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS operation_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS opportunity_stage TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scouter TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead TEXT;

COMMENT ON COLUMN projects.investment_type IS 'Airtable: Investment type (fldqEG0ELFy8MMahd)';
COMMENT ON COLUMN projects.project_unique_id IS 'Airtable: Project Unique ID (fldEpcdZ9IRytENi4)';
COMMENT ON COLUMN projects.project_status IS 'Airtable: Project status (flds2Fe3uSYu9ipUZ) - puede usarse para mapear reno_phase';
