# 🔧 Solucionar Error: redirect_uri_mismatch

## ⚠️ Problema

Error: `Error 400: redirect_uri_mismatch`

Esto significa que el redirect URI que está usando tu aplicación no coincide exactamente con el que está registrado en Google Cloud Console.

---

## ✅ Solución Paso a Paso

### **Paso 1: Verificar qué Redirect URI se está usando**

El código construye el redirect URI en este orden:
1. `GOOGLE_REDIRECT_URI` (si está configurado)
2. `NEXT_PUBLIC_APP_URL/api/google-calendar/callback` (si está configurado)
3. `https://${NEXT_PUBLIC_VERCEL_URL}/api/google-calendar/callback` (si está configurado)
4. `http://localhost:3000/api/google-calendar/callback` (por defecto)

**Para verificar qué se está usando en Vercel:**

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Deployments** → Selecciona el último deployment
3. Ve a **Functions** → Busca `/api/google-calendar/connect`
4. Revisa los logs para ver qué redirect URI se está enviando

O mejor aún, agrega un log temporal para ver qué se está usando.

---

### **Paso 2: Verificar Variables de Entorno en Vercel**

1. Ve a **Settings** → **Environment Variables**
2. Verifica que tengas configurado:

   ```
   GOOGLE_REDIRECT_URI=https://dev.vistral.io/api/google-calendar/callback
   ```

   **⚠️ IMPORTANTE:**
   - Debe ser exactamente: `https://dev.vistral.io/api/google-calendar/callback`
   - Sin espacios al inicio o final
   - Sin barra `/` al final
   - Con `https://` (no `http://`)

3. Verifica que esté configurado para el entorno correcto:
   - Si `dev.vistral.io` es Production → debe estar en **Production**
   - Si `dev.vistral.io` es Preview → debe estar en **Preview**

---

### **Paso 3: Verificar Redirect URI en Google Cloud Console**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Abre tu **OAuth 2.0 Client ID** (tipo "Web application")
4. En **"Authorized redirect URIs"**, verifica que tengas exactamente:

   ```
   https://dev.vistral.io/api/google-calendar/callback
   ```

   **⚠️ DEBE SER EXACTAMENTE IGUAL:**
   - `https://dev.vistral.io/api/google-calendar/callback` ✅
   - `https://dev.vistral.io/api/google-calendar/callback/` ❌ (tiene barra al final)
   - `http://dev.vistral.io/api/google-calendar/callback` ❌ (usa http en lugar de https)
   - `https://Dev.Vistral.IO/api/google-calendar/callback` ❌ (mayúsculas)

5. Si no está exactamente igual, edítalo o agrégalo correctamente
6. Haz clic en **SAVE**

---

### **Paso 4: Redesplegar en Vercel**

**MUY IMPORTANTE:** Después de cambiar variables de entorno, debes redesplegar:

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. O haz un push a tu repositorio para que se redesplegue automáticamente

---

### **Paso 5: Verificar que coincidan exactamente**

El redirect URI debe ser **EXACTAMENTE** el mismo en ambos lugares:

**En Google Cloud Console:**
```
https://dev.vistral.io/api/google-calendar/callback
```

**En Vercel (GOOGLE_REDIRECT_URI):**
```
https://dev.vistral.io/api/google-calendar/callback
```

**Deben ser idénticos, carácter por carácter.**

---

## 🐛 Troubleshooting Adicional

### **Si sigue sin funcionar:**

1. **Espera 1-5 minutos** después de guardar en Google Cloud Console (puede tardar en propagarse)

2. **Verifica que no haya espacios extra:**
   - Copia y pega el redirect URI directamente en lugar de escribirlo
   - No debe haber espacios al inicio o final

3. **Verifica el entorno correcto:**
   - Si `dev.vistral.io` está configurado como dominio de Production en Vercel
   - La variable `GOOGLE_REDIRECT_URI` debe estar configurada para **Production**
   - Si está en Preview, debe estar configurada para **Preview**

4. **Verifica que el Client ID sea correcto:**
   - Asegúrate de estar usando el Client ID del cliente tipo "Web application"
   - No uses el Client ID de un cliente tipo "Desktop"

5. **Revisa los logs de Vercel:**
   - Ve a **Deployments** → Selecciona el deployment → **Functions**
   - Busca errores relacionados con Google Calendar
   - Verifica qué redirect URI se está enviando realmente

---

## ✅ Checklist Final

- [ ] Variable `GOOGLE_REDIRECT_URI` configurada en Vercel: `https://dev.vistral.io/api/google-calendar/callback`
- [ ] Variable configurada para el entorno correcto (Production/Preview)
- [ ] Redirect URI agregado en Google Cloud Console: `https://dev.vistral.io/api/google-calendar/callback`
- [ ] Ambos redirect URIs son exactamente iguales (carácter por carácter)
- [ ] Deployment redesplegado después de cambiar variables
- [ ] Esperado 1-5 minutos después de guardar en Google Cloud Console

---

## 📝 Nota Importante

Si después de seguir todos estos pasos sigue sin funcionar, puede ser que Vercel esté usando una URL diferente. En ese caso, puedes:

1. Agregar también `NEXT_PUBLIC_APP_URL` en Vercel:
   ```
   NEXT_PUBLIC_APP_URL=https://dev.vistral.io
   ```

2. O verificar qué URL está usando realmente Vercel y agregarla también en Google Cloud Console.

