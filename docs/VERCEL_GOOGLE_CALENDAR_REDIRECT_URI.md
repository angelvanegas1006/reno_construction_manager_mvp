# 🔧 Configurar Google Calendar Redirect URI en Vercel

## ⚠️ Problema

Cuando intentas conectar Google Calendar desde Vercel, aparece este error:
```
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
If you're the app developer, register the redirect URI in the Google Cloud Console.
Request details: redirect_uri=https://tu-dominio.com/api/google-calendar/callback
```

## ✅ Solución Paso a Paso

### **Paso 1: Identificar tu Dominio de Vercel**

Tienes dos opciones:

**Opción A: Dominio de Vercel (automático)**
- Tu dominio será algo como: `https://tu-proyecto.vercel.app`
- O si tienes un dominio personalizado: `https://tu-dominio.com`

**Opción B: Verificar en Vercel Dashboard**
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Domains**
4. Copia el dominio principal (el que aparece primero)

---

### **Paso 2: Configurar Variable de Entorno en Vercel**

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Ve a **Settings** → **Environment Variables**
3. Agrega o actualiza estas variables:

   **Para Producción:**
   ```
   Key: GOOGLE_REDIRECT_URI
   Value: https://tu-dominio-real.com/api/google-calendar/callback
   ```
   
   **Ejemplo si tu dominio es `vistral-mvp.vercel.app`:**
   ```
   Key: GOOGLE_REDIRECT_URI
   Value: https://vistral-mvp.vercel.app/api/google-calendar/callback
   ```

   **Si tienes múltiples entornos (Production, Preview, Development):**
   - Agrega la variable para cada entorno con el dominio correspondiente
   - Production: `https://tu-dominio.com/api/google-calendar/callback`
   - Preview: `https://tu-proyecto-git-branch.vercel.app/api/google-calendar/callback`
   - Development: `http://localhost:3000/api/google-calendar/callback`

4. Haz clic en **Save**

---

### **Paso 3: Agregar Redirect URI en Google Cloud Console**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Busca tu **OAuth 2.0 Client ID** (tipo "Web application")
5. Haz clic en el nombre del Client ID para editarlo
6. En la sección **"Authorized redirect URIs"**, haz clic en **"ADD URI"**
7. Agrega **TODOS** estos redirect URIs (uno por uno):

   ```
   http://localhost:3000/api/google-calendar/callback
   https://tu-dominio-real.com/api/google-calendar/callback
   ```

   **Ejemplo si tu dominio es `vistral-mvp.vercel.app`:**
   ```
   http://localhost:3000/api/google-calendar/callback
   https://vistral-mvp.vercel.app/api/google-calendar/callback
   ```

   **Si tienes un dominio personalizado:**
   ```
   http://localhost:3000/api/google-calendar/callback
   https://dev.vistral.io/api/google-calendar/callback
   https://app.vistral.io/api/google-calendar/callback
   ```

8. Haz clic en **SAVE** al final de la página

---

### **Paso 4: Verificar Variables de Entorno en Vercel**

Asegúrate de que también tengas configuradas estas variables:

```
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio-real.com/api/google-calendar/callback
```

---

### **Paso 5: Redesplegar en Vercel**

Después de agregar las variables de entorno:

1. Ve a **Deployments** en Vercel
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. O simplemente haz un push a tu repositorio para que se redesplegue automáticamente

---

### **Paso 6: Probar la Conexión**

1. Ve a tu aplicación en Vercel
2. Inicia sesión
3. Intenta conectar Google Calendar
4. Deberías ser redirigido a Google para autorizar
5. Después de autorizar, deberías volver a tu aplicación

---

## 🔍 Verificación

Para verificar que todo está configurado correctamente:

1. **En Google Cloud Console:**
   - Verifica que el redirect URI esté exactamente como: `https://tu-dominio.com/api/google-calendar/callback`
   - Sin barra `/` al final
   - Con `https://` (no `http://` para producción)

2. **En Vercel:**
   - Verifica que `GOOGLE_REDIRECT_URI` tenga el mismo valor que en Google Cloud Console
   - Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados

3. **En el código:**
   - El código usa: `process.env.GOOGLE_REDIRECT_URI || ${baseUrl}/api/google-calendar/callback`
   - Si `GOOGLE_REDIRECT_URI` está configurado, lo usará
   - Si no, construirá la URL desde `NEXT_PUBLIC_APP_URL` o `VERCEL_URL`

---

## ⚠️ Notas Importantes

- **Las URLs son case-sensitive** (sensibles a mayúsculas/minúsculas)
- **Deben coincidir exactamente** entre Google Cloud Console y Vercel
- **No deben terminar con `/`** al final
- **Para producción usa `https://`**, nunca `http://`
- **Después de cambiar variables en Vercel, necesitas redesplegar**

---

## 🐛 Troubleshooting

**Si sigue sin funcionar:**

1. Verifica que el redirect URI en Google Cloud Console sea exactamente igual al que aparece en el error
2. Verifica que las variables de entorno estén configuradas para el entorno correcto (Production/Preview/Development)
3. Espera unos minutos después de guardar en Google Cloud Console (puede tardar en propagarse)
4. Verifica que el Client ID y Client Secret sean correctos
5. Revisa los logs de Vercel para ver qué redirect URI se está usando realmente

