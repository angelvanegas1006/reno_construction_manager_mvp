# ✅ Configuración Completa de Variables de Entorno para Vercel

## 🎯 Todas las Variables Listas

Aquí están todas las variables que necesitas configurar en Vercel:

## 📋 Variables de Supabase (Development)

### 1. NEXT_PUBLIC_SUPABASE_URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://kqqobbxjyrdputngvxrf.supabase.co
Environment: Production, Preview, Development
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzE0NzgsImV4cCI6MjA3OTIwNzQ3OH0.of3EoJbCzV6C93H3vO1yPV5zh76HzXYeYavWp7ZjSv8
Environment: Production, Preview, Development
```

### 3. SUPABASE_SERVICE_ROLE_KEY
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYzMTQ3OCwiZXhwIjoyMDc5MjA3NDc4fQ.m3rrwd6RODgR7Fce2UZXGNLq9q4tZmnnhDRvBKytQyg
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

## 📋 Variables de Airtable

### 4. NEXT_PUBLIC_AIRTABLE_API_KEY
```
Key: NEXT_PUBLIC_AIRTABLE_API_KEY
Value: patgm06CFi5OvzcwG.609e8bc3ffd4e8c4e007cc24ab09be229595d344d189c901609dca99d4341d54
Environment: Production, Preview, Development
```

### 5. NEXT_PUBLIC_AIRTABLE_BASE_ID
```
Key: NEXT_PUBLIC_AIRTABLE_BASE_ID
Value: appT59F8wolMDKZeG
Environment: Production, Preview, Development
```

### 6. NEXT_PUBLIC_AIRTABLE_TABLE_NAME
```
Key: NEXT_PUBLIC_AIRTABLE_TABLE_NAME
Value: Properties
Environment: Production, Preview, Development
```

## 📋 Variables Opcionales

### 7. AIRTABLE_WEBHOOK_SECRET (Opcional pero recomendado)
```
Key: AIRTABLE_WEBHOOK_SECRET
Value: [Genera uno tú - cualquier string aleatorio]
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

Ejemplo de secret: `vistral_webhook_secret_2025_secure_xyz123`

## 🚀 Cómo Configurarlas en Vercel

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto (o créalo si aún no existe)
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Cada Variable

Para cada variable arriba:

1. Click en **"Add New"**
2. Pega el **Key** y **Value**
3. Selecciona los entornos: **Production**, **Preview**, **Development**
4. Si es sensitive (service_role o webhook secret), marca **"Sensitive"**
5. Click **Save**

### Paso 3: Verificar

Después de agregar todas, deberías tener 6-7 variables configuradas.

## ✅ Checklist Final

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (marcada como sensitive)
- [ ] `NEXT_PUBLIC_AIRTABLE_API_KEY` configurada
- [ ] `NEXT_PUBLIC_AIRTABLE_BASE_ID` configurada
- [ ] `NEXT_PUBLIC_AIRTABLE_TABLE_NAME` configurada
- [ ] `AIRTABLE_WEBHOOK_SECRET` configurada (opcional, marcada como sensitive)

## 🔄 Después de Configurar

1. **Haz un nuevo deploy** o espera al siguiente push a `main`
2. Las variables estarán disponibles automáticamente
3. Verifica que la aplicación funciona correctamente

## 🧪 Probar la Configuración

Después del deploy:

1. Abre la URL de producción de Vercel
2. Prueba el login
3. Verifica que Supabase está conectado
4. Prueba mover una propiedad en el Kanban
5. Verifica que se sincroniza con Airtable

## 📝 Nota sobre las Keys Legacy

Las keys que compartiste son las "legacy" API keys, que son las correctas para usar con la aplicación. Las nuevas keys de Storage (`sb_publishable_` y `sb_secret_`) son para Supabase Storage, no para la API de la aplicación.


