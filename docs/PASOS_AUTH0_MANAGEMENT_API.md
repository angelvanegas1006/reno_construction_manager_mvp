# 🚀 Pasos Rápidos para Configurar Auth0 Management API

Ya tienes las credenciales de la aplicación principal. Ahora necesitas crear una aplicación Machine to Machine para obtener las credenciales de Management API.

---

## ✅ Lo que ya tienes:
- **Domain**: `prophero-operators.eu.auth0.com`
- **Client ID**: `HOplP6XwQqThwRRe1KHe7cW8QvDjsFhd`

---

## 📋 Paso 1: Crear Aplicación Machine to Machine

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Ve a **Applications** → **Applications**
3. Click en **"Create Application"**
4. **Nombre**: `Vistral Management API` (o el que prefieras)
5. **Tipo**: Selecciona **"Machine to Machine Applications"**
6. Click **"Create"**

---

## 📋 Paso 2: Autorizar para Auth0 Management API

Después de crear la aplicación:

1. En la página de configuración, busca la sección **"APIs"**
2. Deberías ver una lista de APIs disponibles
3. Busca y selecciona **"Auth0 Management API"**
4. Click en el botón **"Authorize"** (o toggle para activarlo)

---

## 📋 Paso 3: Seleccionar Scopes (Permisos)

Después de autorizar, verás una lista de **"Authorized Scopes"**. Selecciona estos:

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

Luego click en **"Authorize"** o guarda los cambios.

---

## 📋 Paso 4 Obtener Credenciales de Management API

En la misma página de configuración de tu aplicación Machine to Machine:

1. **Client ID**: Copia este valor
   - Este será tu `AUTH0_MANAGEMENT_CLIENT_ID`

2. **Client Secret**: 
   - Click en el botón **"Show"** para revelar el secret
   - Copia este valor (es largo, asegúrate de copiarlo completo)
   - Este será tu `AUTH0_MANAGEMENT_CLIENT_SECRET`
   - ⚠️ **IMPORTANTE**: Este es un secreto. No lo compartas.

---

## 📝 Paso 5: Agregar Variables a .env.local

Abre tu archivo `.env.local` y agrega estas líneas:

```env
# ============================================
# Auth0 - Variables Públicas (Cliente)
# ============================================
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=HOplP6XwQqThwRRe1KHe7cW8QvDjsFhd
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io

# ============================================
# Auth0 - Management API (Solo Servidor)
# ============================================
AUTH0_DOMAIN=prophero-operators.eu.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=TU-MANAGEMENT-CLIENT-ID-AQUI
AUTH0_MANAGEMENT_CLIENT_SECRET=TU-MANAGEMENT-CLIENT-SECRET-AQUI
```

**Reemplaza:**
- `TU-MANAGEMENT-CLIENT-ID-AQUI` → El Client ID de tu aplicación Machine to Machine
- `TU-MANAGEMENT-CLIENT-SECRET-AQUI` → El Client Secret de tu aplicación Machine to Machine

---

## ✅ Paso 6: Verificar que Funciona

Después de agregar las variables:

1. **Reinicia el servidor de desarrollo** (si está corriendo):
   ```bash
   # Detén con Ctrl+C y reinicia
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

Si todo está bien, deberías ver:
- ✅ No hay warnings sobre "Missing configuration"
- ✅ Los roles se crean en Auth0
- ✅ Los usuarios se crean en Auth0 y Supabase

---

## 🔍 Verificar en Auth0 Dashboard

1. Ve a **User Management** → **Roles**
   - Deberías ver: `admin`, `construction_manager`, `foreman`, `user`

2. Ve a **User Management** → **Users**
   - Los usuarios creados deberían aparecer aquí

---

## 🆘 Si tienes problemas

### Error: "Failed to get Auth0 Management token"
- Verifica que `AUTH0_MANAGEMENT_CLIENT_ID` y `AUTH0_MANAGEMENT_CLIENT_SECRET` sean correctos
- Verifica que la aplicación Machine to Machine esté autorizada para Auth0 Management API
- Verifica que los scopes estén seleccionados

### Error: "Insufficient scope"
- Asegúrate de que todos los scopes necesarios estén seleccionados en la aplicación Machine to Machine

---

## 📝 Resumen de Variables

Una vez que tengas todo, tu `.env.local` debería tener:

```env
# Variables Públicas
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=HOplP6XwQqThwRRe1KHe7cW8QvDjsFhd
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io

# Variables Privadas (Management API)
AUTH0_DOMAIN=prophero-operators.eu.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=<tu-management-client-id>
AUTH0_MANAGEMENT_CLIENT_SECRET=<tu-management-client-secret>
```

¡Listo! 🎉

