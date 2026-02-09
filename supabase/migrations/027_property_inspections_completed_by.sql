-- Migración: Añadir columna completed_by a property_inspections
-- created_by = quien inicia el check (solo al crear, no se sobrescribe)
-- completed_by = quien completa el check (se setea al marcar como completado)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE property_inspections
ADD COLUMN IF NOT EXISTS completed_by TEXT;

COMMENT ON COLUMN property_inspections.completed_by IS 'Usuario que completó la inspección (auth.users.id). created_by es quien la inició.';
