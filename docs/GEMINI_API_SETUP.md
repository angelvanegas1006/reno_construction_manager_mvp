# 🤖 Configuración de API de Gemini para Generación Automática de Textos

## 📋 Variables de Entorno Requeridas

Para que la generación automática de textos con IA funcione correctamente, necesitas configurar esta variable de entorno:

### GEMINI_API_KEY
- **Descripción**: API Key de Google Gemini para generar textos automáticamente en los emails de actualización
- **Valor**: `AIzaSyC0HdSSPdtSjXb55TSW_tWmMrRTh-KO6rM`
- **Sensible**: ✅ Sí (marca como sensitive en Vercel)

## 🚀 Configuración Local (.env.local)

Agrega esta variable a tu archivo `.env.local`:

```env
# Google Gemini API Key for automatic text generation
GEMINI_API_KEY=AIzaSyC0HdSSPdtSjXb55TSW_tWmMrRTh-KO6rM
```

**⚠️ Importante**: El archivo `.env.local` está en `.gitignore` y no debe ser commiteado al repositorio.

## 🌐 Configuración en Vercel

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variable

Agrega esta variable:

```
Key: GEMINI_API_KEY
Value: AIzaSyC0HdSSPdtSjXb55TSW_tWmMrRTh-KO6rM
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

### Paso 3: Guardar y Redesplegar

1. Click **Save**
2. Ve a **Deployments** y haz un **Redeploy** del último deployment para que la variable surta efecto

## ✅ Verificación

Después de configurar la variable:

1. **Local**: Reinicia el servidor de desarrollo (`npm run dev`)
2. **Vercel**: Espera a que termine el redeploy
3. Abre la vista previa de un email de actualización
4. Los textos deberían generarse automáticamente con IA al abrir el modal

## 🔧 Funcionamiento

- Al abrir la vista previa del correo, se generan automáticamente textos para todas las categorías con avances (porcentaje > 0)
- Los textos se generan en paralelo para todas las categorías
- Si falla la generación para alguna categoría, se usa un texto por defecto
- Los textos generados pueden editarse manualmente antes de enviar

