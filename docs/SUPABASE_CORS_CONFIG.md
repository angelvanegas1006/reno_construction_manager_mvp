# 🔧 Configurar CORS en Supabase - Guía Paso a Paso

## 📍 Dónde Configurar CORS

**NO está en "API Keys"** - Está en **"Authentication"** o **"General"**

## ✅ Paso a Paso

### Paso 1: Ir a la Sección Correcta

Desde donde estás ahora (API Keys):

1. En el menú lateral izquierdo, busca **"CONFIGURATION"**
2. Click en **"Authentication"** (no en API Keys)
3. O ve a **"PROJECT SETTINGS"** → **"General"**

### Paso 2: Configurar Site URL

1. En la página de **Authentication**, busca la sección **"Site URL"**
2. Deberías ver un campo de texto
3. Cambia o agrega:
   ```
   https://dev.vistral.io
   ```

### Paso 3: Configurar Redirect URLs

1. En la misma página de **Authentication**, busca **"Redirect URLs"** o **"Additional Redirect URLs"**
2. Deberías ver una lista o campo de texto
3. Agrega estas URLs (una por línea o separadas por comas):
   ```
   https://dev.vistral.io/**
   https://dev.vistral.io/auth/callback
   https://dev.vistral.io/*
   http://localhost:3000/**
   ```

### Paso 4: Guardar

1. Click en **"Save"** o el botón de guardar
2. Espera a que se guarde (puede tardar unos segundos)

## 🎯 Ruta Exacta en Supabase

```
Supabase Dashboard
  → Tu Proyecto (kqqobbxjyrdputngvxrf)
  → Settings (icono de engranaje ⚙️)
  → Authentication (en el menú lateral izquierdo)
  → Site URL y Redirect URLs
```

## 📸 Qué Buscar

En la página de **Authentication**, deberías ver:

1. **Site URL** - Campo de texto donde poner `https://dev.vistral.io`
2. **Redirect URLs** - Lista o campo donde agregar las URLs adicionales

## ⚠️ Si No Encuentras "Authentication"

Algunas versiones de Supabase tienen la configuración en:

1. **Settings** → **General** → Busca "Site URL"
2. O directamente en **Settings** → Busca "Site URL" o "Redirect URLs"

## ✅ Después de Configurar

1. **Guarda los cambios**
2. **Espera 1-2 minutos** para propagación
3. **Recarga** `https://dev.vistral.io`
4. **Prueba el login** de nuevo

## 🔍 Verificación

Después de configurar, verifica en DevTools:
- El error CORS debería desaparecer
- El request `token?grant_type=password` debería tener status `200`


