-- ============================================
-- Migración: Agregar rol construction_manager
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Actualizar el CHECK constraint en la tabla user_roles para incluir 'construction_manager'
-- Nota: La tabla user_roles usa TEXT con CHECK constraint, no un enum

ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'foreman', 'user', 'construction_manager'));

-- ============================================
-- ✅ Migración Completada
-- ============================================

