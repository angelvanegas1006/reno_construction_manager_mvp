-- Subcarpeta de Drive para fotos de avance de obra (reno updates)
-- Se crea la primera vez que se envían fotos de progreso; n8n la crea dentro de la carpeta principal de la propiedad

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS drive_folder_reno_updates_id TEXT,
ADD COLUMN IF NOT EXISTS drive_folder_reno_updates_url TEXT;

COMMENT ON COLUMN properties.drive_folder_reno_updates_id IS 'ID de la subcarpeta de Drive para fotos de avance de obra (creada por webhook reno/updates/foldercreation)';
COMMENT ON COLUMN properties.drive_folder_reno_updates_url IS 'URL de la subcarpeta de Drive para fotos de avance de obra';
