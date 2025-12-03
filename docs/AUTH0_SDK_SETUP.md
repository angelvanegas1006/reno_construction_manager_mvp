# 🔐 Configuración del SDK de Auth0 React

## 📋 Resumen

Esta guía te ayudará a configurar el SDK de Auth0 React (`@auth0/auth0-react`) en tu aplicación Next.js.

## ✅ Paso 1: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Auth0 Configuration para SDK de React
NEXT_PUBLIC_AUTH0_DOMAIN=tu-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
```

**Nota**: 
- Reemplaza `tu-tenant.auth0.com` con tu dominio de Auth0 (ej: `vistral.us.auth0.com`)
- Reemplaza `tu-client-id` con tu Client ID de Auth0

## ✅ Paso 2: Configurar Auth0 Dashboard

### 2.1 Verificar Callback URLs

En Auth0 Dashboard → Applications → Tu Aplicación → Settings:

**Allowed Callback URLs:**
```
http://localhost:3000
https://dev.vistral.io
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://dev.vistral.io
```

**Allowed Web Origins:**
```
http://localhost:3000
https://dev.vistral.io
```

### 2.2 Obtener Credenciales

En la misma página de Settings, copia:
- **Domain**: Tu dominio completo (ej: `vistral.us.auth0.com`)
- **Client ID**: Tu Client ID

## ✅ Paso 3: Archivos Creados

Los siguientes archivos han sido creados/modificados:

1. **`components/auth/auth0-provider.tsx`**
   - Provider wrapper para Auth0 SDK
   - Maneja la configuración y validación

2. **`components/auth/auth0-login-button.tsx`**
   - Botón de login usando el SDK de Auth0

3. **`components/auth/auth0-logout-button.tsx`**
   - Botón de logout usando el SDK de Auth0

4. **`components/auth/auth0-profile.tsx`**
   - Componente para mostrar el perfil del usuario

5. **`app/layout.tsx`**
   - Actualizado para incluir `Auth0ProviderWrapper`

6. **`components/auth/login-form.tsx`**
   - Actualizado para usar el nuevo botón de Auth0 SDK

## ✅ Paso 4: Usar el SDK en tus Componentes

### Ejemplo: Verificar Autenticación

```tsx
"use client";

import { useAuth0 } from "@auth0/auth0-react";

export function MyComponent() {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (isAuthenticated) {
    return <div>Hola, {user?.name}!</div>;
  }

  return <div>No autenticado</div>;
}
```

### Ejemplo: Login

```tsx
"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Auth0LoginButton } from "@/components/auth/auth0-login-button";

export function LoginPage() {
  return <Auth0LoginButton />;
}
```

### Ejemplo: Logout

```tsx
"use client";

import { Auth0LogoutButton } from "@/components/auth/auth0-logout-button";

export function LogoutPage() {
  return <Auth0LogoutButton />;
}
```

## 🔧 Diferencias entre Integraciones

### Opción 1: Supabase + Auth0 (OAuth)
- Usa `supabase.auth.signInWithOAuth({ provider: 'auth0' })`
- El usuario se crea en Supabase
- Los tokens se manejan por Supabase
- **Ventaja**: Integración completa con Supabase Auth

### Opción 2: Auth0 SDK React (Directo)
- Usa `@auth0/auth0-react` SDK
- El usuario se autentica directamente con Auth0
- Los tokens se manejan por Auth0 SDK
- **Ventaja**: Más control sobre el flujo de Auth0

## ⚠️ Notas Importantes

1. **Ambas opciones pueden coexistir**: Puedes tener ambos métodos de autenticación disponibles.

2. **Sincronización con Supabase**: Si usas el SDK de Auth0 directamente, necesitarás sincronizar manualmente con Supabase si quieres usar las funciones de Supabase que requieren autenticación.

3. **Variables de Entorno**: Asegúrate de que las variables `NEXT_PUBLIC_AUTH0_DOMAIN` y `NEXT_PUBLIC_AUTH0_CLIENT_ID` estén configuradas correctamente.

## 🧪 Probar la Integración

1. Asegúrate de que las variables de entorno estén configuradas
2. Ejecuta `npm run dev`
3. Ve a `http://localhost:3000/login`
4. Haz clic en "Continuar con Auth0"
5. Deberías ser redirigido a Auth0 para autenticarte

## 🔍 Troubleshooting

### Error: "Auth0 configuration missing"

**Solución**: Verifica que las variables de entorno estén en `.env.local`:
```env
NEXT_PUBLIC_AUTH0_DOMAIN=tu-dominio.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
```

### Error: "Invalid redirect_uri"

**Solución**: Verifica que las URLs en Auth0 Settings coincidan exactamente:
- `http://localhost:3000` (desarrollo)
- `https://dev.vistral.io` (producción)

### El botón no aparece

**Solución**: Verifica que `Auth0ProviderWrapper` esté en `app/layout.tsx` y que las variables de entorno estén configuradas.

---

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Callback URLs configuradas en Auth0 Dashboard
- [ ] `Auth0ProviderWrapper` agregado al layout
- [ ] Botón de login visible en la página de login
- [ ] Login con Auth0 funciona correctamente

---

## 🎉 ¡Listo!

El SDK de Auth0 React está integrado y listo para usar. Los usuarios pueden iniciar sesión usando el SDK de Auth0 directamente.









