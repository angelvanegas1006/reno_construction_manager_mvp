-- Migración: Agregar columna next_reno_steps para Initial Check
-- Ejecutar en Supabase SQL Editor

-- Agregar columna next_reno_steps
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS next_reno_steps TEXT;

-- Crear índice si es necesario
CREATE INDEX IF NOT EXISTS idx_properties_next_reno_steps ON properties(next_reno_steps);

-- Comentario para documentación
COMMENT ON COLUMN properties.next_reno_steps IS 'Next Reno Steps from Airtable (Initial Check phase)';


