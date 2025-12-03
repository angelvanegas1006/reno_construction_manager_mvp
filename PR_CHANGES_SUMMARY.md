# 📋 Resumen de Cambios - Pull Request a `dev`

## 🎯 Objetivo
Implementación de funcionalidades para el módulo de Construction Manager, incluyendo:
- Integración de fases adicionales del Kanban con Airtable
- Sistema de categorías dinámicas para obras en proceso
- Integración con webhook de n8n para extracción de información de PDFs
- Galería de imágenes de propiedades
- Sistema de filtros en el Kanban
- Sincronización de campos adicionales desde Airtable

---

## 🚀 Funcionalidades Implementadas

### 1. **Integración de Fases del Kanban con Airtable**

#### Fase: "Reno In Progress" (Obras en Proceso)
- **View de Airtable**: `viwQUOrLzUrScuU4k`
- **Campos sincronizados**:
  - `budget_pdf_url` (Tech Budget Attachment - fldVOO4zqx5HUzIjz)
  - `reno_start_date` (Reno Start Date - fldCnB9pCmpG5khiH)
  - `estimated_end_date` (Est. Reno End Date - fldRd1iqLDAcoanAj)
  - `Set Up Status` (fldE95fZPdw45XV2J)
  - `next_reno_steps` (SetUp Team Notes - fldPJAWIuIZsS0zw7)
- **Script**: `npm run sync:reno-in-progress`

#### Fase: "Furnishing & Cleaning" (Limpieza y Amoblamiento)
- **View de Airtable**: `viw9NDUaeGIQDvugU`
- **Campos sincronizados**:
  - `Set Up Status` (Cleaning, Furnishing, o Cleaning & Furnishing)
  - `next_reno_steps`
  - `estimated_end_date`
- **Script**: `npm run sync:furnishing-cleaning`

#### Fase: "Final Check"
- **View de Airtable**: `viwnDG5TY6wjZhBL2`
- **Campos sincronizados**:
  - `Set Up Status` (Final Check)
  - `next_reno_steps`
  - `estimated_end_date`
- **Script**: `npm run sync:final-check`

### 2. **Sistema de Categorías Dinámicas**

#### Tabla en Supabase: `property_dynamic_categories`
- **Migración**: `supabase/migrations/009_create_property_dynamic_categories.sql`
- **Campos**:
  - `id` (UUID, primary key)
  - `property_id` (VARCHAR, foreign key a properties)
  - `category_name` (TEXT)
  - `activities_text` (TEXT)
  - `percentage` (INTEGER, 0-100)
  - `created_at`, `updated_at`

#### Componente: `DynamicCategoriesProgress`
- **Ubicación**: `components/reno/dynamic-categories-progress.tsx`
- **Funcionalidades**:
  - Muestra progreso de categorías de renovación
  - Permite actualización manual de porcentajes
  - Ordena categorías numéricamente (1, 2, 3...)
  - Formatea texto de actividades (divide por números de actividad: 8.1, 8.2, etc.)
  - Integrado en la pestaña "Tareas" cuando la propiedad está en fase "reno-in-progress"

#### Integración con n8n
- **Webhook**: `https://n8n.prod.prophero.com/webhook/send_categories_cursor`
- **Trigger automático**: Cuando una propiedad en "reno-in-progress" tiene `budget_pdf_url` pero no tiene categorías
- **Payload enviado**:
  ```json
  {
    "budget_pdf_url": "...",
    "property_id": "...",
    "unique_id": "...",
    "property_name": "...",
    "address": "...",
    "client_name": "...",
    "client_email": "...",
    "renovation_type": "...",
    "area_cluster": "..."
  }
  ```
- **Archivo**: `lib/n8n/webhook-caller.ts`

### 3. **Galería de Imágenes de Propiedades**

#### Campo en Supabase: `pics_urls`
- **Tipo**: `TEXT[]` (array de URLs)
- **Migración**: `supabase/migrations/011_add_pics_urls_to_properties.sql`
- **Field ID en Airtable**: `fldq1FLXBToYEY9W3` (tabla Properties)
- **Lógica de sincronización**:
  - En fase `upcoming-settlements`: se actualiza si cambia
  - En otras fases: solo se inserta si no existe (no se sobrescribe)

#### Componente: `PropertySummaryTab`
- **Ubicación**: `components/reno/property-summary-tab.tsx`
- **Funcionalidades**:
  - Galería con layout específico:
    - Imagen principal grande (izquierda, 2 columnas)
    - Miniatura de la segunda imagen (arriba derecha, 1 columna)
    - Botón "Ver todas" (abajo derecha, 1 columna)
  - Modal full-screen para ver todas las imágenes
  - Navegación con flechas y contador
  - Manejo de errores de carga de imágenes

#### Script de sincronización
- **Script**: `npm run sync:all-pics-urls`
- Sincroniza `pics_urls` de todas las propiedades existentes desde Airtable

### 4. **Sistema de Filtros en Kanban**

#### Componente: `RenoKanbanFilters`
- **Ubicación**: `components/reno/reno-kanban-filters.tsx`
- **Filtros disponibles**:
  - **Renovator name**: Filtro múltiple por nombre de renovador
  - **Technical construction**: Filtro múltiple por constructor técnico
  - **Area cluster**: Filtro múltiple por área/clúster
- **Características**:
  - Select múltiple con checkboxes
  - Lógica OR entre filtros (cualquiera de los seleccionados)
  - Badge en el botón de filtros mostrando número de filtros activos
  - Solo durante la sesión (no persiste en localStorage)
  - Dialog/Modal para selección de filtros

#### Integración
- **Header**: `components/layout/navbar-l1.tsx` - Badge con contador de filtros
- **Board**: `components/reno/reno-kanban-board.tsx` - Aplicación de filtros con lógica OR
- **Página**: `app/reno/construction-manager/kanban/page.tsx` - Estado y manejo de filtros

### 5. **Colorización de Tipos de Renovación**

#### Componente: `RenoPropertyCard`
- **Ubicación**: `components/reno/reno-property-card.tsx`
- **Funcionalidad**: Badge de tipo de renovación con colores basados en Vistral blue
  - **Light Reno**: Azul más claro (`blue-50`/`blue-950`)
  - **Medium Reno**: Azul medio (`blue-100`/`blue-900`)
  - **Major Reno**: Azul más oscuro (`blue-200`/`blue-800`)

### 6. **Mejoras en Sincronización Airtable → Supabase**

#### Mejoras implementadas:
- Mapeo correcto de `budget_pdf_url` desde campo "TECH - Budget Attachment (URLs)"
- Obtención de `pics_urls` desde tabla Properties (field ID: fldq1FLXBToYEY9W3)
- Lógica condicional para `pics_urls` (solo actualizar en primera fase, insertar en otras)
- Manejo de campos relacionados desde tablas Properties, Engagements, Team Profiles
- Logging mejorado para debugging

#### Archivos modificados:
- `lib/airtable/sync-from-airtable.ts`: Lógica principal de sincronización
- `lib/airtable/sync-reno-in-progress.ts`: Sincronización específica + webhook automático
- `lib/airtable/sync-furnishing-cleaning.ts`: Nueva sincronización
- `lib/airtable/sync-final-check.ts`: Nueva sincronización
- `lib/airtable/sync-upcoming-settlements.ts`: Actualizado para `pics_urls`

---

## 📁 Archivos Nuevos Creados

### Componentes
- `components/reno/dynamic-categories-progress.tsx`
- `components/reno/reno-kanban-filters.tsx`

### Librerías
- `lib/n8n/webhook-caller.ts`
- `lib/airtable/sync-furnishing-cleaning.ts`
- `lib/airtable/sync-final-check.ts`

### Scripts
- `scripts/sync-furnishing-cleaning.ts`
- `scripts/sync-final-check.ts`
- `scripts/sync-all-pics-urls.ts`
- `scripts/check-technical-construction.ts`
- `scripts/update-technical-construction.ts`
- `scripts/verify-technical-construction.ts`
- `scripts/debug-airtable-technical-constructor.ts`
- `scripts/debug-transactions-technical.ts`

### Migraciones Supabase
- `supabase/migrations/009_create_property_dynamic_categories.sql`
- `supabase/migrations/010_fix_next_reno_steps_index.sql` (fix para índice B-tree)
- `supabase/migrations/011_add_pics_urls_to_properties.sql`

### Documentación
- `docs/N8N_INSERT_CATEGORIES.md`
- `docs/N8N_FIX_401_ERROR.md`
- `docs/AUTOMATIC_WEBHOOK_CALL.md`

---

## 📝 Archivos Modificados

### Componentes
- `components/reno/property-summary-tab.tsx` - Galería de imágenes
- `components/reno/reno-property-card.tsx` - Colorización de tipos
- `components/reno/reno-kanban-board.tsx` - Sistema de filtros
- `components/layout/navbar-l1.tsx` - Badge de filtros

### Páginas
- `app/reno/construction-manager/kanban/page.tsx` - Integración de filtros
- `app/reno/construction-manager/property/[id]/page.tsx` - Integración de categorías dinámicas

### Librerías
- `lib/airtable/sync-from-airtable.ts` - Mejoras en sincronización
- `lib/airtable/sync-reno-in-progress.ts` - Webhook automático
- `lib/airtable/sync-upcoming-settlements.ts` - Lógica de pics_urls
- `lib/supabase/types.ts` - Tipos actualizados para `pics_urls`
- `hooks/useSupabaseKanbanProperties.ts` - Incluir `supabaseProperty` en conversión

### Configuración
- `package.json` - Nuevos scripts npm

---

## 🔧 Scripts NPM Agregados

```json
{
  "sync:furnishing-cleaning": "tsx scripts/sync-furnishing-cleaning.ts",
  "sync:final-check": "tsx scripts/sync-final-check.ts",
  "sync:all-pics-urls": "tsx scripts/sync-all-pics-urls.ts",
  "check:technical-construction": "tsx scripts/check-technical-construction.ts",
  "update:technical-construction": "tsx scripts/update-technical-construction.ts",
  "verify:technical-construction": "tsx scripts/verify-technical-construction.ts",
  "debug:airtable-technical": "tsx scripts/debug-airtable-technical-constructor.ts",
  "debug:transactions-technical": "tsx scripts/debug-transactions-technical.ts"
}
```

---

## 🗄️ Cambios en Base de Datos

### Nueva Tabla: `property_dynamic_categories`
```sql
CREATE TABLE property_dynamic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR(50) REFERENCES properties(id),
  category_name TEXT NOT NULL,
  activities_text TEXT,
  percentage INTEGER CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Nueva Columna: `pics_urls` en `properties`
```sql
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS pics_urls TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_properties_pics_urls 
ON properties USING GIN (pics_urls);
```

### Fix: Eliminación de índice problemático
```sql
-- Eliminado índice B-tree en next_reno_steps (causaba errores por tamaño)
DROP INDEX IF EXISTS idx_properties_next_reno_steps;
```

---

## 🔗 Integraciones Externas

### n8n Webhook
- **URL**: `https://n8n.prod.prophero.com/webhook/send_categories_cursor`
- **Método**: POST
- **Payload**: Información de propiedad con `budget_pdf_url`
- **Propósito**: Extracción automática de categorías desde PDFs de presupuesto

### Airtable
- **Base ID**: Configurado en `.env.local`
- **Tablas utilizadas**:
  - `Transactions` (tblmX19OTsj3cTHmA)
  - `Properties` (tabla relacionada)
  - `Engagements` (tabla relacionada)
  - `Team Profiles` (tabla relacionada)

---

## ⚠️ Notas Importantes

### Variables de Entorno Requeridas
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_AIRTABLE_API_KEY=
NEXT_PUBLIC_AIRTABLE_BASE_ID=
```

### Migraciones Pendientes
Antes de usar en producción, ejecutar las siguientes migraciones en Supabase:
1. `009_create_property_dynamic_categories.sql`
2. `010_fix_next_reno_steps_index.sql`
3. `011_add_pics_urls_to_properties.sql`

### Campo Technical Constructor
- **Estado**: El campo "Technical Constructor" no se encuentra en la tabla Properties de Airtable
- **Impacto**: Actualmente todas las propiedades tienen `null` en este campo
- **Acción requerida**: Verificar en Airtable dónde está ubicado este campo o si tiene otro nombre

---

## 🧪 Testing

### Scripts de Verificación
- `npm run check:technical-construction` - Verifica estado de Technical construction
- `npm run verify:technical-construction` - Verifica estado final en Supabase
- `npm run check:pics-urls` - Verifica propiedades con pics_urls

### Sincronizaciones
- `npm run sync:reno-in-progress` - Sincroniza fase de obras en proceso
- `npm run sync:furnishing-cleaning` - Sincroniza fase de limpieza y amoblamiento
- `npm run sync:final-check` - Sincroniza fase de final check
- `npm run sync:all-pics-urls` - Sincroniza todas las pics_urls

---

## 📊 Estadísticas

- **Propiedades sincronizadas**: 114 en Supabase
- **Fases del Kanban integradas**: 5 (upcoming-settlements, initial-check, reno-in-progress, furnishing-cleaning, final-check)
- **Componentes nuevos**: 2
- **Scripts nuevos**: 8
- **Migraciones**: 3

---

## 🚀 Próximos Pasos Sugeridos

1. **Resolver Technical Constructor**: Identificar dónde está este campo en Airtable y actualizar el código de sincronización
2. **Testing completo**: Probar todas las sincronizaciones en entorno de desarrollo
3. **Documentación de API**: Documentar el formato del webhook de n8n
4. **Optimización**: Considerar cachear coordenadas de Google Maps si se implementa la integración
5. **Mejoras UI**: Considerar agregar más filtros o mejorar la UX del modal de filtros

---

## 👥 Autores

- **Desarrollo**: Manuel
- **Revisión**: Angel (pendiente)

---

## 📅 Fecha

- **Inicio**: 2025-01-XX
- **Fin**: 2025-01-XX
- **Branch**: `feature/updates-20251112` → `dev`





