-- Migración: Crear tabla de comentarios para propiedades
-- Ejecutar en Supabase SQL Editor

-- Crear tabla property_comments
CREATE TABLE IF NOT EXISTS property_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_to_airtable BOOLEAN DEFAULT false,
    airtable_sync_date TIMESTAMP WITH TIME ZONE,
    
    -- Índices para búsquedas rápidas
    CONSTRAINT fk_property_comments_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_property_comments_property_id 
    ON property_comments(property_id);

CREATE INDEX IF NOT EXISTS idx_property_comments_created_at 
    ON property_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_comments_synced 
    ON property_comments(synced_to_airtable, airtable_sync_date);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_property_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_comments_updated_at
    BEFORE UPDATE ON property_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_property_comments_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE property_comments IS 'Comentarios asociados a propiedades. Se sincronizan con Airtable combinando todos los comentarios con timestamps.';
COMMENT ON COLUMN property_comments.comment_text IS 'Texto del comentario';
COMMENT ON COLUMN property_comments.synced_to_airtable IS 'Indica si el comentario ya fue sincronizado con Airtable';
COMMENT ON COLUMN property_comments.airtable_sync_date IS 'Fecha en que se sincronizó con Airtable';









