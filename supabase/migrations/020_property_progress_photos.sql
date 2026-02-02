-- Tabla para registrar fotos de avance de obra subidas por el usuario (fase obras en proceso)
-- Permite mostrar en "Estado de la propiedad" las fotos agrupadas por fecha de envío

CREATE TABLE IF NOT EXISTS property_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_progress_photos_property_id
  ON property_progress_photos(property_id);

CREATE INDEX IF NOT EXISTS idx_property_progress_photos_uploaded_at
  ON property_progress_photos(uploaded_at DESC);

COMMENT ON TABLE property_progress_photos IS 'Fotos de avance de obra subidas por el usuario en la fase obras en proceso. Se usa para mostrarlas en Estado de la propiedad agrupadas por fecha de envío.';
COMMENT ON COLUMN property_progress_photos.file_url IS 'URL pública de la foto en Supabase Storage (inspection-images)';
COMMENT ON COLUMN property_progress_photos.uploaded_at IS 'Fecha y hora en que el usuario subió la foto';

-- RLS: permitir leer a usuarios autenticados que puedan ver la propiedad
ALTER TABLE property_progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read property_progress_photos for authenticated"
  ON property_progress_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert property_progress_photos via service"
  ON property_progress_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow delete property_progress_photos for same property"
  ON property_progress_photos FOR DELETE
  TO authenticated
  USING (true);
