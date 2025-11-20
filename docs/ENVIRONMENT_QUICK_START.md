# 🚀 Quick Start: Configuración de Entornos

## Paso 1: Crear Archivos de Entorno

```bash
# Desde la raíz del proyecto
cp .env.example .env.local          # Development
cp .env.example .env.staging        # Staging (opcional por ahora)
cp .env.example .env.production     # Production (opcional por ahora)
```

## Paso 2: Crear Proyectos Supabase

### Development
1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto: `vistral-dev`
3. Copia las keys a `.env.local`:
   - Settings → API → Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Settings → API → anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Settings → API → service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### Staging (Más adelante)
- Proyecto: `vistral-staging`
- Configurar en `.env.staging`

### Production (Más adelante)
- Proyecto: `vistral-prod`
- Configurar en `.env.production`

## Paso 3: Configurar `.env.local`

Edita `.env.local` y completa:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vistral-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

## Paso 4: Ejecutar Migraciones

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta las migraciones:
   - `packages/event-bus/supabase/migrations/001_event_bus.sql`

## Paso 5: Verificar

```bash
npm run dev
```

Deberías ver en la consola:
```
🔧 Environment Configuration:
   Environment: development
   Supabase Project: vistral-dev
   Supabase URL: ✅ Set
   Debug Mode: ✅ Enabled
```

## ✅ Listo!

Ahora tienes:
- ✅ Desarrollo configurado
- ✅ Configuración centralizada en `lib/config/environment.ts`
- ✅ Supabase cliente usando la configuración correcta
- ✅ Event Bus usando la configuración correcta

## 📚 Documentación Completa

Ver `docs/environment-setup.md` para detalles completos sobre:
- Configuración de staging y production
- Setup en Vercel
- Variables de entorno por servicio
- Scripts útiles

