# 🐛 Solución: Error "Failed to fetch" en dev.vistral.io

## 🔍 Diagnóstico

El error "Failed to fetch" generalmente indica:
1. ❌ Variables de entorno no configuradas para Preview
2. ❌ Problemas de CORS en Supabase
3. ❌ Supabase no accesible desde el dominio
4. ❌ Variables de entorno incorrectas

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno en Vercel

1. Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**

2. **Verifica que TODAS las variables están configuradas para Preview:**

   Debes tener estas variables con **Preview** marcado:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` → Preview ✅
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Preview ✅
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` → Preview ✅ (opcional pero recomendado)
   - ✅ `NEXT_PUBLIC_AIRTABLE_API_KEY` → Preview ✅
   - ✅ `NEXT_PUBLIC_AIRTABLE_BASE_ID` → Preview ✅
   - ✅ `NEXT_PUBLIC_AIRTABLE_TABLE_NAME` → Preview ✅

3. **Si alguna variable NO tiene Preview marcado:**
   - Click en la variable
   - Marca **Preview**
   - Click **Save**
   - Haz un nuevo deploy (o espera al siguiente push)

### Paso 2: Verificar Logs en Vercel

1. Ve a Vercel Dashboard → **Deployments**
2. Click en el deployment de `dev.vistral.io` (debería ser un Preview deployment)
3. Click en **"Functions"** o **"Logs"**
4. Busca errores relacionados con:
   - Supabase connection
   - Environment variables
   - CORS errors

### Paso 3: Verificar CORS en Supabase

El dominio `dev.vistral.io` debe estar permitido en Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu proyecto
2. Ve a **Settings** → **API**
3. Busca la sección **"CORS"** o **"Allowed Origins"**
4. Agrega: `https://dev.vistral.io`
5. Guarda los cambios

### Paso 4: Verificar que el Deploy es Preview

1. Ve a Vercel Dashboard → **Deployments**
2. Verifica que el deployment de `dev.vistral.io` tiene:
   - **Environment**: Preview (no Production)
   - **Branch**: Una branch que no sea `main`

Si el deployment es de `main`, entonces está usando Production, no Preview.

### Paso 5: Forzar un Nuevo Deploy

Si las variables están correctas pero aún no funciona:

1. **Opción A: Push a una branch de preview**
   ```bash
   git checkout -b preview-fix
   echo "# Fix preview" >> README.md
   git add .
   git commit -m "Fix preview deployment"
   git push origin preview-fix
   ```

2. **Opción B: Redeploy manual**
   - Ve a Vercel Dashboard → Deployments
   - Click en el deployment de preview
   - Click en **"Redeploy"**

## 🔧 Verificación Rápida

### En el Navegador (DevTools)

1. Abre `https://dev.vistral.io`
2. Abre **DevTools** (F12 o Cmd+Option+I)
3. Ve a la pestaña **Console**
4. Busca errores relacionados con:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `Failed to fetch`
   - CORS errors

5. Ve a la pestaña **Network**
6. Busca requests a Supabase que fallen
7. Click en el request fallido y revisa el error

### Verificar Variables en Runtime

Puedes crear una página temporal para verificar las variables:

```typescript
// app/debug-env/page.tsx (temporal, eliminar después)
export default function DebugEnv() {
  return (
    <div>
      <h1>Environment Variables</h1>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</p>
      <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</p>
      <p>Vercel Env: {process.env.VERCEL_ENV}</p>
    </div>
  );
}
```

Luego visita `https://dev.vistral.io/debug-env` para verificar.

## 🎯 Solución Más Probable

El problema más común es que **las variables de entorno no están configuradas para Preview**.

### Solución Rápida:

1. Ve a Vercel → Settings → Environment Variables
2. Para cada variable, verifica que tiene **Preview** marcado
3. Si no está marcado, márcalo y guarda
4. Haz un nuevo deploy o espera al siguiente push

## 📋 Checklist de Verificación

- [ ] Variables de entorno configuradas para Preview en Vercel
- [ ] `dev.vistral.io` agregado como dominio en Vercel
- [ ] Dominio configurado para Preview (no solo Production)
- [ ] Deployment actual es de una branch que no es `main`
- [ ] CORS configurado en Supabase para `dev.vistral.io`
- [ ] Logs de Vercel revisados para errores específicos
- [ ] DevTools del navegador revisados para errores

## 🚨 Si Nada Funciona

1. **Verifica que el dominio está correctamente configurado:**
   - Vercel → Settings → Domains → `dev.vistral.io` debe estar "Valid"
   - Debe estar asignado a Preview

2. **Prueba con la URL automática de Vercel:**
   - Ve a Deployments → Click en el preview deployment
   - Copia la URL automática (ej: `preview-test-tu-proyecto.vercel.app`)
   - Prueba si funciona ahí
   - Si funciona ahí pero no en `dev.vistral.io`, el problema es del dominio/DNS

3. **Contacta soporte de Vercel** si el problema persiste









