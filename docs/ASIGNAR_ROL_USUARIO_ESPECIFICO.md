# 👤 Asignar Rol a Usuario Específico

## 🎯 Usuario: `3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9`

### **Paso 1: Ejecutar en Supabase SQL Editor**

Copia y pega este SQL en Supabase Dashboard → SQL Editor:

```sql
-- Asignar rol 'foreman' al usuario
INSERT INTO user_roles (user_id, role) 
VALUES ('3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9', 'foreman');

-- Verificar que se asignó correctamente
SELECT * FROM user_roles WHERE user_id = '3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9';
```

### **Paso 2: Ejecutar**

1. Pega el SQL en SQL Editor
2. Presiona `Cmd+Enter` (Mac) o `Ctrl+Enter` (Windows)
3. Deberías ver:
   - Primera query: "Success. 1 row inserted"
   - Segunda query: Una fila con los datos del rol asignado

---

## 🔄 Si Quieres Cambiar el Rol

Si el usuario ya tiene un rol y quieres cambiarlo:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9';
```

O si quieres usar otro rol desde el inicio:

```sql
-- Para admin
INSERT INTO user_roles (user_id, role) 
VALUES ('3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9', 'admin');

-- Para user
INSERT INTO user_roles (user_id, role) 
VALUES ('3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9', 'user');
```

---

## ✅ Después de Ejecutar

1. **Recarga la página de login** en tu navegador
2. **Inicia sesión** con tu usuario
3. **Deberías poder acceder** sin el error "Error fetching user role"
4. **Si el rol es 'foreman'**, serás redirigido a `/reno/construction-manager/kanban`

---

## 🎭 Roles Disponibles

- **`foreman`**: Jefe de obra (acceso a Reno Construction Manager) ✅ Recomendado para desarrollo
- **`admin`**: Administrador (acceso completo)
- **`user`**: Usuario básico (acceso limitado)

---

## 🆘 Si Hay Errores

**"duplicate key value violates unique constraint"**
→ El usuario ya tiene un rol. Usa `UPDATE` en lugar de `INSERT`:

```sql
UPDATE user_roles 
SET role = 'foreman' 
WHERE user_id = '3fd7307f-5c42-4a73-85b8-f9d5a0ebf7f9';
```

**"violates foreign key constraint"**
→ El user_id no existe en auth.users. Verifica que el UUID sea correcto en Authentication → Users.

---

¡Listo! El SQL ya está copiado en tu portapapeles. Solo pégalo en Supabase SQL Editor y ejecuta.

