-- Ampliar CHECK de projects.reno_phase para incluir las 8 fases Kanban Proyectos y 'orphaned'.
-- Antes solo permitía: reno-in-progress, furnishing, final-check, cleaning.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_reno_phase_check;

ALTER TABLE projects ADD CONSTRAINT projects_reno_phase_check CHECK (
  reno_phase IS NULL OR reno_phase IN (
    'reno-in-progress',
    'furnishing',
    'final-check',
    'cleaning',
    'analisis-supply',
    'analisis-reno',
    'administracion-reno',
    'pendiente-presupuestos-renovador',
    'obra-a-empezar',
    'obra-en-progreso',
    'amueblamiento',
    'check-final',
    'orphaned'
  )
);

COMMENT ON COLUMN projects.reno_phase IS 'Fase Kanban del proyecto. orphaned = ya no está en la vista de Airtable.';
