-- Final Check de proyecto: una instancia por proyecto, con una fila por vivienda (propiedad).
-- El jefe de obra asignado rellena estado_vivienda y estado_mobiliario por cada vivienda; luego se genera informe PDF.

-- Eliminar tablas si existían con un esquema antiguo (evita error "column project_final_check_id does not exist")
DROP TABLE IF EXISTS project_final_check_dwellings;
DROP TABLE IF EXISTS project_final_checks;

-- Tabla principal: una por proyecto (cuando el foreman inicia el check)
CREATE TABLE IF NOT EXISTS project_final_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_site_manager_email TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_final_checks_project_id ON project_final_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_final_checks_assigned ON project_final_checks(assigned_site_manager_email);
CREATE INDEX IF NOT EXISTS idx_project_final_checks_status ON project_final_checks(status);

COMMENT ON TABLE project_final_checks IS 'Instancia de Final Check de un proyecto. Una por proyecto; el jefe de obra rellena las viviendas y genera el informe PDF.';

-- Tabla por vivienda: estado texto libre por propiedad del proyecto
CREATE TABLE IF NOT EXISTS project_final_check_dwellings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_final_check_id UUID NOT NULL REFERENCES project_final_checks(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  estado_vivienda TEXT,
  estado_mobiliario TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_final_check_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_project_final_check_dwellings_check ON project_final_check_dwellings(project_final_check_id);
CREATE INDEX IF NOT EXISTS idx_project_final_check_dwellings_property ON project_final_check_dwellings(property_id);

COMMENT ON TABLE project_final_check_dwellings IS 'Por cada vivienda (propiedad) del proyecto: texto libre estado vivienda y estado mobiliario para el informe Final Check.';

-- Trigger updated_at para project_final_checks
CREATE OR REPLACE FUNCTION update_project_final_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_final_checks_updated_at ON project_final_checks;
CREATE TRIGGER trigger_project_final_checks_updated_at
  BEFORE UPDATE ON project_final_checks
  FOR EACH ROW EXECUTE FUNCTION update_project_final_checks_updated_at();

-- Trigger updated_at para project_final_check_dwellings
CREATE OR REPLACE FUNCTION update_project_final_check_dwellings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_final_check_dwellings_updated_at ON project_final_check_dwellings;
CREATE TRIGGER trigger_project_final_check_dwellings_updated_at
  BEFORE UPDATE ON project_final_check_dwellings
  FOR EACH ROW EXECUTE FUNCTION update_project_final_check_dwellings_updated_at();

-- RLS: permitir anon/authenticated (app usa Auth0 + anon key; roles se validan en app)
ALTER TABLE project_final_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_final_check_dwellings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read project_final_checks" ON project_final_checks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert project_final_checks" ON project_final_checks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update project_final_checks" ON project_final_checks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete project_final_checks" ON project_final_checks FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated read project_final_checks" ON project_final_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert project_final_checks" ON project_final_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update project_final_checks" ON project_final_checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete project_final_checks" ON project_final_checks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow anon read project_final_check_dwellings" ON project_final_check_dwellings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert project_final_check_dwellings" ON project_final_check_dwellings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update project_final_check_dwellings" ON project_final_check_dwellings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete project_final_check_dwellings" ON project_final_check_dwellings FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated read project_final_check_dwellings" ON project_final_check_dwellings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert project_final_check_dwellings" ON project_final_check_dwellings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update project_final_check_dwellings" ON project_final_check_dwellings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete project_final_check_dwellings" ON project_final_check_dwellings FOR DELETE TO authenticated USING (true);
