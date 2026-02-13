-- ============================================
-- RLS para tablas de checklist con acceso anon (Auth0)
-- Con Auth0 no hay sesión Supabase (auth.uid() = null). Esta migración permite
-- que el cliente con anon key pueda leer y escribir en las tablas de checklist.
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- ============================================

-- Habilitar RLS en las tablas (si no está ya)
ALTER TABLE property_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_elements ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que exijan auth.uid() si existen (por nombre conocido)
DROP POLICY IF EXISTS "Allow anon read property_inspections" ON property_inspections;
DROP POLICY IF EXISTS "Allow anon write property_inspections" ON property_inspections;
DROP POLICY IF EXISTS "Allow anon read inspection_zones" ON inspection_zones;
DROP POLICY IF EXISTS "Allow anon write inspection_zones" ON inspection_zones;
DROP POLICY IF EXISTS "Allow anon read inspection_elements" ON inspection_elements;
DROP POLICY IF EXISTS "Allow anon write inspection_elements" ON inspection_elements;

-- property_inspections: anon puede SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Allow anon read property_inspections"
ON property_inspections FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert property_inspections"
ON property_inspections FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update property_inspections"
ON property_inspections FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete property_inspections"
ON property_inspections FOR DELETE TO anon USING (true);

-- inspection_zones: anon puede SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Allow anon read inspection_zones"
ON inspection_zones FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert inspection_zones"
ON inspection_zones FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update inspection_zones"
ON inspection_zones FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete inspection_zones"
ON inspection_zones FOR DELETE TO anon USING (true);

-- inspection_elements: anon puede SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Allow anon read inspection_elements"
ON inspection_elements FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert inspection_elements"
ON inspection_elements FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update inspection_elements"
ON inspection_elements FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete inspection_elements"
ON inspection_elements FOR DELETE TO anon USING (true);

-- Service role sigue pudiendo todo por defecto (bypass RLS)
-- ✅ Migración completada
