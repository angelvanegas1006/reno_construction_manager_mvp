# 🔍 Diagnóstico: Usuario Existe pero No Puede Hacer Login

## 🔎 Posibles Causas

Si el usuario ya existe pero recibes "Invalid login credentials", puede ser:

1. **Usuario en proyecto diferente** (dev vs prod)
2. **Usuario no confirmado** (necesita verificar email)
3. **Contraseña incorrecta**
4. **Proyecto Supabase incorrecto** en `.env.local`

---

## ✅ Verificación Paso a Paso

### **Paso 1: Verificar en qué Proyecto Existe el Usuario**

#### **A. Verificar Proyecto Actual (Development)**
1. Ve a: `https://app.supabase.com/project/kqqobbxjyrdputngvxrf`
2. Authentication → Users
3. Busca el email del usuario
4. ¿Existe? → Continúa al Paso 2
5. ¿No existe? → El usuario está en otro proyecto (producción)

#### **B. Verificar Proyecto de Producción**
Si el usuario está en producción (proyecto de Manu):
- URL: `https://fxmobdtjazijugpzkadn.supabase.co`
- Ve a ese proyecto y verifica si el usuario existe ahí

---

### **Paso 2: Verificar Estado del Usuario**

En Supabase Dashboard → Authentication → Users → Click en el usuario:

Verifica:
- ✅ **Email Confirmed**: Debe estar en `true` o tener fecha
- ✅ **User ID**: Copia este UUID (lo necesitarás)
- ✅ **Created At**: Fecha de creación

Si **Email Confirmed** está vacío o es `false`:
- El usuario necesita confirmar su email
- O marca "Auto Confirm User" si lo creaste manualmente

---

### **Paso 3: Resetear Contraseña (Si es necesario)**

Si la contraseña es incorrecta o no la recuerdas:

1. Ve a Authentication → Users
2. Click en el usuario
3. Click en **"Reset Password"** o **"Send Password Reset Email"**
4. El usuario recibirá un email para resetear la contraseña

**O manualmente:**

1. Click en el usuario → **"Reset Password"**
2. Ingresa nueva contraseña
3. Guarda

---

### **Paso 4: Verificar Configuración de .env.local**

Verifica que estás usando el proyecto correcto:

```bash
cat .env.local | grep SUPABASE_URL
```

Deberías ver:
- **Development**: `https://kqqobbxjyrdputngvxrf.supabase.co`
- **Production**: `https://fxmobdtjazijugpzkadn.supabase.co`

**Si el usuario está en producción pero `.env.local` apunta a dev:**
- Cambia `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` al proyecto correcto
- O crea el usuario en el proyecto de desarrollo

---

### **Paso 5: Verificar Rol del Usuario**

1. Ve a SQL Editor en Supabase Dashboard
2. Ejecuta:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'USER_ID_AQUI';
   ```
   (Reemplaza `USER_ID_AQUI` con el UUID del usuario)

3. Si no hay resultados:
   - El usuario no tiene rol asignado
   - Ejecuta: `INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'foreman');`

---

## 🎯 Solución Rápida

### **Opción A: Usar el Proyecto Correcto**

Si el usuario está en producción pero quieres usar dev:

1. Cambia `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://fxmobdtjazijugpzkadn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-de-produccion]
   ```

2. Reinicia el servidor: `npm run dev`

### **Opción B: Crear Usuario en Desarrollo**

Si quieres usar desarrollo:

1. Crea el mismo usuario en el proyecto de desarrollo
2. Usa la misma contraseña
3. Asigna el rol

### **Opción C: Resetear Contraseña**

1. Ve a Authentication → Users
2. Click en el usuario → Reset Password
3. Ingresa nueva contraseña
4. Prueba login con la nueva contraseña

---

## 🐛 Debugging

### **Ver Logs en Consola del Navegador**

1. Abre DevTools (F12)
2. Ve a Console
3. Intenta hacer login
4. Revisa los errores que aparecen

### **Verificar Request en Network**

1. DevTools → Network
2. Intenta hacer login
3. Busca la request a `/auth/v1/token`
4. Revisa la respuesta del servidor

---

## ✅ Checklist de Diagnóstico

- [ ] ¿En qué proyecto Supabase existe el usuario? (dev/prod)
- [ ] ¿El proyecto en `.env.local` coincide con donde está el usuario?
- [ ] ¿El usuario está confirmado? (Email Confirmed = true)
- [ ] ¿La contraseña es correcta?
- [ ] ¿El usuario tiene rol asignado en `user_roles`?
- [ ] ¿Reiniciaste el servidor después de cambiar `.env.local`?

---

¿En qué proyecto Supabase existe el usuario? ¿Development o Production?

