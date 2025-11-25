-- Migración: Arreglar índice de next_reno_steps
-- El índice actual falla cuando el contenido es muy largo (>2704 bytes)
-- Solución: Eliminar el índice B-tree ya que no es necesario para búsquedas frecuentes
-- Si en el futuro se necesita buscar en este campo, se puede crear un índice GIN de texto completo

-- Eliminar el índice problemático
DROP INDEX IF EXISTS idx_properties_next_reno_steps;

-- Comentario explicativo
COMMENT ON COLUMN properties.next_reno_steps IS 'Next Reno Steps from Airtable. Campo de texto largo que puede contener información detallada. No tiene índice para evitar problemas con contenido extenso.';

