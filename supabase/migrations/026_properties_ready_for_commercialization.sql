-- Migración: Agregar columna ready_for_commercialization en properties
-- Respuesta al final check: ¿La vivienda está lista para la comercialización? (Sí/No)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS ready_for_commercialization BOOLEAN;

COMMENT ON COLUMN properties.ready_for_commercialization IS 'Indica si la vivienda está lista para comercialización (respuesta al finalizar el final check). NULL = no respondido aún.';
