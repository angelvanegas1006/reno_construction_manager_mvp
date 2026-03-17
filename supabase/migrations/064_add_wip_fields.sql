ALTER TABLE projects ADD COLUMN IF NOT EXISTS wip_status text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vpo_project text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wip_completion_pct text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_estimate_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS utility_status_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS licenses_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ct_trans_center text;
