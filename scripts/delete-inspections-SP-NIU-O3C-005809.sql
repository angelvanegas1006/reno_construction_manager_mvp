-- Borrar checks iniciales y finales de la propiedad SP-NIU-O3C-005809
-- Ejecutar en Supabase SQL Editor

DO $$
DECLARE
  v_property_id uuid;
  v_inspection record;
  v_zone_ids uuid[];
BEGIN
  -- 1. Obtener property_id por Unique ID
  SELECT id INTO v_property_id
  FROM properties
  WHERE "Unique ID From Engagements" = 'SP-NIU-O3C-005809'::text;

  IF v_property_id IS NULL THEN
    RAISE NOTICE 'Propiedad no encontrada con Unique ID: SP-NIU-O3C-005809';
    RETURN;
  END IF;

  RAISE NOTICE 'Propiedad encontrada: %', v_property_id;

  -- 2. Para cada inspección initial/final
  FOR v_inspection IN
    SELECT id, inspection_type
    FROM property_inspections
    WHERE property_id = v_property_id
      AND inspection_type IN ('initial', 'final')
  LOOP
    RAISE NOTICE 'Borrando inspección % (%)', v_inspection.inspection_type, v_inspection.id;

    -- 2a. Borrar elementos de las zonas de esta inspección
    DELETE FROM inspection_elements
    WHERE zone_id IN (
      SELECT id FROM inspection_zones WHERE inspection_id = v_inspection.id
    );

    -- 2b. Borrar zonas
    DELETE FROM inspection_zones WHERE inspection_id = v_inspection.id;

    -- 2c. Borrar la inspección
    DELETE FROM property_inspections WHERE id = v_inspection.id;

    RAISE NOTICE '  ✅ Inspección % borrada', v_inspection.inspection_type;
  END LOOP;

  RAISE NOTICE 'Completado';
END $$;
