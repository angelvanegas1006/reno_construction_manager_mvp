# 🔐 Guía de Configuración: Auth0 con Supabase

## 📋 Resumen

Esta guía te ayudará a integrar Auth0 como proveedor de autenticación OAuth con Supabase.

## ✅ Paso 1: Configurar Auth0

### 1.1 Crear Aplicación en Auth0

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Ve a **Applications** → **Applications**
3. Click en **"Create Application"**
4. Nombre: `Reno App concept` (o el que prefieras)
5. Tipo: **Single Page Applications**
6. Click **"Create"**

### 1.2 Configurar URLs de Callback

En la pestaña **"Settings"** de tu aplicación:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
https://dev.vistral.io/auth/callback
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

### 1.3 Obtener Credenciales

En la misma página de **Settings**, copia:

- **Domain**: `tu-tenant.us.auth0.com` (o similar)
- **Client ID**: `et40IHuTyuttpbC1CI3EXYRTu98KU5ii` (ya lo tienes)
- **Client Secret**: Click en "Show" para verlo

---

## ✅ Paso 2: Configurar Supabase

### 2.1 Habilitar Auth0 Provider

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** → **Providers**
3. Busca **"Auth0"** en la lista
4. Click en el toggle para **habilitarlo**

### 2.2 Configurar Credenciales

Completa los siguientes campos:

- **Issuer URL**: `https://TU-DOMAIN.auth0.com`
  - Reemplaza `TU-DOMAIN` con tu dominio de Auth0
  - Ejemplo: `https://vistral.us.auth0.com`

- **Client ID**: `et40IHuTyuttpbC1CI3EXYRTu98KU5ii`
  - (El Client ID que copiaste de Auth0)

- **Client Secret**: 
  - (El Client Secret que copiaste de Auth0)

### 2.3 Configurar JWT Settings (Opcional pero Recomendado)

En Auth0, ve a **Actions** → **Flows** → **Login**:

1. Click en **"+"** para crear una nueva Action
2. Nombre: `Add role to token`
3. Código:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://vistral.io';
  
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
```

4. Click **"Deploy"**

---

## ✅ Paso 3: Configurar Variables de Entorno

No necesitas agregar variables de entorno adicionales porque Supabase maneja la configuración de Auth0 internamente.

Sin embargo, asegúrate de tener estas variables configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## ✅ Paso 4: Probar la Integración

### 4.1 Probar Login con Auth0

1. Ve a `http://localhost:3000/login`
2. Click en **"Continuar con Auth0"**
3. Deberías ser redirigido a Auth0
4. Inicia sesión con tus credenciales
5. Deberías ser redirigido de vuelta a la app

### 4.2 Verificar Sesión

Después del login, verifica en DevTools → Application → Cookies que:
- Hay cookies de Supabase (`sb-*-auth-token`)
- La sesión está activa

---

## 🔧 Troubleshooting

### Error: "Invalid redirect_uri"

**Solución**: Verifica que las URLs en Auth0 Settings coincidan exactamente con las que estás usando:
- `http://localhost:3000/auth/callback` (desarrollo)
- `https://dev.vistral.io/auth/callback` (producción)

### Error: "Provider not enabled"

**Solución**: 
1. Ve a Supabase → Authentication → Providers
2. Asegúrate de que Auth0 esté **habilitado** (toggle ON)
3. Verifica que las credenciales estén correctas

### Error: "Invalid credentials"

**Solución**:
1. Verifica que el **Issuer URL** en Supabase sea exactamente: `https://TU-DOMAIN.auth0.com`
2. Verifica que el **Client ID** y **Client Secret** sean correctos
3. Asegúrate de copiar el **Client Secret** completo (puede estar oculto)

### Usuario no tiene rol asignado

**Solución**:
1. Después del primer login con Auth0, el usuario se crea en Supabase
2. Necesitas asignarle un rol manualmente en la tabla `user_roles`:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-id-from-auth', 'foreman');
```

O desde Supabase Dashboard:
1. Ve a **Authentication** → **Users**
2. Encuentra el usuario
3. Ve a **Database** → **user_roles**
4. Inserta un nuevo registro con el `user_id` y `role`

---

## 📚 Recursos Adicionales

- [Supabase Auth0 Integration Docs](https://supabase.com/docs/guides/auth/third-party/auth0)
- [Auth0 Quickstart Guide](https://auth0.com/docs/quickstart/spa/react)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/third-party/overview)

---

## ✅ Checklist Final

- [ ] Auth0 aplicación creada (Single Page Application)
- [ ] Callback URLs configuradas en Auth0
- [ ] Auth0 habilitado en Supabase
- [ ] Credenciales configuradas en Supabase (Issuer URL, Client ID, Client Secret)
- [ ] Botón "Continuar con Auth0" visible en login
- [ ] Login con Auth0 funciona correctamente
- [ ] Usuario creado en Supabase después del login
- [ ] Rol asignado al usuario en `user_roles`

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tus usuarios podrán iniciar sesión con Auth0 además del método tradicional de email/password.









