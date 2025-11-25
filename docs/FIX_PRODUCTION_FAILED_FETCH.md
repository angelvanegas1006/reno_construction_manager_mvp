# 🔧 Solución: "Failed to fetch" en Production (dev.vistral.io)

## ✅ Lo que está bien

- ✅ `dev.vistral.io` está configurado en Vercel
- ✅ Estado: "Valid Configuration"
- ✅ Asignado a Production

## 🔍 Problema: Variables de Entorno o CORS

El error "Failed to fetch" generalmente indica que:
1. Las variables de Supabase no están disponibles en runtime
2. CORS no está configurado en Supabase para `dev.vistral.io`

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno en Vercel

1. Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**

2. **Verifica estas variables específicamente para Production:**

   ```
   NEXT_PUBLIC_SUPABASE_URL
   Valor esperado: https://kqqobbxjyrdputngvxrf.supabase.co
   Ambiente: ✅ Production (debe estar marcado)
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   Valor esperado: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la key completa)
   Ambiente: ✅ Production (debe estar marcado)
   ```

3. **Si alguna variable NO tiene Production marcado:**
   - Click en la variable
   - Marca **Production**
   - Verifica que el valor es correcto
   - Click **Save**

### Paso 2: Verificar CORS en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com/project/kqqobbxjyrdputngvxrf)
2. Ve a **Settings** → **API**
3. Busca la sección **"Site URL"** o **"Redirect URLs"** o **"CORS"**
4. Agrega estos valores:
   ```
   https://dev.vistral.io
   https://dev.vistral.io/**
   ```
5. Guarda los cambios

### Paso 3: Forzar un Nuevo Deploy

Después de verificar/actualizar las variables:

1. **Opción A: Push a main**
   ```bash
   git checkout main
   echo "# Trigger deploy" >> README.md
   git add README.md
   git commit -m "Trigger production deploy"
   git push origin main
   ```

2. **Opción B: Redeploy manual**
   - Ve a Vercel → Deployments
   - Click en el último deployment de Production
   - Click en **"Redeploy"**

### Paso 4: Verificar en el Navegador

1. Abre `https://dev.vistral.io`
2. Abre **DevTools** (F12)
3. Ve a **Console** y busca errores específicos
4. Ve a **Network** y busca requests fallidos a Supabase

## 🎯 Verificación Rápida

### Checklist:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada para Production con valor correcto
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada para Production con valor correcto
- [ ] CORS configurado en Supabase para `dev.vistral.io`
- [ ] Nuevo deploy hecho después de actualizar variables
- [ ] DevTools del navegador revisados para errores específicos

## 🔍 Debugging Adicional

Si aún no funciona, crea una página de debug temporal:

```typescript
// app/debug/page.tsx
export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Info</h1>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</p>
      <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</p>
      <p>Vercel Env: {process.env.VERCEL_ENV}</p>
    </div>
  );
}
```

Visita `https://dev.vistral.io/debug` para verificar si las variables están disponibles.


