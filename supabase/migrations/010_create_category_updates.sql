-- Migración: Crear tabla de updates de categorías con fotos/videos
-- Ejecutar en Supabase SQL Editor
-- Esta tabla almacena los updates de progreso de categorías con fotos/videos opcionales

-- Crear tabla category_updates
CREATE TABLE IF NOT EXISTS category_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL,
    property_id TEXT NOT NULL,
    previous_percentage INTEGER CHECK (previous_percentage IS NULL OR (previous_percentage >= 0 AND previous_percentage <= 100)),
    new_percentage INTEGER NOT NULL CHECK (new_percentage >= 0 AND new_percentage <= 100),
    photos TEXT[], -- Array de URLs de fotos
    videos TEXT[], -- Array de URLs de videos
    notes TEXT, -- Notas opcionales del update
    created_by TEXT, -- ID del usuario que hizo el update
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_category_updates_category 
        FOREIGN KEY (category_id) 
        REFERENCES property_dynamic_categories(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_category_updates_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_category_updates_category_id 
    ON category_updates(category_id);

CREATE INDEX IF NOT EXISTS idx_category_updates_property_id 
    ON category_updates(property_id);

CREATE INDEX IF NOT EXISTS idx_category_updates_created_at 
    ON category_updates(created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE category_updates IS 'Updates de progreso de categorías con fotos/videos opcionales. Cada vez que se actualiza el porcentaje de una categoría, se puede registrar un update con evidencia visual.';
COMMENT ON COLUMN category_updates.previous_percentage IS 'Porcentaje anterior antes del update';
COMMENT ON COLUMN category_updates.new_percentage IS 'Nuevo porcentaje después del update';
COMMENT ON COLUMN category_updates.photos IS 'Array de URLs de fotos asociadas al update';
COMMENT ON COLUMN category_updates.videos IS 'Array de URLs de videos asociados al update';
COMMENT ON COLUMN category_updates.notes IS 'Notas opcionales sobre el update';
