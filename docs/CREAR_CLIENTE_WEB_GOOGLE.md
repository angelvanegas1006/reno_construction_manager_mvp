# 🌐 Crear Cliente OAuth 2.0 Web para Google Calendar

## ⚠️ Problema Actual

El cliente que tienes es de tipo **"Desktop"**, pero necesitas uno de tipo **"Web application"** para poder agregar redirect URIs.

## ✅ Solución: Crear Nuevo Cliente Web

### **Paso 1: Crear Nuevo Cliente**

1. En la página de **"Clients"** (donde estás ahora), haz clic en el botón **"+ Create client"** (Crear cliente) que está arriba a la izquierda

### **Paso 2: Configurar el Cliente**

1. **Application type** (Tipo de aplicación): Selecciona **"Web application"** (Aplicación web)
2. **Name** (Nombre): Pon un nombre descriptivo, por ejemplo: `Vistral Web Client` o `Vistral Calendar Web`
3. Haz clic en **"Create"** (Crear)

### **Paso 3: Agregar Redirect URIs**

Después de crear el cliente, se abrirá la página de detalles. Ahí verás:

1. **Authorized JavaScript origins** (Orígenes JavaScript autorizados):
   - Agrega: `http://localhost:3000`
   - Si usas producción: `https://dev.vistral.io`

2. **Authorized redirect URIs** (URIs de redirección autorizados) ← **ESTA ES LA IMPORTANTE**:
   - Haz clic en **"ADD URI"** o el botón **"+"**
   - Agrega esta URL:
     ```
     http://localhost:3000/api/google-calendar/callback
     ```
   - Si también usas producción, agrega:
     ```
     https://dev.vistral.io/api/google-calendar/callback
     ```

3. Haz clic en **"SAVE"** (Guardar) al final de la página

### **Paso 4: Copiar las Nuevas Credenciales**

Después de guardar, verás:
- **Client ID**: Copia este nuevo Client ID
- **Client secret**: Copia este nuevo Client Secret

### **Paso 5: Actualizar `.env.local`**

Actualiza tu archivo `.env.local` con las nuevas credenciales del cliente **Web application**:

```env
GOOGLE_CLIENT_ID=tu-nuevo-client-id-web.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-nuevo-client-secret-web
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
```

---

## 📸 Ubicación Visual

```
Google Cloud Console
├── Google Auth Platform
    └── Clients
        └── [+ Create client] ← Haz clic aquí
            └── Application type: Web application ← Selecciona esto
                └── Name: Vistral Web Client
                    └── Authorized redirect URIs ← Agrega las URLs aquí
```

---

## ⚠️ Importante

- **NO uses** el cliente de tipo "Desktop" para Google Calendar
- **SÍ usa** el nuevo cliente de tipo "Web application"
- El cliente "Desktop" puedes eliminarlo o dejarlo para otro uso futuro

---

## ✅ Verificación

Después de crear el cliente web y actualizar `.env.local`:

1. Reinicia tu servidor: `npm run dev`
2. Inicia sesión en la aplicación
3. Deberías ver el componente "Google Calendar"
4. Haz clic en "Conectar Google Calendar" y debería funcionar

