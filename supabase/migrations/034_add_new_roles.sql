-- ============================================
-- Migración: Agregar roles manager_projects, technical_constructor_projects, maduration_analyst
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN (
  'admin', 'foreman', 'user', 'construction_manager',
  'rent_manager', 'rent_agent', 'tenant',
  'manager_projects', 'technical_constructor_projects', 'maduration_analyst'
));

-- ============================================
-- Migración completada
-- ============================================
