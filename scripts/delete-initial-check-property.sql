-- Borrar el initial check de la propiedad SP-NIU-O3C-005809 (si existe).
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- Por ON DELETE CASCADE se eliminan también inspection_zones e inspection_elements.

-- 1) Ver qué se va a borrar (opcional)
SELECT id, property_id, inspection_type, inspection_status, created_at
FROM property_inspections
WHERE property_id = 'SP-NIU-O3C-005809'
  AND inspection_type = 'initial';

-- 2) Borrar el initial check (las zonas y elementos se borran en cascada)
DELETE FROM property_inspections
WHERE property_id = 'SP-NIU-O3C-005809'
  AND inspection_type = 'initial';

-- Comprobar que ya no queda
SELECT COUNT(*) AS initial_checks_restantes
FROM property_inspections
WHERE property_id = 'SP-NIU-O3C-005809'
  AND inspection_type = 'initial';
