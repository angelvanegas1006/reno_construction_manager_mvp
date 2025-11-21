# 👥 Crear Usuarios en Producción

## 🔍 Problema

Los usuarios creados en **localhost (dev)** no existen en **producción** porque cada proyecto Supabase tiene su propia base de datos de usuarios.

## ✅ Solución: Crear Usuarios en Producción

### **Opción 1: Desde Supabase Dashboard (Recomendado)**

1. Ve a tu proyecto de producción en Supabase Dashboard
2. Menú lateral → **Authentication** → **Users**
3. Click en **"Add user"** → **"Create new user"**
4. Completa:
   - **Email**: `tu-email@ejemplo.com`
   - **Password**: Genera una contraseña segura
   - **Auto Confirm User**: ✅ Marca esta casilla (para que no necesite verificar email)
5. Click **"Create user"**

### **Opción 2: Crear Usuario con Rol**

Después de crear el usuario:

1. Ve a **SQL Editor** en Supabase Dashboard
2. Ejecuta este SQL (reemplaza `USER_ID` y `USER_EMAIL`):

```sql
-- Crear usuario de prueba para foreman (jefe de obra)
-- Primero necesitas el user_id del usuario que acabas de crear
-- Puedes obtenerlo de: Authentication → Users → Click en el usuario → Copia el UUID

-- Insertar rol en la tabla user_roles
INSERT INTO user_roles (user_id, role, created_at)
VALUES (
  'USER_ID_AQUI',  -- Reemplaza con el UUID del usuario
  'foreman',       -- o 'admin', 'user'
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

### **Opción 3: Crear Tabla user_roles si no existe**

Si la tabla `user_roles` no existe en producción, ejecuta esto primero:

```sql
-- Crear tabla user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio rol
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Solo admins pueden insertar/actualizar roles
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🧪 Usuarios de Prueba Recomendados

Crea estos usuarios en producción para testing:

### **1. Foreman (Jefe de Obra)**
```
Email: foreman@vistral.com
Password: [genera una segura]
Rol: foreman
```

### **2. Admin**
```
Email: admin@vistral.com
Password: [genera una segura]
Rol: admin
```

### **3. User Normal**
```
Email: user@vistral.com
Password: [genera una segura]
Rol: user
```

---

## 📋 Pasos Completos

1. ✅ Crear usuario en Supabase Dashboard → Authentication → Users
2. ✅ Copiar el `user_id` (UUID) del usuario creado
3. ✅ Ejecutar SQL para asignar rol:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('USER_ID_AQUI', 'foreman');
   ```
4. ✅ Probar login con email y password

---

## 🔐 Seguridad

- ⚠️ **Nunca** uses contraseñas débiles en producción
- ✅ Usa contraseñas seguras (mínimo 12 caracteres, mayúsculas, números, símbolos)
- ✅ Considera usar un gestor de contraseñas para guardarlas
- ✅ En producción real, implementa verificación de email

---

## 🆘 Troubleshooting

### **"Table user_roles does not exist"**
→ Ejecuta primero el SQL de creación de tabla (Opción 3)

### **"User not found"**
→ Verifica que el usuario existe en Authentication → Users

### **"Permission denied"**
→ Verifica que las políticas RLS están configuradas correctamente

### **"Login funciona pero no tiene permisos"**
→ Verifica que el rol está asignado en la tabla `user_roles`

---

¿Necesitas ayuda creando usuarios específicos? Avísame y te guío paso a paso.

