-- ============================================
-- FIX: Eliminar TODAS las políticas de property_inspections y recrear solo anon
-- Si el INSERT falla con "violates row-level security policy", suele ser porque
-- hay políticas que solo permiten authenticated. Este script borra todas y deja solo anon.
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- ============================================

-- 1) Borrar TODAS las políticas existentes en property_inspections (cualquier nombre)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'property_inspections'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON property_inspections', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 2) Políticas para anon (cliente sin JWT Supabase)
CREATE POLICY "Allow anon read property_inspections"
ON property_inspections FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert property_inspections"
ON property_inspections FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update property_inspections"
ON property_inspections FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete property_inspections"
ON property_inspections FOR DELETE TO anon USING (true);

-- 3) Políticas para authenticated (p. ej. cuando hay JWT de Auth0; auth.uid() puede ser null)
-- Sin esto, si Supabase recibe un JWT la petición va como "authenticated" y el INSERT falla.
CREATE POLICY "Allow authenticated read property_inspections"
ON property_inspections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert property_inspections"
ON property_inspections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update property_inspections"
ON property_inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete property_inspections"
ON property_inspections FOR DELETE TO authenticated USING (true);

-- ✅ Completado
