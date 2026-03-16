ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_wip_project boolean DEFAULT false;
