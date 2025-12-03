# 🔧 Configurar Mixpanel en Vercel

## Token de Mixpanel
```
e2e9341ce2890c5cf5933db6c86b7a74
```

## Pasos para Configurar en Vercel

### 1. Ve a tu proyecto en Vercel
- Ve a [vercel.com](https://vercel.com)
- Selecciona tu proyecto

### 2. Agrega la Variable de Entorno
1. Ve a **Settings** → **Environment Variables**
2. Haz clic en **Add New**
3. Completa:
   - **Name**: `NEXT_PUBLIC_MIXPANEL_TOKEN`
   - **Value**: `e2e9341ce2890c5cf5933db6c86b7a74`
   - **Environments**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. Haz clic en **Save**

### 3. Redesplegar (si es necesario)
- Vercel debería detectar automáticamente el cambio
- Si no, ve a **Deployments** y haz clic en **Redeploy** en el último deployment

## Verificar que Funciona

1. Abre tu aplicación en el navegador
2. Abre la consola del navegador (F12)
3. Deberías ver: `[Mixpanel] Initialized successfully`
4. Ve a Mixpanel → **Events** para ver los eventos trackeados

## Eventos que se Trackean Automáticamente

- ✅ **Page Viewed** - Cada vez que cambias de página
- ✅ **Property Card Clicked** - Cuando haces clic en una card de propiedad
- ✅ **User Identified** - Cuando un usuario inicia sesión

## Próximos Pasos

Puedes agregar más eventos usando el hook `useMixpanel()`:

```typescript
import { useMixpanel } from "@/hooks/useMixpanel";

const { track } = useMixpanel();
track("Mi Evento", { propiedad: "valor" });
```

