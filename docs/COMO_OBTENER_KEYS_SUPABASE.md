# 🔑 Cómo Obtener las Keys Correctas de Supabase API

## ⚠️ Las Keys que Compartiste NO son las Correctas

Las keys que compartiste:
- `sb_publishable_KAXb8m2WZX7Gs2HpYkFU4Q_moweVLsE` → **Storage Publishable Key**
- `sb_secret_-_nkdtdnOaJ6OArMryWOuw_8pKjHJZg` → **Storage Secret Key**

Estas son para **Supabase Storage**, NO para la API de la aplicación.

## ✅ Las Keys que Necesitas

Para la aplicación necesitas las **API Keys** que tienen este formato:
- Empiezan con `eyJ...` (son tokens JWT)
- Están en la sección **"Project API keys"**

## 📋 Paso a Paso para Obtenerlas

### Paso 1: Ir al Dashboard de Supabase

1. Abre tu navegador
2. Ve a: **https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf**
3. O ve a: **https://app.supabase.com** → Selecciona el proyecto `kqqobbxjyrdputngvxrf`

### Paso 2: Ir a Settings → API

1. En el menú lateral izquierdo, busca **"Settings"** (icono de engranaje ⚙️)
2. Click en **"Settings"**
3. Dentro de Settings, busca y click en **"API"**

### Paso 3: Encontrar las Project API Keys

En la página de API, verás varias secciones. Busca la sección que dice:

**"Project API keys"**

Aquí verás algo como:

```
Project API keys

anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

service_role secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### Paso 4: Copiar las Keys

#### Key 1: anon public
- Label: `anon` `public`
- Es la cadena larga que empieza con `eyJ...`
- Esta es la que va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Puedes hacer click en el icono de "copiar" al lado

#### Key 2: service_role secret
- Label: `service_role` `secret`
- También empieza con `eyJ...` pero es diferente
- ⚠️ **SECRETO** - No compartir públicamente
- Esta es la que va en `SUPABASE_SERVICE_ROLE_KEY`
- También tiene un icono de "copiar"

## 🎯 Formato Correcto

Las keys correctas se ven así:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Son **muy largas** (varios cientos de caracteres) y empiezan con `eyJ`.

## 📸 Si No Las Encuentras

Si no ves la sección "Project API keys", intenta:

1. **Scroll hacia abajo** en la página de API
2. Busca secciones como:
   - "Project API keys"
   - "API Keys"
   - "Keys"
3. Si aún no las ves, puede que necesites permisos de administrador

## ✅ Una Vez que Las Tengas

Comparte:
1. La key `anon public` (empieza con `eyJ...`)
2. La key `service_role` (empieza con `eyJ...`)

Y las configuramos en Vercel.


