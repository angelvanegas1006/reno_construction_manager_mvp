-- Migración: Agregar campo budget_index a property_dynamic_categories
-- Este campo identifica de qué presupuesto viene cada categoría cuando hay múltiples presupuestos
-- Ejecutar en Supabase SQL Editor

-- Agregar columna budget_index si no existe
ALTER TABLE property_dynamic_categories
ADD COLUMN IF NOT EXISTS budget_index INTEGER DEFAULT 1;

-- Crear índice para búsquedas por budget_index
CREATE INDEX IF NOT EXISTS idx_property_dynamic_categories_budget_index 
ON property_dynamic_categories(property_id, budget_index);

-- Comentario para documentación
COMMENT ON COLUMN property_dynamic_categories.budget_index IS 'Índice del presupuesto de origen (1, 2, 3, etc.) cuando hay múltiples presupuestos en budget_pdf_url';
