# 🔧 Solución: Error CORS en dev.vistral.io

## 🔍 Problema Identificado

El error en DevTools muestra:
- **Request**: `token?grant_type=password`
- **Status**: `CORS error`
- **Preflight**: Status `556`

Esto significa que Supabase está bloqueando las requests desde `dev.vistral.io` porque no está en la lista de dominios permitidos.

## ✅ Solución: Configurar CORS en Supabase

### Paso 1: Ir a Supabase Dashboard

1. Ve a [Supabase Dashboard](https://app.supabase.com/project/kqqobbxjyrdputngvxrf)
2. Ve a **Settings** → **API**

### Paso 2: Configurar Site URL

1. Busca la sección **"Site URL"** o **"Project URL"**
2. Agrega o actualiza con:
   ```
   https://dev.vistral.io
   ```

### Paso 3: Configurar Redirect URLs

1. Busca la sección **"Redirect URLs"** o **"Additional Redirect URLs"**
2. Agrega estas URLs (una por línea o separadas por comas):
   ```
   https://dev.vistral.io/**
   https://dev.vistral.io/auth/callback
   https://dev.vistral.io/*
   ```

### Paso 4: Configurar CORS (si está disponible)

Algunos proyectos de Supabase tienen una sección específica de CORS:

1. Busca **"CORS"** o **"Allowed Origins"** en Settings → API
2. Agrega:
   ```
   https://dev.vistral.io
   ```

### Paso 5: Guardar y Probar

1. **Guarda todos los cambios** en Supabase
2. **Espera 1-2 minutos** para que los cambios se propaguen
3. **Recarga** `https://dev.vistral.io`
4. **Intenta hacer login** de nuevo

## 📋 URLs que Debes Agregar en Supabase

En **Settings** → **API**, configura:

### Site URL:
```
https://dev.vistral.io
```

### Redirect URLs:
```
https://dev.vistral.io/**
https://dev.vistral.io/auth/callback
https://dev.vistral.io/*
http://localhost:3000 (para desarrollo local)
http://localhost:3000/**
```

## 🔍 Verificación

Después de configurar CORS:

1. **Recarga la página** `https://dev.vistral.io`
2. **Abre DevTools** → **Network**
3. **Intenta hacer login**
4. **Verifica que el request a `token?grant_type=password`** ahora tiene status `200` (no CORS error)

## 🐛 Si Aún No Funciona

### Verificar que los cambios se guardaron:

1. Ve a Supabase Dashboard → Settings → API
2. Verifica que `https://dev.vistral.io` aparece en la lista
3. Si no aparece, agrégalo de nuevo y guarda

### Verificar el formato:

- ✅ Correcto: `https://dev.vistral.io`
- ✅ Correcto: `https://dev.vistral.io/**`
- ❌ Incorrecto: `dev.vistral.io` (falta https://)
- ❌ Incorrecto: `http://dev.vistral.io` (debe ser https)

### Esperar propagación:

Los cambios de CORS pueden tardar 1-5 minutos en aplicarse. Espera un poco y prueba de nuevo.

## ✅ Checklist

- [ ] Site URL configurado en Supabase: `https://dev.vistral.io`
- [ ] Redirect URLs configurados en Supabase
- [ ] Cambios guardados en Supabase
- [ ] Esperado 1-2 minutos para propagación
- [ ] Página recargada en `dev.vistral.io`
- [ ] Login probado de nuevo
- [ ] CORS error desapareció en DevTools

## 🎯 Resultado Esperado

Después de configurar CORS correctamente:
- ✅ El request `token?grant_type=password` debería tener status `200`
- ✅ El login debería funcionar correctamente
- ✅ No deberías ver más errores CORS en DevTools









