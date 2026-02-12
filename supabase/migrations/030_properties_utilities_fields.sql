-- Water status, Gas status, Electricity status, Utilities notes (sincronizados con Airtable)
-- Water status: fldPqhw8SDUUbFAci
-- Gas status: fldFg2bvCorelCAyM
-- Electricity status: fldERIHBvXSjZN24B
-- Utilities notes: fldL7XsAluSiW9go2

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS water_status TEXT,
  ADD COLUMN IF NOT EXISTS gas_status TEXT,
  ADD COLUMN IF NOT EXISTS electricity_status TEXT,
  ADD COLUMN IF NOT EXISTS utilities_notes TEXT;

COMMENT ON COLUMN properties.water_status IS 'Estado del agua. Sincronizado desde Airtable (Water status, fldPqhw8SDUUbFAci)';
COMMENT ON COLUMN properties.gas_status IS 'Estado del gas. Sincronizado desde Airtable (Gas status, fldFg2bvCorelCAyM)';
COMMENT ON COLUMN properties.electricity_status IS 'Estado de la electricidad. Sincronizado desde Airtable (Electricity status, fldERIHBvXSjZN24B)';
COMMENT ON COLUMN properties.utilities_notes IS 'Notas de suministros. Sincronizado desde Airtable (Utilities notes, fldL7XsAluSiW9go2)';
