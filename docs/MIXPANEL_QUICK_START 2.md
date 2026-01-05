# 🚀 Mixpanel - Guía Rápida

## ✅ Instalación Completada

Mixpanel ya está instalado y configurado en tu aplicación. Solo necesitas agregar tu token.

## 📝 Pasos para Configurar

### 1. Obtener Token de Mixpanel

1. Ve a [mixpanel.com](https://mixpanel.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **Settings** → **Project Settings** → **Project Info**
4. Copia el **Token**

### 2. Agregar Token en Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega:
   - **Name**: `NEXT_PUBLIC_MIXPANEL_TOKEN`
   - **Value**: Tu token de Mixpanel
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 3. Agregar Token Localmente (Opcional)

Crea o actualiza `.env.local`:

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=tu_token_aqui
```

## 🎯 Uso Rápido

### Trackear un Evento

```typescript
import { useMixpanel } from "@/hooks/useMixpanel";

function MyComponent() {
  const { track } = useMixpanel();

  const handleClick = () => {
    track("Button Clicked", {
      button_name: "Save",
      page: "property-detail",
    });
  };

  return <button onClick={handleClick}>Save</button>;
}
```

### Trackear Directamente

```typescript
import { trackEvent } from "@/lib/analytics/mixpanel";

trackEvent("Property Created", {
  property_id: "123",
  property_type: "apartment",
});
```

## 📊 Eventos Ya Implementados

- ✅ **Page Viewed** - Automático en cada cambio de página
- ✅ **Property Card Clicked** - Cuando hacen clic en una card de propiedad

## 🔍 Ver Eventos

1. Ve a tu proyecto en Mixpanel
2. Ve a **Events** para ver todos los eventos
3. Ve a **Insights** para crear dashboards

## 📚 Documentación Completa

Ver `docs/MIXPANEL_SETUP.md` para más detalles y ejemplos.

