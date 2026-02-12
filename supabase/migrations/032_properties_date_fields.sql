-- Fechas adicionales para la sección Resumen (sincronizadas desde Airtable)
-- Budget PH ready date, Renovator budget approval date, Reno end date, Est. reno start date

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS budget_ph_ready_date DATE,
  ADD COLUMN IF NOT EXISTS renovator_budget_approval_date DATE,
  ADD COLUMN IF NOT EXISTS reno_end_date DATE,
  ADD COLUMN IF NOT EXISTS est_reno_start_date DATE;

COMMENT ON COLUMN properties.budget_ph_ready_date IS 'Budget PH ready date desde Airtable';
COMMENT ON COLUMN properties.renovator_budget_approval_date IS 'Renovator budget approval date desde Airtable';
COMMENT ON COLUMN properties.reno_end_date IS 'Reno end date desde Airtable';
COMMENT ON COLUMN properties.est_reno_start_date IS 'Est. reno start date desde Airtable (field id fldPX58nQYf9HsTRE)';
