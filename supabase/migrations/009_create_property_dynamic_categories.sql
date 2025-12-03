-- Migración: Crear tabla de categorías dinámicas para propiedades
-- Ejecutar en Supabase SQL Editor
-- Esta tabla almacena las categorías de progreso de obras que se extraen del PDF del presupuesto
-- o se crean manualmente para reportar el avance de las obras

-- Crear tabla property_dynamic_categories
CREATE TABLE IF NOT EXISTS property_dynamic_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    activities_text TEXT,
    percentage INTEGER CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key a properties
    CONSTRAINT fk_property_dynamic_categories_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_property_dynamic_categories_property_id 
    ON property_dynamic_categories(property_id);

CREATE INDEX IF NOT EXISTS idx_property_dynamic_categories_created_at 
    ON property_dynamic_categories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_dynamic_categories_updated_at 
    ON property_dynamic_categories(updated_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_property_dynamic_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_dynamic_categories_updated_at
    BEFORE UPDATE ON property_dynamic_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_property_dynamic_categories_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE property_dynamic_categories IS 'Categorías dinámicas de progreso de obras para propiedades. Estas categorías se extraen del PDF del presupuesto o se crean manualmente para reportar el avance de las obras.';
COMMENT ON COLUMN property_dynamic_categories.category_name IS 'Nombre de la categoría (ej: "Fontanería", "Electricidad", "Carpintería")';
COMMENT ON COLUMN property_dynamic_categories.activities_text IS 'Texto descriptivo de las actividades incluidas en esta categoría';
COMMENT ON COLUMN property_dynamic_categories.percentage IS 'Porcentaje de progreso de la categoría (0-100). No se puede retroceder, solo avanzar.';








