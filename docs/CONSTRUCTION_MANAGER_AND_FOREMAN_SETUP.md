# 🏗️ Configuración de Construction Manager y Foreman

## 📋 Resumen

Se ha implementado un sistema de roles y filtrado para Construction Managers y Foreman:

- **Construction Manager**: Rol que ve todas las propiedades y puede filtrar por foreman
- **Foreman**: Rol que solo ve propiedades asignadas a ellos según el campo "Technical construction"

---

## 🔧 Pasos de Configuración

### 1. Ejecutar Migración SQL

Ejecuta la migración para agregar el rol `construction_manager`:

```sql
-- Archivo: supabase/migrations/013_add_construction_manager_role.sql
-- Ejecutar en Supabase Dashboard → SQL Editor
```

Esta migración:
- Agrega `construction_manager` al enum `app_role`
- Actualiza el constraint CHECK en la tabla `user_roles`

### 2. Crear Usuarios Iniciales

Ejecuta el script para crear los usuarios:

```bash
npm run create:users
```

Este script crea:

**Construction Managers (3 usuarios):**
- david.bayarri@prophero.com
- manuel.gomez@prophero.com
- angel.vanegas@prophero.com

**Foreman (6 usuarios):**
- raul.pedros@prophero.com (mapea a "Raúl", "Raúl Pérez")
- miguel.pertusa@prophero.com (mapea a "Miguel Pertusa")
- elier.claudio@prophero.com (mapea a "Elier Claudio")
- victor.maestre@prophero.com (mapea a "Victor Maestre")
- tania.jimenez@prophero.com (mapea a "Renée Jimenez", "Renee Jimenez", "Tania Jimenez")
- jonnathan.pomares@prophero.com (mapea a "Jonnathan", "Jonnathan Pomares")

**Password temporal:** `TempPassword123!`

Los usuarios deberán cambiar su password al iniciar sesión por primera vez.

### 3. Sincronizar Roles a Auth0

Asegúrate de que los roles existan en Auth0:

```bash
npm run sync:roles-to-auth0
```

Esto crea los roles `admin`, `construction_manager`, `foreman`, y `user` en Auth0 si no existen.

---

## 🎯 Funcionalidades Implementadas

### Construction Manager

- ✅ Ve todas las propiedades sin filtro
- ✅ Puede filtrar por foreman usando el combobox en la home
- ✅ El filtro afecta todos los widgets de la home (tareas, calendario, propiedades recientes, portfolio)
- ✅ Puede crear usuarios desde el panel de admin (`/admin/users`)
- ✅ Puede ver y gestionar usuarios

### Foreman

- ✅ Solo ve propiedades donde el campo "Technical construction" coincide con su nombre/email
- ✅ Matching parcial: "Raúl" matchea con "Raúl Pérez"
- ✅ Si no hay match, se asigna a Raúl por defecto (durante sincronización)

### Panel de Admin

- ✅ Accesible para `admin` y `construction_manager`
- ✅ Formulario para crear usuarios (nombre, email, rol)
- ✅ Lista de usuarios con filtros y búsqueda
- ✅ Indicador de conexión a Google Calendar
- ✅ Edición y eliminación de usuarios

---

## 🔍 Mapeo de Nombres

El sistema usa matching parcial para mapear nombres de Airtable a emails de foreman:

**Archivo:** `lib/supabase/user-name-utils.ts`

**Mapeo principal:**
- "Raúl" → raul.pedros@prophero.com
- "Raúl Pérez" → raul.pedros@prophero.com
- "Miguel Pertusa" → miguel.pertusa@prophero.com
- "Elier Claudio" → elier.claudio@prophero.com
- "Victor Maestre" → victor.maestre@prophero.com
- "Renée Jimenez" → tania.jimenez@prophero.com
- "Jonnathan" → jonnathan.pomares@prophero.com

**Matching parcial:**
- Si el campo "Technical construction" contiene "Raúl", matchea con raul.pedros@prophero.com
- Si contiene "Miguel Pertusa", matchea con miguel.pertusa@prophero.com
- Funciona con variaciones de nombres (ej: "Raúl" vs "Raúl Pérez")

---

## 📁 Archivos Modificados/Creados

### Nuevos Archivos

- `supabase/migrations/013_add_construction_manager_role.sql` - Migración SQL
- `scripts/create-initial-users.ts` - Script para crear usuarios
- `components/reno/foreman-filter-combobox.tsx` - Componente de filtro
- `docs/CONSTRUCTION_MANAGER_AND_FOREMAN_SETUP.md` - Esta documentación

### Archivos Modificados

- `lib/supabase/user-name-utils.ts` - Mapeo de nombres mejorado
- `lib/supabase/types.ts` - Tipo `app_role` actualizado
- `lib/auth/auth0-role-sync.ts` - Mapeo de roles actualizado
- `lib/auth0/management-client.ts` - Roles actualizados
- `hooks/useSupabaseKanbanProperties.ts` - Filtrado por rol
- `app/reno/construction-manager/page.tsx` - Filtro de foreman
- `app/admin/users/page.tsx` - Panel de admin actualizado
- `app/api/admin/users/route.ts` - Permisos actualizados
- `package.json` - Script `create:users` agregado

---

## 🚀 Uso

### Para Construction Managers

1. Inicia sesión con tu email (david.bayarri@prophero.com, manuel.gomez@prophero.com, o angel.vanegas@prophero.com)
2. En la home, verás un combobox para filtrar por foreman
3. Selecciona uno o más foreman para filtrar las propiedades
4. Todos los widgets se actualizarán automáticamente

### Para Foreman

1. Inicia sesión con tu email (ej: raul.pedros@prophero.com)
2. Solo verás propiedades donde "Technical construction" coincide con tu nombre
3. No verás el filtro de foreman (solo para construction_manager)

### Crear Nuevos Usuarios

1. Ve a `/admin/users` (solo para admin o construction_manager)
2. Click en "Crear Usuario"
3. Completa el formulario (nombre, email, rol)
4. El usuario se crea en Auth0 y Supabase automáticamente

---

## ⚠️ Notas Importantes

1. **Password Temporal**: Todos los usuarios creados tienen password `TempPassword123!`. Deben cambiarlo al iniciar sesión.

2. **Matching Parcial**: El sistema usa matching parcial para nombres. Si un nombre no matchea exactamente, se intenta con coincidencias parciales.

3. **Asignación por Defecto**: Si una propiedad tiene un "Technical construction" que no matchea con ningún foreman, se asigna a Raúl durante la sincronización.

4. **Foreman sin Propiedades**: Los foreman aparecen en el combobox aunque no tengan propiedades asignadas (muestran empty state).

5. **Sincronización**: Los roles se sincronizan automáticamente entre Auth0 y Supabase durante el login.

---

## 🔄 Próximos Pasos

1. Ejecutar migración SQL en Supabase
2. Ejecutar `npm run create:users` para crear usuarios
3. Ejecutar `npm run sync:roles-to-auth0` para sincronizar roles
4. Probar login con usuarios creados
5. Verificar que el filtro funciona correctamente

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que la migración SQL se ejecutó correctamente
2. Verifica que los usuarios se crearon en Auth0 y Supabase
3. Verifica que los roles están sincronizados
4. Revisa los logs de la consola para errores

