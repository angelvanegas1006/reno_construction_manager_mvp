-- ============================================
-- Migración: Tabla user_roles para autenticación
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Crear tabla user_roles si no existe
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio rol
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Solo admins pueden insertar/actualizar roles
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Permitir inserción durante creación de usuario (para service_role)
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;
CREATE POLICY "Service role can manage roles"
  ON user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ✅ Migración Completada
-- ============================================

-- Nota: Después de ejecutar esta migración, crea usuarios desde:
-- Supabase Dashboard → Authentication → Users → Add user
-- Luego asigna roles ejecutando:
-- INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'foreman');

