# 📋 Lista de Usuarios y Contraseñas Temporales

## 🔐 Contraseña Temporal para Todos los Usuarios

**Contraseña:** `TempPassword123!`

> ⚠️ **IMPORTANTE:** Todos los usuarios deben cambiar su contraseña al iniciar sesión por primera vez usando la opción "Cambiar Contraseña" en el menú del usuario.

---

## 👷 Construction Managers (Gerentes de Construcción)

Estos usuarios tienen acceso completo a todas las propiedades y funcionalidades del sistema.

| # | Email | Nombre | Rol |
|---|-------|--------|-----|
| 1 | `david.bayarri@prophero.com` | David Bayarri | `construction_manager` |
| 2 | `manuel.gomez@prophero.com` | Manuel Gomez | `construction_manager` |
| 3 | `angel.vanegas@prophero.com` | Angel Vanegas | `construction_manager` |
| 4 | `dev@vistral.com` | Dev User | `construction_manager` |

---

## 🔨 Foreman (Jefes de Obra)

Estos usuarios solo pueden ver las propiedades asignadas a ellos en el campo "Technical construction" de Airtable.

| # | Email | Nombre (Airtable) | Rol |
|---|-------|-------------------|-----|
| 1 | `raul.pedros@prophero.com` | Raúl | `foreman` |
| 2 | `miguel.pertusa@prophero.com` | Miguel Pertusa | `foreman` |
| 3 | `elier.claudio@prophero.com` | Elier Claudio | `foreman` |
| 4 | `victor.maestre@prophero.com` | Victor Maestre | `foreman` |
| 5 | `tania.jimenez@prophero.com` | Renée Jimenez | `foreman` |
| 6 | `jonnathan.pomares@prophero.com` | Jonnathan | `foreman` |

---

## 📝 Resumen

- **Total de usuarios:** 10
- **Construction Managers:** 4
- **Foreman:** 6
- **Contraseña temporal:** `TempPassword123!`

---

## 🔄 Cómo Cambiar la Contraseña

1. Iniciar sesión con el email y la contraseña temporal
2. Hacer clic en el avatar del usuario en el sidebar (esquina inferior izquierda)
3. Seleccionar "Cambiar Contraseña" del menú
4. Ingresar:
   - Contraseña actual: `TempPassword123!`
   - Nueva contraseña (mínimo 6 caracteres)
   - Confirmar nueva contraseña
5. Hacer clic en "Actualizar Contraseña"

---

## ⚙️ Notas Técnicas

- Los usuarios están creados tanto en **Supabase** como en **Auth0** (si está configurado)
- Los roles están sincronizados entre ambos sistemas
- La contraseña temporal es la misma para todos los usuarios por seguridad y facilidad de distribución
- Los usuarios pueden cambiar su contraseña desde el menú del usuario una vez que hayan iniciado sesión

---

## 🚀 Crear Nuevos Usuarios

Para crear nuevos usuarios, ejecutar:

```bash
npm run create:users
```

O usar el panel de administración en `/admin/users` (solo para `construction_manager` y `admin`).

---

**Última actualización:** $(date)

