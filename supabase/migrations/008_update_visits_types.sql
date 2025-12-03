-- Migración: Actualizar tipos de visitas para incluir los tres tipos
-- Ejecutar en Supabase SQL Editor

-- Actualizar el comentario de la columna visit_type
COMMENT ON COLUMN property_visits.visit_type IS 'Tipo de visita: initial-check (Checklist inicial), final-check (Checklist final), obra-seguimiento (Seguimiento de obra), reminder (Recordatorio)';

-- Actualizar valores existentes si es necesario (opcional)
-- UPDATE property_visits SET visit_type = 'initial-check' WHERE visit_type = 'visit' AND ... (condiciones específicas);

-- Comentarios para documentación
COMMENT ON TABLE property_visits IS 'Visitas programadas para propiedades. Tipos: initial-check (Checklist inicial), final-check (Checklist final), obra-seguimiento (Seguimiento de obra en fase reno-in-progress), reminder (Recordatorio).';









