# 📋 Instrucciones para Crear Pull Request a `dev` de Angel

## ✅ Estado Actual

- ✅ **Commit creado**: `18bbf30` - "feat: Construction Manager - Integraciones Airtable, categorías dinámicas, galería de imágenes y sistema de filtros"
- ✅ **Rama actual**: `develop`
- ✅ **Archivos listos**: 43 archivos modificados/creados
- ✅ **Documentación**: `PR_DESCRIPTION.md` y `PR_CHANGES_SUMMARY.md` creados

---

## 🚀 Pasos para Crear el Pull Request

### 1️⃣ Hacer Push a tu Fork

Ejecuta en tu terminal:

```bash
git push origin develop
```

**Si pide credenciales:**
- **Username**: tu-usuario-de-github
- **Password**: tu-personal-access-token (NO tu contraseña)

> 💡 Si no tienes un Personal Access Token:
> 1. Ve a: https://github.com/settings/tokens
> 2. Click en "Generate new token (classic)"
> 3. Selecciona permisos: `repo` (full control)
> 4. Copia el token y úsalo como password

### 2️⃣ Crear Pull Request en GitHub

#### Opción A: Enlace Directo (más rápido)
```
https://github.com/angelvanegas1006/reno_construction_manager_mvp/compare/dev...manuelPH:reno_construction_manager_mvp:develop
```

#### Opción B: Manualmente
1. Ve a: https://github.com/angelvanegas1006/reno_construction_manager_mvp
2. Click en **"Pull requests"** → **"New pull request"**
3. Selecciona:
   - **Base repository**: `angelvanegas1006/reno_construction_manager_mvp`
   - **Base**: `dev` ⬅️ **IMPORTANTE: Seleccionar `dev`, NO `main`**
   - **Head repository**: `manuelPH/reno_construction_manager_mvp`
   - **Compare**: `develop`

### 3️⃣ Título del PR

```
feat: Construction Manager - Integraciones Airtable, categorías dinámicas, galería de imágenes y sistema de filtros
```

### 4️⃣ Descripción del PR

Copia y pega el contenido completo del archivo `PR_DESCRIPTION.md` que está en el repositorio, o usa esta versión resumida:

```markdown
# 🚀 Pull Request: Mejoras Construction Manager

## 📋 Descripción General

Este PR incluye mejoras significativas al módulo de Construction Manager, agregando integraciones con Airtable para nuevas fases del Kanban, sistema de categorías dinámicas, galería de imágenes, sistema de filtros y mejoras en la sincronización de datos.

## ✨ Principales Cambios

### 1. Integración de Nuevas Fases del Kanban con Airtable
- ✅ **Reno In Progress**: Sincronización completa con view `viwQUOrLzUrScuU4k`
- ✅ **Furnishing & Cleaning**: Nueva fase sincronizada con view `viw9NDUaeGIQDvugU`
- ✅ **Final Check**: Nueva fase sincronizada con view `viwnDG5TY6wjZhBL2`

### 2. Sistema de Categorías Dinámicas
- ✅ Nueva tabla `property_dynamic_categories` en Supabase
- ✅ Componente `DynamicCategoriesProgress` para visualizar y actualizar progreso
- ✅ Integración automática con webhook de n8n para extracción de categorías desde PDFs
- ✅ Ordenamiento numérico y formateo mejorado de actividades

### 3. Galería de Imágenes de Propiedades
- ✅ Nuevo campo `pics_urls` (TEXT[]) en tabla `properties`
- ✅ Sincronización desde Airtable (field ID: `fldq1FLXBToYEY9W3`)
- ✅ Componente de galería con layout específico y modal full-screen
- ✅ Lógica inteligente: actualiza en primera fase, inserta en otras

### 4. Sistema de Filtros en Kanban
- ✅ Filtros múltiples por: Renovator name, Technical construction, Area cluster
- ✅ Lógica OR entre filtros
- ✅ Badge visual con número de filtros activos
- ✅ Dialog/Modal para selección de filtros

### 5. Mejoras Visuales
- ✅ Colorización de tipos de renovación (Light/Medium/Major Reno) con tonos de Vistral blue
- ✅ Mejoras en UI de galería de imágenes

## 🗄️ Migraciones de Base de Datos Requeridas

**⚠️ IMPORTANTE**: Antes de hacer merge, ejecutar estas migraciones en Supabase:

1. **`009_create_property_dynamic_categories.sql`**
   - Crea tabla para categorías dinámicas

2. **`010_fix_next_reno_steps_index.sql`**
   - Elimina índice problemático en `next_reno_steps`

3. **`011_add_pics_urls_to_properties.sql`**
   - Agrega campo `pics_urls` a tabla `properties`

## 🔧 Variables de Entorno

Asegurarse de tener configuradas:
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_AIRTABLE_API_KEY=
NEXT_PUBLIC_AIRTABLE_BASE_ID=
```

## 📦 Nuevos Scripts NPM

```bash
# Sincronizaciones
npm run sync:furnishing-cleaning
npm run sync:final-check
npm run sync:all-pics-urls

# Verificaciones
npm run check:technical-construction
npm run check:pics-urls
npm run verify:technical-construction
```

## ⚠️ Notas Importantes

1. **Technical Constructor**: El campo no se encuentra actualmente en la tabla Properties de Airtable. Se requiere investigación adicional para ubicarlo correctamente.

2. **Webhook n8n**: Configurado para llamarse automáticamente cuando una propiedad en "reno-in-progress" tiene `budget_pdf_url` pero no tiene categorías.

3. **pics_urls**: Solo se actualiza en la fase `upcoming-settlements`. En otras fases solo se inserta si no existe.

## 📁 Archivos Principales Modificados

- `lib/airtable/sync-from-airtable.ts` - Lógica principal de sincronización
- `components/reno/dynamic-categories-progress.tsx` - Componente de categorías
- `components/reno/property-summary-tab.tsx` - Galería de imágenes
- `components/reno/reno-kanban-filters.tsx` - Sistema de filtros
- `app/reno/construction-manager/kanban/page.tsx` - Integración de filtros

## 📝 Checklist para Review

- [ ] Migraciones ejecutadas en Supabase
- [ ] Variables de entorno configuradas
- [ ] Sincronizaciones probadas
- [ ] Componentes visuales verificados
- [ ] Filtros funcionando correctamente
- [ ] Webhook n8n configurado y probado

**Branch**: `develop` → `upstream/dev`  
**Autor**: Manuel  
**Fecha**: 2025-01-XX
```

---

## 📊 Resumen de Cambios

- **43 archivos modificados/creados**
- **3 nuevas fases del Kanban integradas con Airtable**
- **Sistema de categorías dinámicas completo**
- **Galería de imágenes implementada**
- **Sistema de filtros funcional**
- **3 migraciones de base de datos**
- **8+ nuevos scripts de sincronización y verificación**

---

## 📚 Documentación Incluida

- `PR_DESCRIPTION.md` - Descripción completa del PR
- `PR_CHANGES_SUMMARY.md` - Resumen detallado de todos los cambios
- `docs/AUTOMATIC_WEBHOOK_CALL.md` - Documentación del webhook automático
- `docs/N8N_INSERT_CATEGORIES.md` - Guía para insertar categorías desde n8n
- `docs/N8N_FIX_401_ERROR.md` - Solución de errores 401/400
- `docs/EXECUTE_MIGRATION_011.md` - Instrucciones para migración de pics_urls

---

## ✅ Checklist Final

Antes de crear el PR, verifica:

- [x] Commit creado con todos los cambios
- [ ] Push realizado a `origin develop`
- [ ] PR creado apuntando a `upstream/dev`
- [ ] Descripción del PR completa
- [ ] Migraciones documentadas
- [ ] Scripts probados

---

💡 **Nota**: Una vez creado el PR, Angel podrá revisar los cambios y hacer merge cuando esté listo. Todas las migraciones deben ejecutarse en Supabase antes del merge.





