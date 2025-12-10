# 🔐 Configurar Variables de Auth0

Esta guía te ayudará a configurar todas las variables de Auth0 necesarias para la aplicación.

---

## 📋 Variables Necesarias

Necesitas configurar estas variables en tu archivo `.env.local`:

### Variables Públicas (para el cliente)
```env
NEXT_PUBLIC_AUTH0_DOMAIN=tu-dominio.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io
```

### Variables Privadas (solo servidor - Management API)
```env
AUTH0_DOMAIN=tu-dominio.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=tu-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=tu-management-client-secret
```

---

## 🔧 Paso 1: Obtener Variables Públicas

### 1.1 Crear o Usar una Aplicación Existente en Auth0

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Ve a **Applications** → **Applications**
3. Si ya tienes una aplicación, úsala. Si no, crea una nueva:
   - Click en **"Create Application"**
   - Nombre: `Vistral App` (o el que prefieras)
   - Tipo: **Single Page Application** o **Regular Web Application**
   - Click **"Create"**

### 1.2 Obtener Domain y Client ID

En la página de **Settings** de tu aplicación:

1. **Domain**: Copia el valor completo (ej: `prophero-operators-dev.eu.auth0.com`)
   - Este va en `NEXT_PUBLIC_AUTH0_DOMAIN` y `AUTH0_DOMAIN`

2. **Client ID**: Copia el Client ID
   - Este va en `NEXT_PUBLIC_AUTH0_CLIENT_ID`

### 1.3 Configurar URLs de Callback

En la misma página de **Settings**, configura:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
http://localhost:3000
https://tu-dominio.vercel.app/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://tu-dominio.vercel.app
```

**Allowed Web Origins:**
```
http://localhost:3000
https://tu-dominio.vercel.app
```

---

## 🔧 Paso 2: Crear Machine to Machine Application (Management API)

### 2.1 Crear la Aplicación

1. En Auth0 Dashboard, ve a **Applications** → **Applications**
2. Click en **"Create Application"**
3. Nombre: `Vistral Management API` (o el que prefieras)
4. Tipo: **Machine to Machine Applications**
5. Click **"Create"**

### 2.2 Autorizar la Aplicación

1. En la página de configuración, busca la sección **"APIs"**
2. Selecciona **"Auth0 Management API"**
3. Click en **"Authorize"**
4. En **"Authorized Scopes"**, selecciona estos permisos:
   - ✅ `read:users`
   - ✅ `create:users`
   - ✅ `update:users`
   - ✅ `delete:users`
   - ✅ `read:roles`
   - ✅ `create:roles`
   - ✅ `update:roles`
   - ✅ `delete:roles`
   - ✅ `assign:roles`
   - ✅ `remove:roles`
5. Click **"Authorize"**

### 2.3 Obtener Credenciales

En la página de configuración de tu aplicación Machine to Machine:

1. **Client ID**: Copia el Client ID
   - Este va en `AUTH0_MANAGEMENT_CLIENT_ID`

2. **Client Secret**: Click en **"Show"** y copia el Client Secret
   - ⚠️ **IMPORTANTE**: Este es un secreto. No lo compartas públicamente.
   - Este va en `AUTH0_MANAGEMENT_CLIENT_SECRET`

---

## 📝 Paso 3: Agregar Variables a .env.local

Abre tu archivo `.env.local` en la raíz del proyecto y agrega:

```env
# ============================================
# Auth0 - Variables Públicas (Cliente)
# ============================================
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id-aqui
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io

# ============================================
# Auth0 - Management API (Solo Servidor)
# ============================================
AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=tu-management-client-id-aqui
AUTH0_MANAGEMENT_CLIENT_SECRET=tu-management-client-secret-aqui
```

**Reemplaza:**
- `prophero-operators-dev.eu.auth0.com` → Tu dominio de Auth0
- `tu-client-id-aqui` → Tu Client ID de la aplicación principal
- `tu-management-client-id-aqui` → Tu Client ID de la aplicación Machine to Machine
- `tu-management-client-secret-aqui` → Tu Client Secret de la aplicación Machine to Machine

---

## ✅ Paso 4: Verificar Configuración

Después de agregar las variables:

1. **Reinicia el servidor de desarrollo**:
   ```bash
   # Detén el servidor (Ctrl+C) y reinícialo
   npm run dev
   ```

2. **Sincroniza roles a Auth0**:
   ```bash
   npm run sync:roles-to-auth0
   ```

3. **Crea usuarios en Auth0** (opcional):
   ```bash
   npm run create:users
   ```

---

## 🔍 Verificar que Funciona

### Verificar en la Consola

Si las variables están configuradas correctamente, deberías ver:
- ✅ No hay warnings sobre "Missing configuration" en la consola
- ✅ El script `create:users` crea usuarios en Auth0 sin warnings

### Verificar en Auth0 Dashboard

1. Ve a **User Management** → **Users**
2. Deberías ver los usuarios creados
3. Ve a **User Management** → **Roles**
4. Deberías ver los roles: `admin`, `construction_manager`, `foreman`, `user`

---

## ⚠️ Notas Importantes

1. **Variables Públicas vs Privadas**:
   - Las variables con `NEXT_PUBLIC_` son accesibles en el cliente (browser)
   - Las variables sin `NEXT_PUBLIC_` son solo para el servidor
   - **NUNCA** expongas `AUTH0_MANAGEMENT_CLIENT_SECRET` en el cliente

2. **Dos Aplicaciones Diferentes**:
   - La aplicación principal (SPA/Regular Web) → `NEXT_PUBLIC_AUTH0_CLIENT_ID`
   - La aplicación Machine to Machine → `AUTH0_MANAGEMENT_CLIENT_ID`
   - Son **diferentes** y tienen **diferentes propósitos**

3. **Domain es el Mismo**:
   - Tanto `NEXT_PUBLIC_AUTH0_DOMAIN` como `AUTH0_DOMAIN` deben tener el mismo valor
   - Es el dominio de tu tenant de Auth0

---

## 🆘 Troubleshooting

### Error: "Missing configuration"
- Verifica que todas las variables estén en `.env.local`
- Reinicia el servidor después de agregar variables

### Error: "Invalid credentials"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que la aplicación Machine to Machine esté autorizada para Auth0 Management API

### Error: "Insufficient scope"
- Verifica que todos los scopes necesarios estén autorizados en la aplicación Machine to Machine

---

## 📚 Recursos Adicionales

- [Documentación de Auth0 Management API](https://auth0.com/docs/api/management/v2)
- [Guía de Setup de Auth0 Management API](./AUTH0_MANAGEMENT_API_SETUP.md)
- [Guía de Roles de Auth0](./AUTH0_ROLES_SETUP.md)

