-- Migración: Agregar índice y comentarios para seguimiento de obra por jefes de obra
-- Ejecutar en Supabase SQL Editor

-- El campo needs_foreman_notification ya existe en la tabla properties
-- Agregamos índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_properties_needs_foreman_notification 
    ON properties(needs_foreman_notification) 
    WHERE needs_foreman_notification = true;

-- Agregar índice compuesto para filtrar por fase y seguimiento
CREATE INDEX IF NOT EXISTS idx_properties_reno_phase_needs_tracking 
    ON properties(reno_phase, needs_foreman_notification) 
    WHERE reno_phase = 'reno-in-progress' AND needs_foreman_notification = true;

-- Comentarios para documentación
COMMENT ON COLUMN properties.needs_foreman_notification IS 'Indica si el Gerente de Construcción ha marcado esta propiedad como que necesita seguimiento de obra por parte del jefe de obra asignado. Solo aplica para propiedades en fase reno-in-progress.';

-- ============================================
-- ✅ Migración Completada
-- ============================================
