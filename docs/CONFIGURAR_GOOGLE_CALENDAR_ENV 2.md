# 🔐 Configurar Variables de Entorno para Google Calendar

## 📋 Paso a Paso

### **Paso 1: Obtener Credenciales de Google Cloud**

Si aún no tienes las credenciales, sigue estos pasos:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Library**
4. Busca "Google Calendar API" y habilítala
5. Ve a **APIs & Services** → **Credentials**
6. Click en **Create Credentials** → **OAuth client ID**
7. Configura el OAuth consent screen si es necesario
8. Crea un OAuth Client ID tipo "Web application"
9. Agrega estos **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/google/callback
   https://dev.vistral.io/auth/google/callback
   ```
10. Copia el **Client ID** y **Client Secret**

---

### **Paso 2: Agregar Variables de Entorno**

Abre tu archivo `.env.local` (o créalo si no existe) y agrega:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Reemplaza:**
- `tu-client-id.apps.googleusercontent.com` con tu Client ID real
- `tu-client-secret` con tu Client Secret real

---

### **Paso 3: Para Producción**

Si vas a desplegar en producción, también agrega estas variables en Vercel:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. Ve a **Settings** → **Environment Variables**
3. Agrega las mismas variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (con tu dominio de producción)

---

### **Paso 4: Reiniciar el Servidor**

Después de agregar las variables, reinicia tu servidor de desarrollo:

```bash
# Detén el servidor actual (Ctrl+C)
# Luego inícialo de nuevo
npm run dev
```

---

## ✅ Verificación

Para verificar que las variables están configuradas correctamente:

1. Inicia sesión como admin o foreman
2. Busca el componente de Google Calendar en la UI
3. Click en "Conectar Google Calendar"
4. Deberías ser redirigido a Google para autorizar

---

## 🚨 Troubleshooting

### Error: "Google Calendar credentials not configured"
- Verifica que las variables estén en `.env.local`
- Reinicia el servidor después de agregar variables
- Verifica que no haya espacios extra en los valores

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `GOOGLE_REDIRECT_URI` coincida exactamente con una de las URLs autorizadas en Google Cloud Console
- Las URLs son case-sensitive

