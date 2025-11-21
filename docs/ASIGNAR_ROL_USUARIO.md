# 👤 Asignar Rol a Usuario en Desarrollo

## 🎯 Paso a Paso

### **Paso 1: Obtener el User ID**

1. **Ve a Supabase Dashboard:**
   - Click en **"Authentication"** (menú lateral izquierdo)
   - Click en **"Users"**

2. **Encuentra tu usuario:**
   - Busca el usuario que creaste (ej: `dev@vistral.com`)
   - Click en el usuario para ver sus detalles

3. **Copia el UUID:**
   - El **UUID** es el `id` del usuario
   - Ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Copia este valor completo

---

### **Paso 2: Asignar Rol en SQL Editor**

1. **Ve a SQL Editor:**
   - Click en **"SQL Editor"** (menú lateral)
   - Click en **"New query"**

2. **Ejecuta este SQL:**
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('TU_USER_ID_AQUI', 'foreman');
   ```
   
   **Reemplaza `TU_USER_ID_AQUI` con el UUID que copiaste**

3. **Ejecuta con `Cmd+Enter`**

---

### **Paso 3: Verificar que se asignó**

Ejecuta esta query para verificar:

```sql
SELECT * FROM user_roles WHERE user_id = 'TU_USER_ID_AQUI';
```

Deberías ver una fila con:
- `id`: UUID generado
- `user_id`: Tu UUID de usuario
- `role`: `foreman` (o el que asignaste)
- `created_at`: Fecha actual

---

## 🎭 Roles Disponibles

- **`foreman`**: Jefe de obra (acceso a Reno Construction Manager)
- **`admin`**: Administrador (acceso completo)
- **`user`**: Usuario básico (acceso limitado)

---

## 🔄 Cambiar Rol de un Usuario

Si necesitas cambiar el rol de un usuario existente:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'TU_USER_ID_AQUI';
```

---

## ✅ Checklist

- [ ] Usuario creado en Authentication → Users
- [ ] UUID del usuario copiado
- [ ] Rol asignado ejecutando INSERT INTO user_roles
- [ ] Rol verificado con SELECT query
- [ ] Login probado en la aplicación

---

## 🆘 Problemas Comunes

**"duplicate key value violates unique constraint"**
→ El usuario ya tiene un rol asignado. Usa `UPDATE` en lugar de `INSERT`.

**"violates foreign key constraint"**
→ El `user_id` no existe en `auth.users`. Verifica que el UUID sea correcto.

**"new row violates row-level security policy"**
→ Si usas el cliente anónimo, necesitas usar el service_role key o ejecutar desde el dashboard.

---

## 🎉 ¡Listo!

Después de asignar el rol, recarga la página de login y deberías poder iniciar sesión sin errores.

