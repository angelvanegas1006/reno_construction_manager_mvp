-- Ampliar CHECK de projects.reno_phase para incluir las 8 fases del Kanban de Maduración.

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
    'orphaned',
    'get-project-draft',
    'pending-to-validate',
    'pending-to-reserve-arras',
    'technical-project-in-progress',
    'ecuv-first-validation',
    'technical-project-fine-tuning',
    'ecuv-final-validation',
    'pending-budget-from-renovator'
  )
);
