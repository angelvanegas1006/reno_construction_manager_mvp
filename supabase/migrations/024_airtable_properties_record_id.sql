-- Guardar el record ID de la tabla Properties de Airtable para poder vincular
-- desde Projects."Properties linked" (Linked record a Properties) → properties.project_id
ALTER TABLE properties ADD COLUMN IF NOT EXISTS airtable_properties_record_id TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_airtable_properties_record_id
  ON properties(airtable_properties_record_id) WHERE airtable_properties_record_id IS NOT NULL;

COMMENT ON COLUMN properties.airtable_properties_record_id IS 'Record ID de la tabla Properties en Airtable; usado para asignar project_id desde Projects."Properties linked"';
