-- Migración: Añadir columna "Estimated Visit Date" a properties si no existe
-- Usada para visitas estimadas (initial check) y mostrada en el calendario
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'Estimated Visit Date'
  ) THEN
    ALTER TABLE properties
    ADD COLUMN "Estimated Visit Date" DATE;
    RAISE NOTICE 'Columna "Estimated Visit Date" creada en properties';
  ELSE
    RAISE NOTICE 'Columna "Estimated Visit Date" ya existe en properties';
  END IF;
END $$;

COMMENT ON COLUMN properties."Estimated Visit Date" IS 'Fecha estimada de visita (initial check). Sincronizada con Airtable y usada en el calendario.';
