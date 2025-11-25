-- Migración: Agregar columna reno_phase si no existe
-- Ejecutar en Supabase SQL Editor

-- Agregar columna reno_phase si no existe
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS reno_phase VARCHAR(50);

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_properties_reno_phase ON properties(reno_phase);

-- Comentario para documentación
COMMENT ON COLUMN properties.reno_phase IS 'Renovation phase for Reno Construction Manager (e.g., upcoming-settlements, initial-check, etc.)';


