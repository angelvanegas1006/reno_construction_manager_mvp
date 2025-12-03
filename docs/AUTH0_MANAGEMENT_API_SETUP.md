# 🔧 Configuración de Auth0 Management API

Esta guía te ayudará a configurar Auth0 Management API para gestionar usuarios y roles desde la aplicación.

---

## 📋 Paso 1: Crear Machine to Machine Application en Auth0

### 1.1 Crear la Aplicación

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Ve a **Applications** → **Applications**
3. Click en **"Create Application"**
4. Nombre: `Vistral Management API` (o el que prefieras)
5. Tipo: **Machine to Machine Applications**
6. Click **"Create"**

### 1.2 Autorizar la Aplicación

1. En la página de configuración, busca **"APIs"**
2. Selecciona **"Auth0 Management API"**
3. Click en **"Authorize"**
4. En **"Authorized Scopes"**, selecciona:
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

### 1.3 Obtener Credenciales

En la página de configuración de tu aplicación:

1. Copia el **Client ID**
2. Copia el **Client Secret** (click en "Show" para verlo)

---

## 🔑 Paso 2: Configurar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
# Auth0 Management API
AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=tu-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=tu-management-client-secret

# Auth0 (ya existentes)
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io
```

**Importante:**
- `AUTH0_MANAGEMENT_CLIENT_ID` y `AUTH0_MANAGEMENT_CLIENT_SECRET` son **diferentes** de `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- Las variables de Management API **NO** deben tener el prefijo `NEXT_PUBLIC_` porque son secretas
- Solo se usan en el servidor (API routes)

---

## ✅ Paso 3: Sincronizar Roles a Auth0

### Opción A: Desde la App (Panel Admin)

1. Inicia sesión como admin
2. Ve a `/admin/users`
3. Click en **"Sincronizar Roles a Auth0"**
4. Los roles se crearán automáticamente en Auth0

### Opción B: Desde la Terminal

```bash
npm run sync:roles-to-auth0
```

Esto creará los siguientes roles en Auth0:
- `admin` - Administrador con acceso completo al sistema
- `foreman` - Jefe de obra con acceso a construcción
- `user` - Usuario básico con acceso de solo lectura

---

## 🎯 Paso 4: Usar el Panel de Administración

### Acceder al Panel

1. Inicia sesión como usuario con rol `admin`
2. Ve a `/admin/users`
3. Verás la lista de usuarios

### Funcionalidades Disponibles

#### 1. Sincronizar Roles
- Click en **"Sincronizar Roles a Auth0"**
- Crea los roles de Supabase en Auth0 si no existen

#### 2. Crear Usuario
- Click en **"Crear Usuario"**
- Completa el formulario:
  - Email (requerido)
  - Nombre
  - Contraseña (opcional, se genera automática si se deja vacío)
  - Rol (admin, foreman, user)
- El usuario se crea en Auth0 y Supabase automáticamente

#### 3. Editar Usuario
- Click en el icono de editar (✏️) junto al usuario
- Actualiza email, nombre o rol
- Los cambios se sincronizan a Auth0 y Supabase

#### 4. Eliminar Usuario
- Click en el icono de eliminar (🗑️) junto al usuario
- Confirma la eliminación
- El usuario se elimina de Auth0 y Supabase

---

## 🔍 Verificación

### Verificar Roles en Auth0

1. Ve a Auth0 Dashboard → **User Management** → **Roles**
2. Deberías ver:
   - `admin`
   - `foreman`
   - `user`

### Verificar Usuarios Creados

1. Ve a Auth0 Dashboard → **User Management** → **Users**
2. Los usuarios creados desde el panel deberían aparecer aquí
3. Verifica que tengan los roles asignados correctamente

### Verificar en Supabase

```sql
-- Ver usuarios y roles
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC;
```

---

## 🚨 Troubleshooting

### Error: "Failed to get Auth0 Management token"

**Causa:** Credenciales incorrectas o aplicación no autorizada.

**Solución:**
1. Verifica que `AUTH0_MANAGEMENT_CLIENT_ID` y `AUTH0_MANAGEMENT_CLIENT_SECRET` sean correctos
2. Verifica que la aplicación Machine to Machine esté autorizada para Auth0 Management API
3. Verifica que los scopes estén seleccionados

### Error: "Forbidden: Admin access required"

**Causa:** El usuario no tiene rol `admin` en Supabase.

**Solución:**
1. Asigna el rol `admin` al usuario en Supabase:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('user-id', 'admin');
   ```

### Error: "Role not found in Auth0"

**Causa:** Los roles no se han sincronizado a Auth0.

**Solución:**
1. Ejecuta `npm run sync:roles-to-auth0`
2. O usa el botón "Sincronizar Roles a Auth0" en el panel admin

### Usuario creado en Auth0 pero no en Supabase

**Causa:** Error al crear usuario en Supabase.

**Solución:**
1. Verifica los logs del servidor
2. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado
3. El usuario puede hacer login con Auth0 y se creará automáticamente en Supabase

---

## 📚 Recursos Adicionales

- [Auth0 Management API Docs](https://auth0.com/docs/api/management/v2)
- [Auth0 Machine to Machine Apps](https://auth0.com/docs/get-started/applications/machine-to-machine-apps)
- [Auth0 Roles API](https://auth0.com/docs/api/management/v2#!/Roles)

---

## ✅ Checklist

- [ ] Machine to Machine Application creada en Auth0
- [ ] Aplicación autorizada para Auth0 Management API
- [ ] Scopes seleccionados (read:users, create:users, etc.)
- [ ] Variables de entorno configuradas
- [ ] Roles sincronizados a Auth0
- [ ] Panel de administración accesible en `/admin/users`
- [ ] Usuario admin creado y funcionando

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, podrás:
- ✅ Crear usuarios desde el panel admin
- ✅ Asignar roles automáticamente
- ✅ Gestionar usuarios vía API
- ✅ Sincronizar roles entre Supabase y Auth0








