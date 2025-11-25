# 🔐 Configuración de Credenciales de Supabase

## ✅ Credenciales de Desarrollo Recibidas

- **Project Ref**: `kqqobbxjyrdputngvxrf`
- **Project URL**: `https://kqqobbxjyrdputngvxrf.supabase.co`
- **Dashboard URL**: `https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf`

## ⚠️ Keys Compartidas (Storage Keys)

Las keys que compartiste son de **Supabase Storage**, pero necesitamos las keys de la **API**:

- `sb_publishable_KAXb8m2WZX7Gs2HpYkFU4Q_moweVLsE` → Storage Publishable Key
- `sb_secret_-_nkdtdnOaJ6OArMryWOuw_8pKjHJZg` → Storage Secret Key

## 🔑 Cómo Obtener las Keys de la API

### Paso 1: Ir al Dashboard

1. Ve a: https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf
2. O ve a: https://app.supabase.com → Selecciona el proyecto

### Paso 2: Obtener las Keys de la API

1. En el menú lateral izquierdo, click en **"Settings"** (⚙️)
2. Click en **"API"** (dentro de Settings)
3. Busca la sección **"Project API keys"**

### Paso 3: Copiar las Keys

Necesitas estas dos keys:

#### 1. **anon public** key
- Está en la sección **"Project API keys"**
- Label: `anon` `public`
- Es una cadena larga que empieza con `eyJ...`
- Esta es la que va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. **service_role** key
- Está en la misma sección
- Label: `service_role` `secret`
- También empieza con `eyJ...`
- ⚠️ **SECRETO** - No compartir públicamente
- Esta es la que va en `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Formato Esperado

Las keys de la API tienen este formato:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ✅ Una Vez que Tengas las Keys Correctas

Comparte:
1. **NEXT_PUBLIC_SUPABASE_URL**: `https://kqqobbxjyrdputngvxrf.supabase.co`
2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: `eyJ...` (la key anon public)
3. **SUPABASE_SERVICE_ROLE_KEY**: `eyJ...` (la key service_role - opcional para Vercel)

## 🚀 Para Vercel

Para configurar en Vercel, necesitas:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://kqqobbxjyrdputngvxrf.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (la key anon que obtengas)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` = (opcional, pero recomendado)


