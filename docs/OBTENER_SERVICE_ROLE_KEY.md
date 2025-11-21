# 🔑 Cómo Obtener el Service Role Key

El **service_role key** es una clave secreta que solo debe usarse en el servidor (nunca en el cliente).

## 📍 Ubicación en Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Menú lateral izquierdo → **Settings** (⚙️)
3. Click en **API**
4. Busca la sección **"Project API keys"**
5. Verás dos keys:
   - **anon public** - Esta es la que ya tienes (segura para el cliente)
   - **service_role secret** - Esta es la que necesitas (⚠️ SECRETO)

## 🔍 Cómo Identificarla

El **service_role key**:
- También empieza con `eyJ...`
- Es más larga que el anon key
- Tiene el texto **"service_role secret"** debajo
- ⚠️ **NUNCA** la compartas públicamente

## 📋 Pasos Visuales

```
Supabase Dashboard
  └── Tu Proyecto (vistral-dev)
      └── Settings (⚙️)
          └── API
              └── Project API keys
                  ├── anon public ← Ya la tienes
                  └── service_role secret ← Esta necesitas
```

## ✅ Una vez que la tengas

Cópiala y compártela conmigo para configurar `.env.local`

---

**Nota**: Si no ves el service_role key, puede que necesites hacer scroll hacia abajo en la página de API settings.

