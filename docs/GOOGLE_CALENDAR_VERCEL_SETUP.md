# 🔧 Configurar Google Calendar para dev.vistral.io en Vercel

## 📋 Configuración Requerida

Tu dominio es: **`dev.vistral.io`**

---

## ✅ Paso 1: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega o actualiza estas variables:

   **Para Production:**
   ```
   Key: GOOGLE_REDIRECT_URI
   Value: https://dev.vistral.io/api/google-calendar/callback
   ```

   **Para Preview/Development (opcional):**
   ```
   Key: GOOGLE_REDIRECT_URI
   Value: http://localhost:3000/api/google-calendar/callback
   ```

5. También asegúrate de tener configuradas:
   ```
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   ```

6. Haz clic en **Save**

---

## ✅ Paso 2: Agregar Redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Busca tu **OAuth 2.0 Client ID** (tipo "Web application")
5. Haz clic en el nombre del Client ID para editarlo
6. En la sección **"Authorized redirect URIs"**, haz clic en **"ADD URI"**
7. Agrega estos redirect URIs (uno por uno):

   ```
   http://localhost:3000/api/google-calendar/callback
   https://dev.vistral.io/api/google-calendar/callback
   ```

   **⚠️ IMPORTANTE:**
   - Debe ser exactamente: `https://dev.vistral.io/api/google-calendar/callback`
   - Con `https://` (no `http://`)
   - Sin barra `/` al final
   - Case-sensitive (minúsculas)

8. Haz clic en **SAVE** al final de la página

---

## ✅ Paso 3: Verificar Configuración

### En Google Cloud Console:
- ✅ Redirect URI agregado: `https://dev.vistral.io/api/google-calendar/callback`
- ✅ Redirect URI agregado: `http://localhost:3000/api/google-calendar/callback`

### En Vercel:
- ✅ Variable `GOOGLE_REDIRECT_URI` = `https://dev.vistral.io/api/google-calendar/callback`
- ✅ Variable `GOOGLE_CLIENT_ID` configurada
- ✅ Variable `GOOGLE_CLIENT_SECRET` configurada

---

## ✅ Paso 4: Redesplegar en Vercel

Después de agregar las variables de entorno:

1. Ve a **Deployments** en Vercel
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. O simplemente haz un push a tu repositorio

---

## ✅ Paso 5: Probar la Conexión

1. Ve a `https://dev.vistral.io`
2. Inicia sesión
3. Intenta conectar Google Calendar
4. Deberías ser redirigido a Google para autorizar
5. Después de autorizar, deberías volver a `https://dev.vistral.io`

---

## 🐛 Troubleshooting

**Si sigue apareciendo el error:**

1. **Verifica que el redirect URI sea exacto:**
   - En Google Cloud Console debe ser: `https://dev.vistral.io/api/google-calendar/callback`
   - En Vercel debe ser: `https://dev.vistral.io/api/google-calendar/callback`
   - Deben coincidir exactamente (sin espacios, sin barras al final)

2. **Espera unos minutos:**
   - Los cambios en Google Cloud Console pueden tardar 1-5 minutos en propagarse

3. **Verifica las variables de entorno:**
   - Asegúrate de que estén configuradas para el entorno correcto (Production)
   - Verifica que no haya espacios extra al inicio o final

4. **Revisa los logs de Vercel:**
   - Ve a **Deployments** → Selecciona el deployment → **Functions** → Busca errores relacionados con Google Calendar

5. **Verifica el Client ID y Secret:**
   - Asegúrate de que sean del cliente tipo "Web application", no "Desktop"

---

## 📝 Resumen de URLs Configuradas

```
✅ Local: http://localhost:3000/api/google-calendar/callback
✅ Producción: https://dev.vistral.io/api/google-calendar/callback
```

Ambas deben estar registradas en Google Cloud Console y la de producción debe estar en Vercel.

