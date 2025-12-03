# 🔧 Configurar CORS en Supabase - Guía Visual Paso a Paso

## ⚠️ El Error que Estás Viendo

En DevTools → Network ves:
- `token?grant_type=password` → **CORS error**
- Preflight request → Status **556**

Esto significa que Supabase está bloqueando las requests desde `dev.vistral.io`.

## ✅ Solución: Configurar en Authentication

### Paso 1: Navegar a Authentication

1. Ve a [Supabase Dashboard](https://app.supabase.com/project/kqqobbxjyrdputngvxrf)
2. En el menú lateral izquierdo, busca **"CONFIGURATION"**
3. Click en **"Authentication"** (no en "API Keys")

### Paso 2: Buscar "Site URL"

En la página de Authentication, deberías ver varias secciones. Busca:

**"Site URL"** o **"Project URL"**

Es un campo de texto que probablemente tiene algo como:
- `http://localhost:3000`
- O está vacío

### Paso 3: Configurar Site URL

1. En el campo **"Site URL"**, cambia o agrega:
   ```
   https://dev.vistral.io
   ```

2. **IMPORTANTE**: Si ya hay algo ahí, puedes:
   - Reemplazarlo completamente con `https://dev.vistral.io`
   - O agregar múltiples URLs separadas por comas (si Supabase lo permite)

### Paso 4: Buscar "Redirect URLs"

En la misma página de Authentication, busca:

**"Redirect URLs"** o **"Additional Redirect URLs"** o **"Allowed Redirect URLs"**

Es una lista o campo de texto donde puedes agregar múltiples URLs.

### Paso 5: Agregar Redirect URLs

Agrega estas URLs (una por línea o separadas por comas, según cómo Supabase lo permita):

```
https://dev.vistral.io/**
https://dev.vistral.io/auth/callback
https://dev.vistral.io/*
http://localhost:3000/**
http://localhost:3000/auth/callback
```

### Paso 6: Guardar

1. Busca el botón **"Save"** o **"Update"** en la página
2. Click en guardar
3. Espera a que se guarde (puede tardar unos segundos)

### Paso 7: Esperar Propagación

Los cambios de CORS pueden tardar:
- **Mínimo**: 30 segundos
- **Típico**: 1-2 minutos
- **Máximo**: 5 minutos

### Paso 8: Probar de Nuevo

1. **Cierra completamente** el navegador o haz **hard refresh**:
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

2. Abre `https://dev.vistral.io` de nuevo

3. Abre DevTools → Network

4. Intenta hacer login

5. Verifica que el request `token?grant_type=password` ahora tiene:
   - Status: **200** (no CORS error)
   - Type: **fetch**

## 🔍 Si No Encuentras "Authentication"

Algunas versiones de Supabase tienen la configuración en lugares diferentes:

### Opción A: Settings → General

1. Ve a **Settings** → **General**
2. Busca **"Site URL"** o **"Project URL"**
3. Agrega `https://dev.vistral.io`

### Opción B: Directamente en Settings

1. Ve a **Settings** (icono de engranaje ⚙️)
2. Busca en todas las secciones:
   - **Site URL**
   - **Redirect URLs**
   - **CORS**
   - **Allowed Origins**

## 📸 Qué Buscar Exactamente

En la página de Authentication, deberías ver algo como:

```
Site URL
[ Campo de texto: https://dev.vistral.io ]

Redirect URLs
[ Campo de texto o lista ]
https://dev.vistral.io/**
https://dev.vistral.io/auth/callback
...
```

## ⚠️ Errores Comunes

### Error 1: No guardaste los cambios
- ✅ Asegúrate de hacer click en **"Save"** después de cambiar

### Error 2: Formato incorrecto
- ✅ Correcto: `https://dev.vistral.io`
- ❌ Incorrecto: `dev.vistral.io` (falta https://)
- ❌ Incorrecto: `http://dev.vistral.io` (debe ser https)

### Error 3: No esperaste la propagación
- ✅ Espera 1-2 minutos después de guardar
- ✅ Haz hard refresh del navegador

### Error 4: Estás en la página incorrecta
- ✅ Debe ser **Authentication**, NO **API Keys**
- ✅ Busca en el menú lateral izquierdo bajo **"CONFIGURATION"**

## 🧪 Verificación Final

Después de configurar correctamente:

1. **Hard refresh** del navegador (`Cmd + Shift + R`)
2. Abre DevTools → Network
3. Intenta login
4. El request `token?grant_type=password` debería tener:
   - ✅ Status: **200**
   - ✅ No más errores CORS

## 🆘 Si Aún No Funciona

1. **Verifica que guardaste** los cambios en Supabase
2. **Espera 5 minutos** y prueba de nuevo
3. **Verifica el formato** de las URLs (deben empezar con `https://`)
4. **Prueba con la URL automática de Vercel** para comparar:
   - Ve a Vercel → Deployments → Copia la URL automática
   - Prueba si funciona ahí
   - Si funciona ahí pero no en `dev.vistral.io`, el problema es específico del dominio









