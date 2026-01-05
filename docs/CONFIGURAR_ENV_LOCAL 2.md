# 🔧 Guía para Configurar Variables de Entorno Local

## ✅ Paso 1: Archivo Creado

El archivo `.env.local` ya está creado en la raíz del proyecto con todas las variables necesarias.

## 📋 Paso 2: Obtener Credenciales de Supabase (OBLIGATORIO)

### 2.1 Crear o Acceder a tu Proyecto Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión o crea una cuenta
3. Si no tienes proyecto:
   - Click en **"New Project"**
   - Nombre: `vistral-dev` (o el que prefieras)
   - Elige una región cercana
   - Espera ~2 minutos a que se cree

### 2.2 Obtener las Credenciales

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Encuentra estas secciones:

#### **Project URL**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
```
Copia la URL completa que aparece en "Project URL"

#### **anon public key**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copia la key que aparece en "Project API keys" → "anon public"

#### **service_role key** (Opcional pero recomendado)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
⚠️ **IMPORTANTE**: Esta key es SECRETA. No la compartas públicamente.
Copia la key que aparece en "Project API keys" → "service_role"

### 2.3 Actualizar .env.local

Abre el archivo `.env.local` y reemplaza:
- `https://tu-proyecto.supabase.co` → Tu Project URL real
- `tu-anon-key-aqui` → Tu anon public key real
- `tu-service-role-key-aqui` → Tu service_role key real

## 📋 Paso 3: Configurar Auth0 (OPCIONAL)

Auth0 es opcional. Si no lo configuras, la aplicación funcionará con Supabase Auth.

### Si quieres configurar Auth0:

1. Ve a [https://manage.auth0.com](https://manage.auth0.com)
2. Crea una aplicación o usa una existente
3. Ve a **Settings** de tu aplicación
4. Copia:
   - **Domain** → `NEXT_PUBLIC_AUTH0_DOMAIN`
   - **Client ID** → `NEXT_PUBLIC_AUTH0_CLIENT_ID`
5. Actualiza `.env.local` con estos valores

### Si NO quieres usar Auth0:

Puedes dejar estas variables vacías o comentarlas:
```env
# NEXT_PUBLIC_AUTH0_DOMAIN=
# NEXT_PUBLIC_AUTH0_CLIENT_ID=
```

## 📋 Paso 4: Configurar Airtable (OPCIONAL)

Solo necesitas esto si vas a usar la sincronización con Airtable.

1. Ve a [https://airtable.com/api](https://airtable.com/api)
2. Selecciona tu base de datos
3. Copia:
   - **API Key** → `NEXT_PUBLIC_AIRTABLE_API_KEY`
   - **Base ID** → `NEXT_PUBLIC_AIRTABLE_BASE_ID`
4. El **Table Name** generalmente es `Properties`
5. Para el **Webhook Secret**, genera cualquier string aleatorio

### Si NO vas a usar Airtable:

Puedes dejar estas variables vacías o comentarlas.

## ✅ Paso 5: Verificar Configuración

Después de actualizar `.env.local`, reinicia el servidor:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar
npm run dev
```

## 🔍 Verificar que Funciona

1. Abre `http://localhost:3000` en tu navegador
2. Abre la consola del navegador (F12)
3. Si ves errores sobre variables faltantes, verifica que:
   - Las variables estén escritas correctamente (sin espacios extra)
   - No haya comillas alrededor de los valores
   - Los valores estén en la misma línea que la variable

## ⚠️ Problemas Comunes

### Error: "Missing required environment variables"

**Solución**: Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configuradas.

### Error 500 en el servidor

**Solución**: 
1. Verifica que las credenciales de Supabase sean correctas
2. Reinicia el servidor después de cambiar `.env.local`
3. Limpia el caché: `rm -rf .next && npm run dev`

### Auth0 no funciona

**Solución**: Si no necesitas Auth0, simplemente deja esas variables vacías. El código maneja la ausencia de Auth0 automáticamente.

## 📝 Ejemplo de .env.local Completo

```env
# Environment
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://kqqobbxjyrdputngvxrf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth0 (OPCIONAL - dejar vacío si no lo usas)
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=

# Airtable (OPCIONAL - dejar vacío si no lo usas)
NEXT_PUBLIC_AIRTABLE_API_KEY=
NEXT_PUBLIC_AIRTABLE_BASE_ID=
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties
AIRTABLE_WEBHOOK_SECRET=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## 🎯 Prioridades

1. **Mínimo para funcionar**: Solo configura Supabase (URL + anon key)
2. **Recomendado**: Supabase completo (URL + anon + service_role)
3. **Opcional**: Auth0 y Airtable según tus necesidades







