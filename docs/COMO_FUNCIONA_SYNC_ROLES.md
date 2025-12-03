# 🔄 Cómo Funciona la Sincronización de Roles: Auth0 ↔ Supabase

## 🎯 Respuesta Directa

Los roles se sincronizan de **Auth0 a Supabase** en **2 momentos clave**:

### 1️⃣ **Durante el Login** (Automático)
Cuando un usuario hace login con Auth0:
- Auth0 Action agrega roles al token y metadata
- Supabase recibe estos roles cuando intercambia el código
- El callback sincroniza automáticamente a la tabla `user_roles`

### 2️⃣ **Durante el Uso de la App** (Automático)
Cuando un componente usa `useAuth0Role()`:
- Intenta obtener el rol del token de Auth0
- Si encuentra un rol diferente al de Supabase, lo sincroniza
- Si no encuentra rol en Auth0, usa Supabase como fallback

---

## 📋 Flujo Detallado Paso a Paso

### Paso 1: Usuario hace Login con Auth0

```
Usuario → Click "Continuar con Auth0" → Auth0 Login Page
```

### Paso 2: Auth0 Action se Ejecuta (Post-Login)

**Esto sucede AUTOMÁTICAMENTE si configuraste el Action:**

```javascript
// Auth0 ejecuta esto después del login exitoso
exports.onExecutePostLogin = async (event, api) => {
  // Obtener roles del usuario
  const roles = event.authorization?.roles || ['user'];
  
  // Agregar al token (para que la app pueda leerlo)
  api.idToken.setCustomClaim('https://vistral.io/roles', roles);
  
  // Guardar en app_metadata (para que Supabase lo reciba)
  api.user.setAppMetadata('roles', roles);
  api.user.setAppMetadata('role', roles[0]);
};
```

**Resultado:** El usuario ahora tiene roles en:
- ✅ Token JWT (ID Token y Access Token)
- ✅ `app_metadata` del usuario en Auth0

### Paso 3: Redirect a `/auth/callback`

```
Auth0 → Redirect con código → /auth/callback?code=ABC123
```

### Paso 4: Supabase Intercambia Código por Sesión

**En el callback (`app/auth/callback/route.ts`):**

```typescript
// Supabase llama a Auth0 con el código
const { data } = await supabase.auth.exchangeCodeForSession(code);

// Auth0 devuelve información del usuario con los metadatos
// data.user.app_metadata ahora contiene:
// {
//   roles: ['foreman'],
//   role: 'foreman',
//   provider: 'auth0'
// }
```

**Importante:** Supabase recibe estos metadatos **directamente de Auth0** porque el Action los guardó en `app_metadata`.

### Paso 5: Extraer Roles de los Metadatos

```typescript
const appMetadata = data.user.app_metadata || {};
const auth0Roles = appMetadata.roles || appMetadata.role;
// auth0Roles = ['foreman'] o 'foreman'
```

### Paso 6: Sincronizar a Supabase

```typescript
// Llamar a la función de sincronización
await syncAuth0RoleToSupabase(
  data.user.id,           // ID del usuario en Supabase
  auth0Roles,            // ['foreman'] o null
  { role: 'foreman' }     // Rol individual
);
```

**Dentro de `syncAuth0RoleToSupabase()`:**

```typescript
// 1. Mapear rol de Auth0 a rol de la app
const mappedRole = mapAuth0RoleToAppRole('foreman'); // → 'foreman'

// 2. Hacer UPSERT en Supabase
await supabase
  .from('user_roles')
  .upsert({
    user_id: 'uuid-del-usuario',
    role: 'foreman',
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id', // Si existe, actualiza; si no, inserta
  });
```

**Resultado:** La tabla `user_roles` en Supabase ahora tiene:

```sql
SELECT * FROM user_roles WHERE user_id = 'uuid-del-usuario';
-- Resultado:
-- user_id: 'uuid-del-usuario'
-- role: 'foreman'
-- updated_at: '2025-01-XX...'
```

---

## 🔍 Verificación Visual

### En Supabase Dashboard:

1. Ve a **Authentication** → **Users**
2. Selecciona el usuario que hizo login con Auth0
3. Verás en **Raw App Meta Data**:
   ```json
   {
     "roles": ["foreman"],
     "role": "foreman",
     "provider": "auth0"
   }
   ```

4. Ve a **Database** → **user_roles**
5. Verás el registro:
   ```
   user_id: uuid-del-usuario
   role: foreman
   updated_at: 2025-01-XX...
   ```

### En la App (Console Logs):

Cuando un usuario hace login, verás:

```
[Auth0 Callback] Auth0 metadata: {
  appMetadata: { roles: ['foreman'], role: 'foreman' },
  auth0Roles: ['foreman'],
  auth0RoleFromMetadata: 'foreman'
}
[syncAuth0RoleToSupabase] ✅ Role synced: foreman
```

---

## 🔄 Sincronización Continua

### Cada vez que el usuario hace login:

1. ✅ Auth0 Action agrega roles al metadata
2. ✅ Supabase recibe los roles
3. ✅ Callback sincroniza a `user_roles`
4. ✅ La app lee el rol desde Supabase

### Si cambias el rol en Auth0:

1. Usuario hace login de nuevo
2. Auth0 Action agrega el nuevo rol
3. Supabase recibe el nuevo rol
4. Callback actualiza `user_roles` con el nuevo rol

**Resultado:** El rol en Supabase siempre está sincronizado con Auth0 después de cada login.

---

## 🚨 ¿Qué pasa si no hay Auth0 Action?

Si **NO** configuraste el Auth0 Action:

1. ❌ Los roles NO estarán en `app_metadata`
2. ❌ El callback NO encontrará roles de Auth0
3. ✅ Usará el rol de Supabase como fallback
4. ✅ O creará un rol por defecto 'user'

**Solución:** Configura el Auth0 Action siguiendo `docs/AUTH0_ROLES_SETUP.md`

---

## 📊 Resumen en Tabla

| Momento | Dónde está el Rol | Cómo se Sincroniza |
|---------|-------------------|-------------------|
| **En Auth0** | Asignado al usuario | Manual (Dashboard) |
| **En Token** | JWT Token | Auth0 Action lo agrega |
| **En Metadata** | `app_metadata` | Auth0 Action lo guarda |
| **En Supabase** | Tabla `user_roles` | Callback sincroniza automáticamente |
| **En la App** | Hook `useAuth0Role()` | Lee de Auth0 o Supabase |

---

## ✅ Conclusión

**Los roles se sincronizan automáticamente** de Auth0 a Supabase:

1. ✅ **Durante el login** → Callback sincroniza
2. ✅ **Durante el uso** → Hook sincroniza si detecta cambios
3. ✅ **Siempre actualizado** → Cada login sincroniza el rol más reciente

**No necesitas hacer nada manual** después de configurar el Auth0 Action. La sincronización es **completamente automática**.








