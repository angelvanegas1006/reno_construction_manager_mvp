-- Nuevos campos para tareas por fase en el Kanban de Maduración

ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_uploaded boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_reuploaded boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_review_done boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS financial_review_done boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_validation_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_validation_result text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_final_delivery_doc jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_reparos_doc jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_reparos_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS renovator_budget_doc jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS license_docs_ayto jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS town_hall_receipt jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS town_hall_fees jsonb;
