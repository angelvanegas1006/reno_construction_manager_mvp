# 🔧 Solución: Error "Invalid login credentials"

## 🔍 Diagnóstico

El error "Invalid login credentials" significa que:
- ❌ El usuario no existe en el proyecto Supabase que estás usando
- ❌ O la contraseña es incorrecta

## ✅ Solución Paso a Paso

### **Paso 1: Verificar qué Proyecto Estás Usando**

Revisa tu `.env.local`:
```bash
cat .env.local | grep SUPABASE_URL
```

Deberías ver algo como:
```
NEXT_PUBLIC_SUPABASE_URL=https://kqqobbxjyrdputngvxrf.supabase.co
```

Este es tu proyecto de **desarrollo**.

---

### **Paso 2: Crear Usuario en el Proyecto Correcto**

#### **Opción A: Desde Supabase Dashboard (Más Fácil)**

1. Ve a tu proyecto Supabase:
   ```
   https://app.supabase.com/project/kqqobbxjyrdputngvxrf
   ```

2. Menú lateral → **Authentication** → **Users**

3. Click en **"Add user"** → **"Create new user"**

4. Completa el formulario:
   ```
   Email: test@vistral.com
   Password: Test123456!@#
   Auto Confirm User: ✅ (Marca esta casilla)
   ```

5. Click **"Create user"**

6. **¡Listo!** Ahora puedes hacer login con:
   - Email: `test@vistral.com`
   - Password: `Test123456!@#`

#### **Opción B: Desde SQL (Si prefieres)**

1. Ve a SQL Editor en Supabase Dashboard

2. Ejecuta este SQL para crear un usuario:
   ```sql
   -- Crear usuario de prueba
   INSERT INTO auth.users (
     instance_id,
     id,
     aud,
     role,
     email,
     encrypted_password,
     email_confirmed_at,
     created_at,
     updated_at,
     confirmation_token,
     email_change,
     email_change_token_new,
     recovery_token
   )
   VALUES (
     '00000000-0000-0000-0000-000000000000',
     gen_random_uuid(),
     'authenticated',
     'authenticated',
     'test@vistral.com',
     crypt('Test123456!@#', gen_salt('bf')), -- Password hasheada
     NOW(),
     NOW(),
     NOW(),
     '',
     '',
     '',
     ''
   );
   ```

   ⚠️ **Nota**: Este método es más complejo. Mejor usa la Opción A.

---

### **Paso 3: Asignar Rol al Usuario**

Después de crear el usuario:

1. Ve a **Authentication** → **Users**
2. Click en el usuario que acabas de crear
3. **Copia el UUID** (user_id) - algo como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

4. Ve a **SQL Editor** y ejecuta:
   ```sql
   -- Reemplaza USER_ID_AQUI con el UUID que copiaste
   INSERT INTO user_roles (user_id, role)
   VALUES ('USER_ID_AQUI', 'foreman')
   ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
   ```

---

### **Paso 4: Verificar que la Tabla user_roles Existe**

Si obtienes un error "table user_roles does not exist":

1. Ve a **SQL Editor**
2. Ejecuta el contenido de: `supabase/migrations/002_user_roles.sql`
3. Luego repite el Paso 3

---

### **Paso 5: Probar Login**

1. Reinicia tu servidor de desarrollo:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

2. Ve a: `http://localhost:3000/app/login`

3. Ingresa:
   - Email: `test@vistral.com`
   - Password: `Test123456!@#`

4. Click en "Iniciar sesión"

---

## 🧪 Usuarios de Prueba Recomendados

Crea estos usuarios para testing:

### **1. Foreman (Jefe de Obra)**
```
Email: foreman@vistral.com
Password: Foreman123!@#
Rol: foreman
```

### **2. Admin**
```
Email: admin@vistral.com
Password: Admin123!@#
Rol: admin
```

---

## 🐛 Troubleshooting

### **"Invalid login credentials" después de crear usuario**
- ✅ Verifica que marcaste "Auto Confirm User"
- ✅ Verifica que el email y password son correctos
- ✅ Verifica que estás usando el proyecto correcto (dev vs prod)

### **"Table user_roles does not exist"**
- ✅ Ejecuta `supabase/migrations/002_user_roles.sql`

### **"No tienes permisos para acceder"**
- ✅ Verifica que asignaste el rol correctamente
- ✅ Verifica que el rol es 'foreman' o 'admin' (no 'user')

### **"User not found"**
- ✅ Verifica que el usuario existe en Authentication → Users
- ✅ Verifica que estás usando el proyecto Supabase correcto

---

## ✅ Checklist

- [ ] Usuario creado en Supabase Dashboard → Authentication → Users
- [ ] "Auto Confirm User" marcado al crear usuario
- [ ] Tabla `user_roles` existe (ejecutar migración si no)
- [ ] Rol asignado al usuario (INSERT INTO user_roles)
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Login probado con email y password correctos

---

¿Necesitas ayuda con algún paso específico? Avísame y te guío.

