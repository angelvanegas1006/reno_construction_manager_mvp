-- Migración: Agregar columnas para sincronización con Airtable
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas nuevas para campos de Airtable
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS keys_location TEXT,
ADD COLUMN IF NOT EXISTS responsible_owner TEXT,
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS property_unique_id TEXT;

-- Agregar índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_properties_property_unique_id ON properties(property_unique_id);
CREATE INDEX IF NOT EXISTS idx_properties_stage ON properties(stage);
CREATE INDEX IF NOT EXISTS idx_properties_airtable_property_id ON properties(airtable_property_id);

-- Comentarios para documentación
COMMENT ON COLUMN properties.keys_location IS 'Keys Location from Airtable';
COMMENT ON COLUMN properties.responsible_owner IS 'Responsible Owner from Airtable';
COMMENT ON COLUMN properties.stage IS 'Stage from Airtable (e.g., Presettlement & Settled)';
COMMENT ON COLUMN properties.property_unique_id IS 'Property Unique ID from Airtable';


