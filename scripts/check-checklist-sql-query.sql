-- Query para verificar datos del checklist final en Supabase
-- Reemplaza 'SP-OVN-OKN-005402' con el ID de la propiedad que quieras verificar

-- 1. Verificar la inspección final
SELECT 
  id,
  property_id,
  inspection_type,
  inspection_status,
  created_at,
  completed_at,
  pdf_url
FROM property_inspections
WHERE property_id = 'SP-OVN-OKN-005402'
  AND inspection_type = 'final'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Verificar las zonas de la inspección
SELECT 
  iz.id,
  iz.zone_name,
  iz.zone_type,
  iz.inspection_id
FROM inspection_zones iz
INNER JOIN property_inspections pi ON iz.inspection_id = pi.id
WHERE pi.property_id = 'SP-OVN-OKN-005402'
  AND pi.inspection_type = 'final'
ORDER BY iz.created_at;

-- 3. Verificar TODOS los elementos guardados (más completo)
SELECT 
  ie.id,
  ie.element_name,
  ie.condition,
  ie.quantity,
  ie.status,
  ie.notes,
  ie.exists,
  CASE 
    WHEN ie.image_urls IS NOT NULL THEN jsonb_array_length(ie.image_urls::jsonb)
    ELSE 0
  END as photos_count,
  CASE 
    WHEN ie.video_urls IS NOT NULL THEN jsonb_array_length(ie.video_urls::jsonb)
    ELSE 0
  END as videos_count,
  iz.zone_name,
  iz.zone_type
FROM inspection_elements ie
INNER JOIN inspection_zones iz ON ie.zone_id = iz.id
INNER JOIN property_inspections pi ON iz.inspection_id = pi.id
WHERE pi.property_id = 'SP-OVN-OKN-005402'
  AND pi.inspection_type = 'final'
ORDER BY iz.zone_type, ie.element_name;

-- 4. Verificar específicamente elementos de "Estado General" (distribucion)
SELECT 
  ie.element_name,
  ie.condition,
  ie.quantity,
  ie.status,
  ie.notes,
  CASE 
    WHEN ie.image_urls IS NOT NULL THEN jsonb_array_length(ie.image_urls::jsonb)
    ELSE 0
  END as photos_count
FROM inspection_elements ie
INNER JOIN inspection_zones iz ON ie.zone_id = iz.id
INNER JOIN property_inspections pi ON iz.inspection_id = pi.id
WHERE pi.property_id = 'SP-OVN-OKN-005402'
  AND pi.inspection_type = 'final'
  AND iz.zone_type = 'distribucion'
ORDER BY ie.element_name;

-- 5. Buscar específicamente "acabados" (question) y "radiadores" (climatization item)
SELECT 
  ie.element_name,
  ie.condition,
  ie.quantity,
  ie.status,
  ie.notes,
  iz.zone_name,
  iz.zone_type
FROM inspection_elements ie
INNER JOIN inspection_zones iz ON ie.zone_id = iz.id
INNER JOIN property_inspections pi ON iz.inspection_id = pi.id
WHERE pi.property_id = 'SP-OVN-OKN-005402'
  AND pi.inspection_type = 'final'
  AND iz.zone_type = 'distribucion'  -- Estado General
  AND (
    ie.element_name = 'acabados' OR  -- Question: Finishes
    ie.element_name LIKE 'climatization-radiadores%' OR  -- Climatization item: Radiators
    ie.element_name LIKE 'climatization-radiador%'
  )
ORDER BY ie.element_name;

-- 6. Query simplificada para verificar solo acabados y radiadores
SELECT 
  CASE 
    WHEN ie.element_name = 'acabados' THEN 'Acabados (Finishes)'
    WHEN ie.element_name LIKE 'climatization-radiadores%' THEN 'Radiadores (Radiators)'
    ELSE ie.element_name
  END as campo,
  ie.condition as condicion,
  ie.quantity as cantidad,
  ie.status as estado,
  CASE 
    WHEN ie.image_urls IS NOT NULL THEN jsonb_array_length(ie.image_urls::jsonb)
    ELSE 0
  END as fotos
FROM inspection_elements ie
INNER JOIN inspection_zones iz ON ie.zone_id = iz.id
INNER JOIN property_inspections pi ON iz.inspection_id = pi.id
WHERE pi.property_id = 'SP-OVN-OKN-005402'
  AND pi.inspection_type = 'final'
  AND iz.zone_type = 'distribucion'
  AND (
    ie.element_name = 'acabados' OR
    ie.element_name LIKE 'climatization-radiadores%'
  )
ORDER BY ie.element_name;
