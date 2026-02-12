-- Visit Date desde Airtable (field id: flddFKqUl6WiDe97c). En el front: "Fecha de visita inicial"
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS initial_visit_date DATE;

COMMENT ON COLUMN properties.initial_visit_date IS 'Fecha de visita inicial. Sincronizado desde Airtable (Visit Date, flddFKqUl6WiDe97c)';
