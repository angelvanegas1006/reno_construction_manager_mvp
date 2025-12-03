-- Migración: Agregar campo pics_urls a la tabla properties
-- Este campo almacena las URLs de las fotos de la propiedad que vienen de Airtable
-- Field ID en Airtable: fldq1FLXBToYEY9W3

-- Agregar columna para URLs de fotos (array de texto)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS pics_urls TEXT[] DEFAULT '{}';

-- Crear índice para búsquedas rápidas (opcional, útil si se busca por URLs)
CREATE INDEX IF NOT EXISTS idx_properties_pics_urls 
ON properties USING GIN (pics_urls);

-- Comentario para documentación
COMMENT ON COLUMN properties.pics_urls IS 'URLs de las fotos de la propiedad sincronizadas desde Airtable. Field ID: fldq1FLXBToYEY9W3';








