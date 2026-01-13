# 🔐 Guía de Configuración: Google Calendar Integration

## 📋 Resumen

Esta guía te ayudará a configurar la integración de Google Calendar con Vistral para sincronizar eventos de propiedades automáticamente.

## ✅ Paso 1: Configurar Google Cloud Project

### 1.1 Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

### 1.2 Habilitar Google Calendar API

1. En Google Cloud Console, ve a **APIs & Services** → **Library**
2. Busca "Google Calendar API"
3. Click en **Enable**

### 1.3 Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Click en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, configura el **OAuth consent screen**:
   - Tipo: **External** (o Internal si tienes Google Workspace)
   - App name: `Vistral Construction Manager`
   - User support email: Tu email
   - Developer contact: Tu email
   - Click **Save and Continue**
   - En Scopes, agrega: `https://www.googleapis.com/auth/calendar`
   - Click **Save and Continue**
   - Agrega test users si es necesario
   - Click **Save and Continue**

4. Crear OAuth Client ID:
   - Application type: **Web application**
   - Name: `Vistral Web Client`
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/auth/google/callback
     https://dev.vistral.io/auth/google/callback
     https://tu-dominio.com/auth/google/callback
     ```
   - Click **Create**

5. Copia el **Client ID** y **Client Secret**

---

## ✅ Paso 2: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Para producción, actualiza GOOGLE_REDIRECT_URI:
# GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
```

---

## ✅ Paso 3: Ejecutar Migración de Base de Datos

Ejecuta la migración para crear las tablas necesarias:

```bash
# Si usas Supabase CLI
supabase migration up

# O ejecuta manualmente el archivo:
# supabase/migrations/012_google_calendar_tokens.sql
```

---

## ✅ Paso 4: Configurar Webhook (Opcional)

Para recibir notificaciones cuando cambien eventos en Google Calendar:

1. Ve a Google Cloud Console → **APIs & Services** → **Credentials**
2. Crea una **Service Account** (para webhooks)
3. O usa el endpoint `/api/google-calendar/webhook` con un servicio como ngrok para desarrollo

**Nota**: Los webhooks requieren un endpoint público HTTPS. Para desarrollo local, usa ngrok:

```bash
ngrok http 3000
# Usa la URL de ngrok en Google Calendar API watch requests
```

---

## ✅ Paso 5: Usar la Integración

### Para Administradores y Jefes de Obra:

1. Inicia sesión en la aplicación
2. Ve a cualquier página donde esté el componente `GoogleCalendarConnect`
3. Click en **"Conectar Google Calendar"**
4. Autoriza la aplicación en Google
5. Los eventos se sincronizarán automáticamente

### Sincronización Manual:

- Click en **"Sincronizar ahora"** en el componente de Google Calendar
- O usa el endpoint `/api/google-calendar/sync` (POST)

### Sincronización Automática:

- El cron job `/api/cron/sync-google-calendar` se ejecuta diariamente a las 9:00 AM
- Configurado en `vercel.json`

---

## 📅 Eventos Sincronizados

Los siguientes eventos de propiedades se sincronizan automáticamente:

1. **Visita Estimada** (`Estimated Visit Date`)
   - Se crea cuando hay una fecha de visita estimada

2. **Inicio de Obra** (`start_date`)
   - Se crea cuando hay una fecha de inicio de obra

3. **Finalización Estimada** (`estimated_end_date`)
   - Se crea cuando hay una fecha de finalización estimada

4. **Propiedad Lista** (calculado desde `start_date + renoDuration`)
   - Se calcula automáticamente basado en la duración de la obra

---

## 🔐 Permisos

- **Todos los usuarios autenticados**: Pueden conectar su Google Calendar personal y sincronizar eventos de propiedades
- Cada usuario sincroniza eventos a su propio calendario personal de Google
- Los eventos se sincronizan automáticamente según las propiedades que el usuario puede ver

---

## 🚨 Troubleshooting

### Error: "Google Calendar credentials not configured"
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en `.env.local`
- Reinicia el servidor de desarrollo después de agregar variables

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `GOOGLE_REDIRECT_URI` coincida exactamente con una de las URLs autorizadas en Google Cloud Console
- Las URLs son case-sensitive y deben incluir el protocolo completo (http:// o https://)

### Error: "Failed to exchange code for tokens"
- Verifica que el Client Secret sea correcto
- Asegúrate de que el OAuth consent screen esté configurado correctamente
- Verifica que el scope `https://www.googleapis.com/auth/calendar` esté habilitado

### Los eventos no se sincronizan
- Verifica que el usuario tenga Google Calendar conectado (`/api/google-calendar/status`)
- Revisa los logs del servidor para errores
- Intenta sincronizar manualmente desde la UI

### Token expirado
- Los tokens se renuevan automáticamente usando el refresh token
- Si falla, el usuario debe reconectar Google Calendar

---

## 📚 Recursos

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

