# 🔐 Solución: Invalid Login Credentials

## 🔍 Problema

Error: "Invalid login credentials"

Esto significa que:
- El usuario no existe en el proyecto de Supabase actual
- Las credenciales (email/password) son incorrectas
- Estás intentando usar un usuario de producción en desarrollo (o viceversa)

---

## ✅ Solución Paso a Paso

### **Paso 1: Verificar Proyecto Correcto**

Verifica que estás usando el proyecto de **desarrollo**:

1. **Revisa tu `.env.local`:**
   ```bash
   cat .env.local | grep SUPABASE_URL
   ```
   
   Debería mostrar:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://kqqobbxjyrdputngvxrf.supabase.co
   ```

2. **Si muestra otra URL**, estás usando el proyecto incorrecto:
   - Producción: `https://fxmobdtjazijugpzkadn.supabase.co`
   - Desarrollo: `https://kqqobbxjyrdputngvxrf.supabase.co`

---

### **Paso 2: Verificar Usuario en Desarrollo**

1. **Ve a Supabase Dashboard:**
   - Asegúrate de estar en el proyecto **vistral-dev**
   - URL debería ser: `https://app.supabase.com/project/kqqobbxjyrdputngvxrf`

2. **Ve a Authentication → Users:**
   - Verifica que tu usuario existe
   - Si no existe, créalo (ver Paso 3)

---

### **Paso 3: Crear Usuario en Desarrollo**

Si el usuario no existe en desarrollo:

1. **Ve a Authentication → Users**
2. **Click en "Add user" → "Create new user"**
3. **Completa:**
   - **Email**: `dev@vistral.com` (o el que prefieras)
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Marca esta casilla
4. **Click "Create user"**

---

### **Paso 4: Asignar Rol al Usuario**

Después de crear el usuario:

1. **Copia el UUID del usuario** (de Authentication → Users)
2. **Ve a SQL Editor**
3. **Ejecuta:**

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('TU_USER_ID_AQUI', 'foreman');
```

---

### **Paso 5: Probar Login**

1. **Recarga la página de login**
2. **Usa las credenciales del usuario que creaste en desarrollo**
3. **Deberías poder iniciar sesión**

---

## 🔄 Si Estás Usando Usuario de Producción

Si quieres usar un usuario que existe en **producción** pero no en desarrollo:

### **Opción A: Crear el mismo usuario en desarrollo**

1. Crea el usuario con el mismo email en desarrollo
2. Usa la misma contraseña (o una diferente)
3. Asigna el rol correspondiente

### **Opción B: Cambiar temporalmente a producción**

Si necesitas probar con usuarios de producción:

1. **Haz backup de `.env.local`:**
   ```bash
   cp .env.local .env.local.dev.backup
   ```

2. **Edita `.env.local`** con credenciales de producción:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://fxmobdtjazijugpzkadn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[producción anon key]
   ```

3. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

---

## 🆘 Checklist de Diagnóstico

- [ ] ¿Estás en el proyecto correcto de Supabase? (vistral-dev)
- [ ] ¿El usuario existe en Authentication → Users?
- [ ] ¿La contraseña es correcta?
- [ ] ¿El usuario tiene rol asignado en `user_roles`?
- [ ] ¿Las políticas RLS están configuradas correctamente?

---

## 📋 Usuarios Recomendados para Desarrollo

Crea estos usuarios en tu proyecto de desarrollo:

### **1. Foreman (Jefe de Obra)**
```
Email: dev@vistral.com
Password: DevPass2025!Secure
Rol: foreman
```

### **2. Admin**
```
Email: admin@vistral.com
Password: AdminPass2025!Secure
Rol: admin
```

---

## ✅ Después de Crear Usuario

1. ✅ Usuario creado en Authentication → Users
2. ✅ Rol asignado en `user_roles`
3. ✅ Políticas RLS ejecutadas
4. ✅ Login probado exitosamente

---

¿Necesitas ayuda creando el usuario o verificando las credenciales?

