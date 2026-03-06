ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_first_start_date timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_first_end_date timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_final_start_date timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_final_end_date timestamptz;
