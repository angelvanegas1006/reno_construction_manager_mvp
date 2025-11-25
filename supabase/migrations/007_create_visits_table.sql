-- Migración: Crear tabla de visitas
-- Ejecutar en Supabase SQL Editor

-- Crear tabla de visitas
CREATE TABLE IF NOT EXISTS property_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    visit_type TEXT NOT NULL DEFAULT 'visit', -- 'visit' or 'reminder'
    notes TEXT,
    created_by TEXT,
    notified BOOLEAN DEFAULT false,
    notification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_property_visits_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_property_visits_property_id 
    ON property_visits(property_id);

CREATE INDEX IF NOT EXISTS idx_property_visits_date 
    ON property_visits(visit_date);

CREATE INDEX IF NOT EXISTS idx_property_visits_type 
    ON property_visits(visit_type);

CREATE INDEX IF NOT EXISTS idx_property_visits_notified 
    ON property_visits(notified, visit_date);

CREATE INDEX IF NOT EXISTS idx_property_visits_created_by 
    ON property_visits(created_by);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_property_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_visits_updated_at
    BEFORE UPDATE ON property_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_property_visits_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE property_visits IS 'Visitas y recordatorios programados para propiedades. Las visitas solo se pueden crear para propiedades en fases específicas, los recordatorios para cualquier propiedad del jefe de obra.';
COMMENT ON COLUMN property_visits.visit_type IS 'Tipo: visit (visita) o reminder (recordatorio)';
COMMENT ON COLUMN property_visits.visit_date IS 'Fecha y hora de la visita o recordatorio';


