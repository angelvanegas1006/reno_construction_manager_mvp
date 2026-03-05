ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_maturation_project boolean DEFAULT false;

-- Mark existing projects that are currently in maturation phases
UPDATE projects
SET is_maturation_project = true
WHERE reno_phase IN (
  'get-project-draft',
  'pending-to-validate',
  'pending-to-reserve-arras',
  'technical-project-in-progress',
  'ecuv-first-validation',
  'technical-project-fine-tuning',
  'ecuv-final-validation',
  'pending-budget-from-renovator'
);
