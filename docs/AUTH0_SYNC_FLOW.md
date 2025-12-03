# 🔄 Flujo de Sincronización: Auth0 ↔ Supabase

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                   1. Usuario hace Login con Auth0               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Auth0 Action (Post-Login) ejecuta automáticamente           │
│     - Agrega roles al ID Token                                   │
│     - Agrega roles al Access Token                               │
│     - Guarda roles en app_metadata del usuario                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Redirect a /auth/callback con código de Auth0              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Supabase intercambia código por sesión                       │
│     - Crea/actualiza usuario en auth.users                       │
│     - Almacena metadatos de Auth0 en app_metadata               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Callback extrae roles de app_metadata                        │
│     - Busca en app_metadata.roles                               │
│     - Busca en app_metadata.role                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. syncAuth0RoleToSupabase() ejecuta                           │
│     - Mapea rol de Auth0 a rol de la app                        │
│     - Hace UPSERT en tabla user_roles                           │
│       INSERT/UPDATE user_roles SET role = 'foreman'              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Rol sincronizado en Supabase                                │
│     - Tabla user_roles tiene el rol actualizado                 │
│     - La app puede leer el rol desde Supabase                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Puntos Clave de Sincronización

### Punto 1: Durante el Login (Callback)

**Archivo:** `app/auth/callback/route.ts`

```typescript
// Después de que Supabase intercambia el código
const { data } = await supabase.auth.exchangeCodeForSession(code);

// Los metadatos de Auth0 están aquí:
const appMetadata = data.user.app_metadata || {};
const auth0Roles = appMetadata.roles || appMetadata.role;

// Sincronizar a Supabase
await syncAuth0RoleToSupabase(
  data.user.id,
  auth0Roles,
  { role: appMetadata.role }
);
```

**¿Cuándo se ejecuta?**
- Cada vez que un usuario hace login con Auth0
- Automáticamente después del redirect de Auth0

---

### Punto 2: Durante el Uso de la App (Hook)

**Archivo:** `hooks/useAuth0Role.ts`

```typescript
// Cuando el componente se monta o el usuario cambia
const { role } = useAuth0Role();

// El hook:
// 1. Intenta obtener rol del token de Auth0
// 2. Si encuentra rol, lo sincroniza a Supabase
// 3. Si no encuentra, usa Supabase como fallback
```

**¿Cuándo se ejecuta?**
- Cuando un componente usa `useAuth0Role()`
- Se ejecuta automáticamente cuando el usuario está autenticado
- Sincroniza si detecta un cambio de rol en Auth0

---

## 📝 Cómo Funciona la Sincronización

### Paso 1: Auth0 Action (Configuración Manual)

**Necesitas crear esto en Auth0 Dashboard:**

```javascript
// Auth0 Action: Post-Login
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://vistral.io';
  const roles = event.authorization?.roles || [];
  
  if (roles.length > 0) {
    // Agregar al token
    api.idToken.setCustomClaim(`${namespace}/roles`, roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
    
    // Guardar en metadata (para que Supabase lo reciba)
    api.user.setAppMetadata('roles', roles);
    api.user.setAppMetadata('role', roles[0]); // Primer rol
  }
};
```

**¿Qué hace esto?**
- Toma los roles asignados al usuario en Auth0
- Los agrega al token JWT
- Los guarda en `app_metadata` del usuario
- Supabase recibe estos metadatos cuando intercambia el código

---

### Paso 2: Supabase Recibe los Metadatos

Cuando Supabase hace `exchangeCodeForSession(code)`, Auth0 devuelve:

```json
{
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@example.com",
    "app_metadata": {
      "roles": ["foreman"],
      "role": "foreman",
      "provider": "auth0"
    }
  }
}
```

**Estos metadatos vienen directamente de Auth0** gracias al Action que configuramos.

---

### Paso 3: Sincronización a Tabla `user_roles`

**Función:** `syncAuth0RoleToSupabase()`

```typescript
// Mapea rol de Auth0 a rol de la app
const mappedRole = mapAuth0RoleToAppRole(auth0Role); // 'foreman' → 'foreman'

// UPSERT en Supabase
await supabase
  .from('user_roles')
  .upsert({
    user_id: supabaseUserId,
    role: mappedRole,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id', // Si existe, actualiza; si no, inserta
  });
```

**¿Qué hace esto?**
- Toma el rol de Auth0 (de `app_metadata`)
- Lo mapea al formato de la app (`admin`, `foreman`, `user`)
- Hace `UPSERT` en la tabla `user_roles` de Supabase
- Si el usuario ya tiene un rol, lo actualiza
- Si no tiene rol, lo crea

---

## 🔄 Sincronización Bidireccional (Futuro)

Actualmente la sincronización es **unidireccional**: Auth0 → Supabase

**Futuro:** Podríamos hacer bidireccional:

```
Auth0 ←→ Supabase
```

**Cómo funcionaría:**
1. Cambio en Auth0 → Se sincroniza a Supabase (ya implementado)
2. Cambio en Supabase → Se sincroniza a Auth0 (pendiente)

**Para implementar bidireccional:**
- Crear API endpoint que Auth0 pueda llamar (webhook)
- O crear función que actualice Auth0 cuando cambies rol en Supabase

---

## ✅ Verificación de Sincronización

### Verificar en Supabase:

```sql
-- Ver todos los roles sincronizados
SELECT 
  u.email,
  ur.role,
  ur.updated_at,
  u.app_metadata->>'role' as auth0_role,
  u.app_metadata->>'roles' as auth0_roles
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.updated_at DESC;
```

### Verificar en la App:

```typescript
// En cualquier componente
const { role, isFromAuth0 } = useAuth0Role();

console.log('Role:', role); // 'foreman'
console.log('From Auth0:', isFromAuth0); // true o false
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Roles no aparecen en `app_metadata`

**Causa:** El Auth0 Action no está configurado o no está aplicado al Login Flow.

**Solución:**
1. Ve a Auth0 Dashboard → Actions → Flows → Login
2. Verifica que el Action esté aplicado
3. Verifica que el código del Action guarde en `app_metadata`

### Problema 2: Sincronización no funciona

**Causa:** El callback no está extrayendo correctamente los roles.

**Solución:**
1. Revisa los logs del callback: `[Auth0 Callback] Auth0 metadata:`
2. Verifica que `app_metadata.roles` o `app_metadata.role` existan
3. Verifica que `syncAuth0RoleToSupabase()` se esté llamando

### Problema 3: Rol no se actualiza después de cambiar en Auth0

**Causa:** El usuario necesita hacer login de nuevo para sincronizar.

**Solución:**
- La sincronización ocurre automáticamente en el próximo login
- O puedes forzar sincronización llamando manualmente a `syncAuth0RoleToSupabase()`

---

## 📊 Resumen

| Momento | Dónde | Qué hace |
|---------|-------|----------|
| **Login** | Auth0 Action | Agrega roles al token y metadata |
| **Callback** | `app/auth/callback/route.ts` | Extrae roles y sincroniza a Supabase |
| **Uso de App** | `hooks/useAuth0Role.ts` | Lee rol de Auth0 o Supabase, sincroniza si es necesario |

**Resultado:** Los roles de Auth0 se sincronizan automáticamente a Supabase cada vez que un usuario hace login.








