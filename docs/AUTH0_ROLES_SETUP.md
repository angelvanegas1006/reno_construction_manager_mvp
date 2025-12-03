# 🔐 Configuración de Roles en Auth0

Esta guía te ayudará a configurar roles en Auth0 y sincronizarlos automáticamente con Supabase.

---

## 📋 Paso 1: Crear Roles en Auth0

### 1.1 Acceder a Roles

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Navega a **User Management** → **Roles**
3. Click en **"Create Role"**

### 1.2 Crear los Roles Necesarios

Crea los siguientes roles (uno por uno):

#### Role 1: `admin`
- **Name**: `admin`
- **Description**: `Administrador con acceso completo al sistema`

#### Role 2: `foreman`
- **Name**: `foreman`
- **Description**: `Jefe de obra con acceso a construcción`

#### Role 3: `user`
- **Name**: `user`
- **Description**: `Usuario básico con acceso de solo lectura`

---

## 👥 Paso 2: Asignar Roles a Usuarios

### Opción A: Asignar Manualmente desde Dashboard

1. Ve a **User Management** → **Users**
2. Selecciona el usuario al que quieres asignar un rol
3. Ve a la pestaña **"Roles"**
4. Click en **"Assign Roles"**
5. Selecciona el rol (ej: `foreman`)
6. Click **"Assign"**

### Opción B: Asignar mediante API (Programático)

```bash
# Obtener Access Token de Auth0 Management API
curl --request POST \
  --url 'https://TU-DOMAIN.auth0.com/oauth/token' \
  --header 'content-type: application/json' \
  --data '{
    "client_id": "TU_CLIENT_ID",
    "client_secret": "TU_CLIENT_SECRET",
    "audience": "https://TU-DOMAIN.auth0.com/api/v2/",
    "grant_type": "client_credentials"
  }'

# Asignar rol a usuario
curl --request POST \
  --url 'https://TU-DOMAIN.auth0.com/api/v2/users/USER_ID/roles' \
  --header 'authorization: Bearer ACCESS_TOKEN' \
  --header 'content-type: application/json' \
  --data '{"roles": ["ROLE_ID"]}'
```

---

## ⚙️ Paso 3: Configurar Auth0 Action para Sincronizar Roles

### 3.1 Crear Action en Auth0

1. Ve a **Actions** → **Flows** → **Login**
2. Click en el icono **"+"** (Add Custom Action)
3. Click en **"Build Custom"**
4. Nombre: `Sync Role to Token and Metadata`

### 3.2 Código del Action

Pega el siguiente código en el editor:

```javascript
/**
 * Handler que se ejecuta después del login exitoso
 * Sincroniza roles a los tokens y metadata del usuario
 */
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://vistral.io';
  
  // Obtener roles del usuario
  const roles = event.authorization?.roles || [];
  
  // Si el usuario tiene roles, agregarlos al token
  if (roles.length > 0) {
    // Agregar roles al ID token y access token
    api.idToken.setCustomClaim(`${namespace}/roles`, roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
    
    // También guardar el primer rol en app_metadata para fácil acceso
    const primaryRole = roles[0];
    api.user.setAppMetadata('role', primaryRole);
    api.user.setAppMetadata('roles', roles);
  } else {
    // Si no tiene roles, asignar rol por defecto 'user'
    api.idToken.setCustomClaim(`${namespace}/roles`, ['user']);
    api.accessToken.setCustomClaim(`${namespace}/roles`, ['user']);
    api.user.setAppMetadata('role', 'user');
    api.user.setAppMetadata('roles', ['user']);
  }
};
```

### 3.3 Aplicar Action al Flow

1. Después de crear el Action, arrástralo al **Login Flow**
2. Colócalo después del paso **"Login"**
3. Click en **"Apply"**

---

## 🔄 Paso 4: Configurar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators-dev.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=tu-client-id
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io
NEXT_PUBLIC_AUTH0_AUDIENCE=tu-api-audience (opcional)
```

---

## ✅ Paso 5: Verificar la Configuración

### 5.1 Probar Login con Auth0

1. Ve a `http://localhost:3000/login`
2. Click en **"Continuar con Auth0"**
3. Inicia sesión con un usuario que tenga un rol asignado
4. Verifica en DevTools → Application → Cookies que la sesión se creó

### 5.2 Verificar Sincronización de Roles

Después del login, verifica en Supabase:

```sql
-- Ver roles sincronizados
SELECT 
  u.email,
  ur.role,
  ur.updated_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.updated_at DESC;
```

### 5.3 Verificar en la Aplicación

1. Abre DevTools → Console
2. Busca logs que digan:
   - `[useAuth0Role] ✅ Role from Auth0: ...`
   - `[syncAuth0RoleToSupabase] ✅ Role synced: ...`

---

## 🔍 Troubleshooting

### Problema: Roles no aparecen en el token

**Solución:**
1. Verifica que el Action esté aplicado al Login Flow
2. Verifica que el namespace coincida: `https://vistral.io`
3. Verifica que el usuario tenga roles asignados en Auth0

### Problema: Rol no se sincroniza a Supabase

**Solución:**
1. Verifica que la tabla `user_roles` exista en Supabase
2. Verifica los logs del callback: `[Auth0 Callback]`
3. Verifica que el usuario tenga permisos para insertar en `user_roles`

### Problema: Usuario tiene múltiples roles

**Solución:**
- El sistema toma el **primer rol** del array de roles de Auth0
- Si necesitas lógica más compleja, modifica `mapAuth0RoleToAppRole` en `lib/auth/auth0-role-sync.ts`

---

## 📚 Recursos Adicionales

- [Auth0 Roles Documentation](https://auth0.com/docs/manage-users/access-control/rbac)
- [Auth0 Actions Documentation](https://auth0.com/docs/customize/actions)
- [Supabase Auth0 Integration](https://supabase.com/docs/guides/auth/third-party/auth0)

---

## ✅ Checklist

- [ ] Roles creados en Auth0 (`admin`, `foreman`, `user`)
- [ ] Roles asignados a usuarios en Auth0
- [ ] Action creado y aplicado al Login Flow
- [ ] Variables de entorno configuradas
- [ ] Login probado y funcionando
- [ ] Roles sincronizados a Supabase verificados

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, los roles de Auth0 se sincronizarán automáticamente con Supabase cada vez que un usuario inicie sesión.








