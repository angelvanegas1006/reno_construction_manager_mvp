-- Borrar el final check de la vivienda SP-NIU-O3C-005809:
-- 1) Quitar la vivienda del check (project_final_check_dwellings)
-- 2) Si el check queda sin viviendas, borrar también el check (project_final_checks)

DELETE FROM project_final_check_dwellings
WHERE property_id = 'SP-NIU-O3C-005809';

DELETE FROM project_final_checks
WHERE id NOT IN (SELECT DISTINCT project_final_check_id FROM project_final_check_dwellings);
