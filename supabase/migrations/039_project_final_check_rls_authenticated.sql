-- RLS: permitir también al rol "authenticated" (cuando el cliente envía JWT, p. ej. Auth0).
-- Sin estas políticas, las peticiones con JWT reciben 403 en project_final_checks y project_final_check_dwellings.

CREATE POLICY "Allow authenticated read project_final_checks"
  ON project_final_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert project_final_checks"
  ON project_final_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update project_final_checks"
  ON project_final_checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete project_final_checks"
  ON project_final_checks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read project_final_check_dwellings"
  ON project_final_check_dwellings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert project_final_check_dwellings"
  ON project_final_check_dwellings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update project_final_check_dwellings"
  ON project_final_check_dwellings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete project_final_check_dwellings"
  ON project_final_check_dwellings FOR DELETE TO authenticated USING (true);
