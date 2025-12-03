# 🔐 Configuración de Variables Sensibles en Vercel

## ⚠️ Limitación de Vercel

Vercel **NO permite** crear variables sensibles en el entorno **Development**. Solo puedes marcarlas como "Sensitive" en:
- ✅ **Production**
- ✅ **Preview**

## ✅ Solución: Configurar Variables Sensibles

Para las variables sensibles (`SUPABASE_SERVICE_ROLE_KEY` y `AIRTABLE_WEBHOOK_SECRET`):

### Opción 1: Solo Production y Preview (Recomendado)

1. Al crear la variable, **NO selecciones "Development"**
2. Solo selecciona:
   - ✅ **Production**
   - ✅ **Preview**
3. Marca como **"Sensitive"**
4. Guarda

**Ventaja**: Las variables sensibles estarán protegidas en producción y preview, que es donde más importa.

### Opción 2: Sin Sensitive en Development

Si necesitas la variable en Development también:

1. Selecciona **todos los entornos** (Production, Preview, Development)
2. **NO marques como "Sensitive"** (Vercel no lo permite en Development)
3. Guarda

**Nota**: En Development local, usa `.env.local` que está protegido por `.gitignore`.

## 📋 Variables que Deben ser Sensibles

### 1. SUPABASE_SERVICE_ROLE_KEY
- ✅ Marca como Sensitive en **Production** y **Preview**
- ⚠️ No selecciones Development (o no marques como sensitive si lo seleccionas)

### 2. AIRTABLE_WEBHOOK_SECRET (si lo configuraste)
- ✅ Marca como Sensitive en **Production** y **Preview**
- ⚠️ No selecciones Development (o no marques como sensitive si lo seleccionas)

## 📋 Variables que NO Necesitan ser Sensibles

Estas son públicas de todas formas (empiezan con `NEXT_PUBLIC_`):

- `NEXT_PUBLIC_SUPABASE_URL` - No necesita ser sensitive
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - No necesita ser sensitive
- `NEXT_PUBLIC_AIRTABLE_API_KEY` - No necesita ser sensitive
- `NEXT_PUBLIC_AIRTABLE_BASE_ID` - No necesita ser sensitive
- `NEXT_PUBLIC_AIRTABLE_TABLE_NAME` - No necesita ser sensitive

## ✅ Configuración Recomendada

### Para SUPABASE_SERVICE_ROLE_KEY:

```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ✅ Production, ✅ Preview, ❌ Development
Sensitive: ✅ Yes
```

### Para las demás variables:

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://kqqobbxjyrdputngvxrf.supabase.co
Environments: ✅ Production, ✅ Preview, ✅ Development
Sensitive: ❌ No (no es necesario)
```

## 🔄 Desarrollo Local

Para desarrollo local, usa `.env.local`:

```env
# .env.local (no se sube a Git)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Este archivo está protegido por `.gitignore` y es seguro para desarrollo local.

## ✅ Checklist Final

- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en Production y Preview (Sensitive)
- [ ] `AIRTABLE_WEBHOOK_SECRET` configurada en Production y Preview (Sensitive, si la usas)
- [ ] Todas las demás variables configuradas en los 3 entornos
- [ ] Variables sensibles NO están en Development (o no marcadas como sensitive)

## 🎯 Resumen

**No te preocupes** si no puedes marcar como sensitive en Development. Es una limitación de Vercel y está bien. Lo importante es que estén marcadas como sensitive en **Production** y **Preview**, que es donde realmente importa la seguridad.









