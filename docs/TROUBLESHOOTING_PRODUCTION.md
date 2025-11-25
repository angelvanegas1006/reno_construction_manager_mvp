# 🐛 Solución: Error "Failed to fetch" en Production (dev.vistral.io)

## 🔍 Diagnóstico para Production

Si `dev.vistral.io` está configurado para **Production** y ves "Failed to fetch", el problema puede ser:

1. ❌ Variables de entorno no configuradas para Production
2. ❌ CORS no configurado en Supabase para `dev.vistral.io`
3. ❌ El dominio está apuntando a un deployment incorrecto
4. ❌ Variables de entorno incorrectas o vacías

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno en Vercel (Production)

1. Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**

2. **Verifica que TODAS las variables están configuradas para Production:**

   Debes tener estas variables con **Production** marcado:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` → Production ✅
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Production ✅
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` → Production ✅
   - ✅ `NEXT_PUBLIC_AIRTABLE_API_KEY` → Production ✅
   - ✅ `NEXT_PUBLIC_AIRTABLE_BASE_ID` → Production ✅
   - ✅ `NEXT_PUBLIC_AIRTABLE_TABLE_NAME` → Production ✅

3. **Verifica los valores:**
   - Click en cada variable
   - Verifica que el valor es correcto (no está vacío)
   - Especialmente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Paso 2: Verificar Configuración del Dominio

1. Ve a Vercel Dashboard → **Settings** → **Domains**
2. Verifica que `dev.vistral.io` está:
   - ✅ Agregado
   - ✅ Estado: **Valid** (no "Pending" o "Invalid")
   - ✅ Asignado a **Production** (no Preview)

### Paso 3: Verificar CORS en Supabase

El dominio `dev.vistral.io` debe estar permitido en Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu proyecto (`kqqobbxjyrdputngvxrf`)
2. Ve a **Settings** → **API**
3. Busca la sección **"CORS"** o **"Site URL"** o **"Redirect URLs"**
4. Agrega: `https://dev.vistral.io`
5. También agrega: `https://dev.vistral.io/**` (con wildcard)
6. Guarda los cambios

### Paso 4: Verificar el Deployment Actual

1. Ve a Vercel Dashboard → **Deployments**
2. Verifica cuál es el deployment de **Production** (debe ser de la branch `main`)
3. Verifica que ese deployment está **activo** y **funcionando**
4. Click en el deployment y verifica que no hay errores en los logs

### Paso 5: Verificar en el Navegador

1. Abre `https://dev.vistral.io`
2. Abre **DevTools** (F12 o Cmd+Option+I)
3. Ve a la pestaña **Console**
4. Busca errores específicos:
   - `NEXT_PUBLIC_SUPABASE_URL is not defined`
   - `CORS error`
   - `Failed to fetch`
   - `Network error`

5. Ve a la pestaña **Network**
6. Busca requests a Supabase que fallen
7. Click en el request fallido y revisa:
   - Status code (404, 500, CORS error?)
   - Response body
   - Headers

### Paso 6: Verificar Variables en Runtime

Crea una página temporal para verificar las variables:

```typescript
// app/debug-env/page.tsx (temporal, eliminar después)
export default function DebugEnv() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</p>
      <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...)' : 'NOT SET'}</p>
      <p>Vercel Env: {process.env.VERCEL_ENV}</p>
      <p>Node Env: {process.env.NODE_ENV}</p>
    </div>
  );
}
```

Luego visita `https://dev.vistral.io/debug-env` para verificar.

## 🎯 Solución Más Probable

### Problema 1: Variables no configuradas para Production

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Para cada variable, verifica que tiene **Production** marcado
3. Si no está marcado, márcalo y guarda
4. Haz un nuevo deploy desde `main`

### Problema 2: CORS no configurado

**Solución:**
1. Ve a Supabase → Settings → API
2. Agrega `https://dev.vistral.io` a los dominios permitidos
3. Guarda los cambios

### Problema 3: Deployment no está activo

**Solución:**
1. Verifica que el último deployment de `main` está activo
2. Si no, haz un nuevo deploy:
   ```bash
   git checkout main
   echo "# Trigger deploy" >> README.md
   git add README.md
   git commit -m "Trigger production deploy"
   git push origin main
   ```

## 📋 Checklist de Verificación

- [ ] Variables de entorno configuradas para **Production** en Vercel
- [ ] Valores de variables son correctos (no vacíos)
- [ ] `dev.vistral.io` agregado como dominio en Vercel
- [ ] Dominio configurado para **Production** (no Preview)
- [ ] Dominio muestra estado "Valid" en Vercel
- [ ] CORS configurado en Supabase para `dev.vistral.io`
- [ ] Deployment de Production está activo
- [ ] Logs de Vercel revisados para errores específicos
- [ ] DevTools del navegador revisados para errores

## 🔧 Verificación Rápida

### En Vercel:

1. **Settings** → **Environment Variables**:
   - Todas las variables tienen Production marcado ✅
   - Los valores son correctos ✅

2. **Settings** → **Domains**:
   - `dev.vistral.io` está "Valid" ✅
   - Asignado a Production ✅

3. **Deployments**:
   - Último deployment de `main` está activo ✅
   - No hay errores en los logs ✅

### En Supabase:

1. **Settings** → **API**:
   - `https://dev.vistral.io` está en CORS/Allowed Origins ✅

## 🚨 Si Nada Funciona

1. **Prueba con la URL automática de Vercel:**
   - Ve a Deployments → Click en el deployment de Production
   - Copia la URL automática (ej: `tu-proyecto.vercel.app`)
   - Prueba si funciona ahí
   - Si funciona ahí pero no en `dev.vistral.io`, el problema es del dominio/DNS

2. **Revisa los logs detallados:**
   - Vercel Dashboard → Deployments → [tu deployment] → Functions → Logs
   - Busca errores específicos

3. **Contacta soporte de Vercel** si el problema persiste


