# 🎯 Plan de Integración: Auth0 Roles + Google Calendar

## 📋 Objetivos

1. **Roles en Auth0**: Gestionar roles directamente desde Auth0 y sincronizarlos con Supabase
2. **Google Calendar Integration**: Sincronización bidireccional de eventos entre Vistral y Google Calendar
3. **Seguridad Mejorada**: Usar Auth0 como capa adicional de seguridad y autenticación

---

## 🏗️ Fase 1: Configuración de Roles en Auth0

### 1.1 Crear Roles en Auth0 Dashboard

**Pasos:**
1. Auth0 Dashboard → **User Management** → **Roles**
2. Crear los siguientes roles:
   - `admin` - Acceso completo al sistema
   - `foreman` - Jefe de obra (acceso a construcción)
   - `user` - Usuario básico (solo lectura)

### 1.2 Asignar Roles a Usuarios

**Opción A: Manualmente desde Dashboard**
- Auth0 Dashboard → **User Management** → **Users**
- Seleccionar usuario → **Roles** tab → Asignar roles

**Opción B: Automáticamente con Metadata**
- Usar `app_metadata` en Auth0 para almacenar roles
- Sincronizar con Supabase después del login

### 1.3 Crear Auth0 Action para Sincronizar Roles

**Action: "Sync Role to Supabase"**
- Trigger: `Post-Login`
- Función: Después del login, sincronizar el rol de Auth0 a Supabase `user_roles`

---

## 🔄 Fase 2: Sincronización Auth0 ↔ Supabase

### 2.1 Modificar Auth0 Callback

**Archivo:** `app/auth/callback/route.ts`

**Cambios:**
- Extraer roles del token de Auth0
- Crear/actualizar usuario en Supabase si no existe
- Sincronizar rol desde Auth0 a `user_roles` table

### 2.2 Crear Hook para Roles desde Auth0

**Archivo:** `hooks/useAuth0Role.ts`

**Funcionalidad:**
- Obtener rol del usuario desde Auth0 token
- Fallback a Supabase si Auth0 no tiene rol
- Sincronizar automáticamente

### 2.3 Actualizar AppAuthContext

**Archivo:** `lib/auth/app-auth-context.tsx`

**Cambios:**
- Priorizar rol de Auth0 sobre Supabase
- Sincronizar roles automáticamente
- Mantener compatibilidad con usuarios existentes

---

## 📅 Fase 3: Integración con Google Calendar

### 3.1 Configurar Google Cloud Project

**Pasos:**
1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar **Google Calendar API**
3. Crear **OAuth 2.0 Credentials**
4. Configurar **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google/callback`
   - `https://dev.vistral.io/auth/google/callback`

### 3.2 Crear Tabla para Tokens de Google

**Migración:** `supabase/migrations/012_google_calendar_tokens.sql`

**Campos:**
- `id` (UUID)
- `user_id` (UUID, FK a auth.users)
- `access_token` (TEXT, encriptado)
- `refresh_token` (TEXT, encriptado)
- `expires_at` (TIMESTAMP)
- `calendar_id` (TEXT, ID del calendario principal)
- `created_at`, `updated_at`

### 3.3 Crear Componente de Conexión Google

**Archivo:** `components/auth/google-calendar-connect.tsx`

**Funcionalidad:**
- Botón "Conectar Google Calendar"
- Flujo OAuth de Google
- Almacenar tokens en Supabase (encriptados)

### 3.4 Crear Servicio de Sincronización

**Archivo:** `lib/google-calendar/sync-service.ts`

**Funciones:**
- `syncToGoogleCalendar()` - Crear/actualizar eventos en Google
- `syncFromGoogleCalendar()` - Traer eventos de Google a Vistral
- `refreshAccessToken()` - Renovar token expirado
- `createCalendarEvent()` - Crear evento en Google Calendar
- `updateCalendarEvent()` - Actualizar evento existente
- `deleteCalendarEvent()` - Eliminar evento

### 3.5 Integrar con VisitsCalendar

**Archivo:** `components/reno/visits-calendar.tsx`

**Cambios:**
- Al crear visita → Crear evento en Google Calendar
- Al actualizar visita → Actualizar evento en Google Calendar
- Al eliminar visita → Eliminar evento en Google Calendar
- Sincronizar eventos de Google → Mostrar en calendario

### 3.6 Crear Webhook para Cambios de Google

**Archivo:** `app/api/google-calendar/webhook/route.ts`

**Funcionalidad:**
- Recibir notificaciones de Google cuando cambian eventos
- Actualizar visitas en Supabase automáticamente

---

## 🔐 Fase 4: Seguridad Mejorada

### 4.1 Implementar JWT Validation

**Archivo:** `lib/auth/jwt-validator.ts`

**Funcionalidad:**
- Validar tokens de Auth0
- Verificar roles en el token
- Middleware para proteger rutas

### 4.2 Crear Middleware de Autenticación

**Archivo:** `middleware.ts`

**Funcionalidad:**
- Verificar autenticación en rutas protegidas
- Redirigir a login si no está autenticado
- Validar roles para acceso a rutas específicas

### 4.3 Encriptar Tokens de Google

**Archivo:** `lib/encryption/token-encryption.ts`

**Funcionalidad:**
- Encriptar `access_token` y `refresh_token` antes de guardar
- Desencriptar al usar tokens
- Usar `SUPABASE_SERVICE_ROLE_KEY` para encriptación

---

## 📊 Fase 5: UI/UX para Gestión de Roles

### 5.1 Crear Panel de Administración de Roles

**Archivo:** `app/admin/roles/page.tsx`

**Funcionalidad:**
- Listar todos los usuarios
- Ver roles actuales (Auth0 + Supabase)
- Asignar/cambiar roles
- Sincronizar roles manualmente

### 5.2 Crear Componente de Selección de Rol

**Archivo:** `components/admin/role-selector.tsx`

**Funcionalidad:**
- Dropdown para seleccionar rol
- Actualizar en Auth0 y Supabase
- Mostrar estado de sincronización

---

## 🔄 Fase 6: Sincronización Automática

### 6.1 Crear Cron Job para Sincronización

**Opción A: Vercel Cron Jobs**
- Archivo: `vercel.json` → `crons`
- Ejecutar cada hora para sincronizar eventos

**Opción B: Supabase Edge Functions**
- Función: `sync-google-calendar`
- Trigger: Cada hora

### 6.2 Crear Script de Sincronización Manual

**Archivo:** `scripts/sync-google-calendar.ts`

**Funcionalidad:**
- Sincronizar todos los usuarios conectados
- Logs detallados de sincronización
- Manejo de errores

---

## 📝 Estructura de Archivos a Crear

```
vistral-mvp/
├── app/
│   ├── api/
│   │   └── google-calendar/
│   │       ├── webhook/route.ts          # Webhook para cambios de Google
│   │       └── sync/route.ts             # Endpoint para sincronización manual
│   ├── auth/
│   │   └── google/
│   │       └── callback/route.ts         # Callback de OAuth de Google
│   └── admin/
│       └── roles/
│           └── page.tsx                  # Panel de administración de roles
├── components/
│   ├── auth/
│   │   └── google-calendar-connect.tsx  # Componente para conectar Google
│   └── admin/
│       └── role-selector.tsx            # Selector de roles
├── hooks/
│   ├── useAuth0Role.ts                 # Hook para obtener rol de Auth0
│   └── useGoogleCalendar.ts             # Hook para Google Calendar
├── lib/
│   ├── auth/
│   │   └── jwt-validator.ts            # Validación de JWT
│   ├── google-calendar/
│   │   ├── sync-service.ts             # Servicio de sincronización
│   │   ├── api-client.ts               # Cliente de Google Calendar API
│   │   └── types.ts                    # Tipos para Google Calendar
│   └── encryption/
│       └── token-encryption.ts         # Encriptación de tokens
├── middleware.ts                        # Middleware de autenticación
├── supabase/
│   └── migrations/
│       └── 012_google_calendar_tokens.sql  # Migración para tokens
└── scripts/
    └── sync-google-calendar.ts         # Script de sincronización manual
```

---

## 🔑 Variables de Entorno Necesarias

```env
# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret

# Google Calendar
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Supabase (ya existentes)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 📅 Cronograma de Implementación

### Semana 1: Roles en Auth0
- ✅ Configurar roles en Auth0 Dashboard
- ✅ Crear Auth0 Action para sincronización
- ✅ Modificar callback para sincronizar roles
- ✅ Actualizar AppAuthContext

### Semana 2: Google Calendar Básico
- ✅ Configurar Google Cloud Project
- ✅ Crear migración para tokens
- ✅ Implementar OAuth flow
- ✅ Crear servicio básico de sincronización

### Semana 3: Sincronización Bidireccional
- ✅ Integrar con VisitsCalendar
- ✅ Implementar webhook de Google
- ✅ Crear cron job para sincronización automática

### Semana 4: Seguridad y UI
- ✅ Implementar JWT validation
- ✅ Crear middleware de autenticación
- ✅ Panel de administración de roles
- ✅ Encriptación de tokens

---

## 🧪 Testing

### Tests a Realizar

1. **Roles:**
   - [ ] Usuario con rol en Auth0 se sincroniza a Supabase
   - [ ] Cambio de rol en Auth0 se refleja en la app
   - [ ] Usuario sin rol en Auth0 usa rol de Supabase (fallback)

2. **Google Calendar:**
   - [ ] Conexión OAuth funciona correctamente
   - [ ] Crear visita → Se crea evento en Google Calendar
   - [ ] Actualizar visita → Se actualiza evento en Google Calendar
   - [ ] Eliminar visita → Se elimina evento en Google Calendar
   - [ ] Cambio en Google Calendar → Se refleja en Vistral

3. **Seguridad:**
   - [ ] Tokens encriptados correctamente
   - [ ] Middleware protege rutas correctamente
   - [ ] JWT validation funciona

---

## 📚 Recursos

- [Auth0 Roles Documentation](https://auth0.com/docs/manage-users/access-control/rbac)
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [Supabase Auth0 Integration](https://supabase.com/docs/guides/auth/third-party/auth0)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## ✅ Checklist Final

### Roles en Auth0
- [ ] Roles creados en Auth0 Dashboard
- [ ] Auth0 Action creada para sincronización
- [ ] Callback modificado para sincronizar roles
- [ ] AppAuthContext actualizado
- [ ] Panel de administración creado

### Google Calendar
- [ ] Google Cloud Project configurado
- [ ] Google Calendar API habilitada
- [ ] OAuth credentials creadas
- [ ] Migración de tokens ejecutada
- [ ] Componente de conexión creado
- [ ] Servicio de sincronización implementado
- [ ] Integración con VisitsCalendar completa
- [ ] Webhook de Google configurado
- [ ] Cron job configurado

### Seguridad
- [ ] JWT validation implementada
- [ ] Middleware de autenticación creado
- [ ] Tokens encriptados
- [ ] Variables de entorno configuradas

---

## 🚀 Próximos Pasos

1. **Empezar con Fase 1**: Configurar roles en Auth0
2. **Crear migración**: Tabla para tokens de Google
3. **Implementar OAuth flow**: Conexión con Google Calendar
4. **Integrar con calendario**: Sincronización bidireccional

---

¿Empezamos con la Fase 1 (Roles en Auth0)?








