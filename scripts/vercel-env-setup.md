# Script para Configurar Variables de Entorno en Vercel

## Opción 1: Desde Vercel Dashboard (Recomendado)

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega cada variable:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://tu-proyecto.supabase.co`
   - Environment: Selecciona `Production`, `Preview`, `Development` según corresponda
4. Click **Save**

## Opción 2: Desde Vercel CLI

### Instalar Vercel CLI

```bash
npm i -g vercel
```

### Login

```bash
vercel login
```

### Agregar Variables

```bash
# Production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_AIRTABLE_API_KEY production
vercel env add NEXT_PUBLIC_AIRTABLE_BASE_ID production
vercel env add NEXT_PUBLIC_AIRTABLE_TABLE_NAME production
vercel env add AIRTABLE_WEBHOOK_SECRET production

# Preview (para branches de prueba)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# ... etc
```

## Opción 3: Script Automático (Próximamente)

Podríamos crear un script que lea `.env.example` y configure todo automáticamente.


