-- Migración: Tabla projects y enlace properties -> project
-- Proyectos agrupan propiedades (tipos Project, WIP, New Build). Unit, Lot, Building no tienen proyecto.

-- Tabla projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  airtable_project_id TEXT,
  reno_phase TEXT CHECK (reno_phase IS NULL OR reno_phase IN (
    'reno-in-progress', 'furnishing', 'final-check', 'cleaning'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_reno_phase ON projects(reno_phase);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_airtable_project_id ON projects(airtable_project_id) WHERE airtable_project_id IS NOT NULL;

COMMENT ON TABLE projects IS 'Proyectos que agrupan propiedades (tipos Project, WIP, New Build). Sincronizados desde Airtable.';

-- Enlace properties -> project (nullable; Unit, Lot, Building no tienen proyecto)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_project_id ON properties(project_id);

COMMENT ON COLUMN properties.project_id IS 'Proyecto al que pertenece la propiedad. Solo para type Project, WIP, New Build.';
