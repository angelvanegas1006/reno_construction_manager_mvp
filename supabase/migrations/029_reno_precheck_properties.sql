-- Notas y estado del precheck "Dar obra por finalizada" (fase Reno in progress)
-- reno_precheck_comments: comentario general del modal
-- reno_precheck_checks: JSON con { categoryChecks: Record<string, boolean>, itemChecks: Record<string, boolean> }
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS reno_precheck_comments TEXT,
  ADD COLUMN IF NOT EXISTS reno_precheck_checks JSONB DEFAULT '{}';

COMMENT ON COLUMN properties.reno_precheck_comments IS 'Comentario general del precheck Dar obra por finalizada';
COMMENT ON COLUMN properties.reno_precheck_checks IS 'Estado de checkboxes del precheck: { categoryChecks: {}, itemChecks: {} }';
