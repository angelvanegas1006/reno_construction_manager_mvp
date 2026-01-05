-- Migración: Crear tabla property_images para almacenar imágenes de propiedades
-- Esta tabla se usa para guardar imágenes de updates y otras imágenes relacionadas con propiedades

CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_created_at ON property_images(created_at DESC);

-- Crear índice GIN para búsquedas en metadata JSONB
CREATE INDEX IF NOT EXISTS idx_property_images_metadata ON property_images USING GIN (metadata);

-- Comentarios para documentación
COMMENT ON TABLE property_images IS 'Almacena imágenes relacionadas con propiedades (updates, avances, etc.)';
COMMENT ON COLUMN property_images.metadata IS 'Metadatos JSONB. Usar metadata->>type para identificar el tipo de imagen (ej: "update")';

-- Habilitar RLS (Row Level Security)
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir a usuarios autenticados leer y escribir)
-- Ajustar según necesidades de seguridad
CREATE POLICY "Allow authenticated users to read property images"
ON property_images
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert property images"
ON property_images
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update property images"
ON property_images
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete property images"
ON property_images
FOR DELETE
TO authenticated
USING (true);




