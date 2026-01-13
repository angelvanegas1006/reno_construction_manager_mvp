# Comparación: Ángel `dev` vs Manuel `develop`

**Fecha de comparación**: 2025-01-27  
**Rama de Ángel**: `upstream/dev` (commit: 7b80c3b)  
**Rama de Manuel**: `develop` (commit: 89debf8)

---

## 🎯 Resumen Ejecutivo - Diferencias Clave

### ✅ Lo que TÚ tienes y Ángel NO tiene (MANTENER):

1. **Widgets de Tareas Pendientes** (NUEVO)
   - Componente completo con 5 widgets en la home
   - Modal interactivo para editar tareas
   - Vista responsive (acordeón mobile, grid desktop)

2. **Mejoras Críticas de Sincronización**
   - ✅ Corrección del campo "Days to start reno since real settlement date" en Airtable
   - ✅ Expansión completa de `hasChanges` para sincronizar TODOS los campos
   - ✅ Validación estricta de `reno_phase` que evita propiedades incorrectas

3. **Mejoras de UI**
   - ✅ Icono `Flag` en lugar de `AlertTriangle` (sin desplazamiento de layout)
   - ✅ Ordenamiento mejorado de fase `reno-in-progress` por duración
   - ✅ Bandera roja con mástil negro para mejor visibilidad

### ⚠️ Lo que Ángel tiene y tú NO tienes (EVALUAR):

1. **Fixes de TypeScript**
   - Manejo de fase `orphaned` en tipos
   - Correcciones de interfaces y tipos

2. **Mejoras de UI/UX del Checklist**
   - Integraciones del sidebar
   - Mejoras visuales del checklist

3. **Sistema de Notificaciones**
   - Página de notificaciones completa
   - Sistema de ayuda integrado

4. **Otros fixes menores**
   - Manejo de errores mejorado
   - Validación de variables de entorno

---

## 📊 Resumen Ejecutivo

### Commits que tienes tú y Ángel NO tiene:
- `89debf8` - fix: Reemplazar borde rojo por bandera roja en vista de lista y Kanban
- `6ae3b7e` - feat: Agregar widgets de tareas pendientes y modal en home del jefe de obra

### Commits que tiene Ángel y tú NO tienes:
- `7b80c3b` - fix: Corregir comparación de tipos incorrecta y eliminar propiedades duplicadas en objetos literales
- `b9666ec` - fix: Agregar fase 'orphaned' a RenoStage y todos los Record<RenoKanbanPhase>
- `6f62b91` - fix: Agregar fase 'orphaned' a todos los Record<RenoKanbanPhase>
- `8010094` - fix: Cerrar correctamente la interfaz Property para corregir error de build
- `d559e6f` - Merge branch 'main' into dev
- `2b85d5e` - fix: Reordenar declaración de FileUpload antes de interfaces que la usan
- `fccf1dd` - fix: Remover icono de alerta de vista lista, mantener solo línea roja al inicio
- `e11d3eb` - fix: Restaurar manejo de filas rojas con fondo y icono de alerta en vista lista
- `40e11ce` - fix: Mover icono de alerta dentro de td para corregir error HTML
- `0690649` - feat: Integrar mejoras UI/UX del checklist y sidebar de Manu
- `efe8281` - fix: Mejorar manejo de errores de Supabase y validación de variables de entorno
- `216ffdc` - feat: Integrar widgets de tareas pendientes y modal de Manu
- Y varios más...

---

## 🔍 Diferencias Significativas por Categoría

### 1. **Nuevos Componentes que TÚ tienes y Ángel NO tiene**

#### ✅ `components/reno/reno-home-todo-widgets.tsx` (352 líneas)
- **Descripción**: Widgets de tareas pendientes en la home del jefe de obra
- **Funcionalidad**:
  - 5 widgets: "Definir visita estimada", "Check Inicial", "Rellenar Renovador", "Actualizacion de obra", "Check Final"
  - Vista responsive: acordeón en mobile, grid de 5 columnas en desktop
  - Filtrado por fase del Kanban
  - Integración con modal de tareas

#### ✅ `components/reno/todo-widget-modal.tsx` (299 líneas)
- **Descripción**: Modal para editar tareas desde los widgets
- **Funcionalidad**:
  - Muestra información básica de la propiedad (dirección, ID, area cluster, reno type)
  - Campos editables según el tipo de widget
  - Guardado en Supabase y Airtable
  - Redirección a tareas específicas del Kanban

#### ✅ `components/reno/reno-home-technical-constructor-filter.tsx` (123 líneas)
- **Descripción**: Filtro por jefe de obra (technical constructor) en la home
- **Estado**: Creado pero actualmente oculto según tus instrucciones

---

### 2. **Cambios en Componentes Existentes**

#### `components/reno/reno-kanban-board.tsx`

**Tus cambios (que Ángel NO tiene)**:
- ✅ Importación de icono `Flag` de lucide-react (Ángel todavía usa `AlertTriangle`)
- ✅ Función `exceedsRenoDurationLimit()` para verificar límites según tipo de reno
- ✅ Función `sortRenoInProgressPhase()` que ordena por:
  - Propiedades que exceden límites primero (rojas)
  - Luego por `renoDuration` descendente
- ✅ Reemplazo de `border-l-4` por icono `Flag` en vista de lista
- ✅ Bandera roja con mástil negro (`stroke-black strokeWidth={2}`)
- ✅ Tamaño reducido de la bandera (`h-3.5 w-3.5`)

**Estado en Ángel**:
- ⚠️ **Todavía usa `AlertTriangle`** en lugar de `Flag`
- ⚠️ Posiblemente todavía tiene el `border-l-4` que causa desplazamiento
- ⚠️ No tiene la función `sortRenoInProgressPhase()` con ordenamiento mejorado

#### `components/reno/reno-property-card.tsx`

**Tus cambios**:
- ✅ Reemplazo de `AlertTriangle` por `Flag` icon
- ✅ Bandera roja con mástil negro
- ✅ Cambio de texto: "Días para empezar la reno desde la firma" → "Días a empezar la obra"

**Cambios de Ángel**:
- ⚠️ Posiblemente diferentes mejoras de UI/UX

#### `app/reno/construction-manager/page.tsx`

**Tus cambios**:
- ✅ Integración de `RenoHomeTodoWidgets`
- ✅ Pasar `propertiesByPhase` a los widgets

**Cambios de Ángel**:
- ⚠️ Posiblemente diferentes integraciones o mejoras

---

### 3. **Cambios en Lógica de Negocio**

#### `hooks/useSupabaseKanbanProperties.ts`

**Tus cambios (CRÍTICOS)**:
- ✅ Validación estricta de `reno_phase`:
  - Si `reno_phase` está establecido pero NO es válido (ej: "orphaned"), retorna `null` (ignora la propiedad)
  - Esto evita que propiedades aparezcan incorrectamente en `upcoming-settlements`
- ✅ Manejo especial para fase legacy `reno-budget`:
  - Usa el mapeo de "Set Up Status" para determinar la fase correcta
  - Mapea a las nuevas fases: `reno-budget-renovator`, `reno-budget-client`, `reno-budget-start`

**Estado en Ángel**:
- ⚠️ **NO ignora propiedades con `reno_phase` inválido** - usa el mapeo de "Set Up Status" como fallback
- ⚠️ Esto puede causar que propiedades con `reno_phase = "orphaned"` aparezcan incorrectamente en otras fases
- ✅ SÍ tiene manejo especial para `reno-budget` legacy (similar al tuyo)
- ⚠️ La lógica es diferente: Ángel primero intenta mapear desde "Set Up Status" si es `reno-budget`, luego valida otras fases

#### `lib/airtable/sync-from-airtable.ts`

**Tus cambios (CRÍTICOS)**:
- ✅ Corrección del mapeo de campo `Days to Start Reno (Since RSD)`:
  - Campo en Airtable: "Days to start reno since real settlement date"
  - Prioriza el nombre exacto del campo en Airtable con múltiples variantes como fallback
- ✅ **CRÍTICO**: Expansión de `hasChanges` para incluir TODOS los campos sincronizados:
  - Ahora verifica: `type`, `keys_location`, `stage`, `Client email`, `Estimated Visit Date`, `estimated_end_date`, `start_date`, `Days to Start Reno (Since RSD)`, `Reno Duration`, `Days to Property Ready`, `days_to_visit`, `reno_phase`
  - Esto asegura que cualquier cambio en Airtable se refleje en Supabase

**Estado en Ángel**:
- ⚠️ **NO tiene la corrección del nombre del campo** - usa "Days to Start Reno (Since RSD)" directamente sin buscar "Days to start reno since real settlement date"
- ⚠️ **NO tiene la expansión completa de `hasChanges`** - solo verifica algunos campos básicos:
  - `address`, `Set Up Status`, `notes`, `area_cluster`, `Hubspot ID`, `property_unique_id`, `Technical construction`, `next_reno_steps`, `Renovator name`
- ⚠️ Esto significa que muchos campos pueden no sincronizarse correctamente si cambian en Airtable

#### `lib/airtable/sync-all-phases.ts`

**Tus cambios**:
- ✅ Actualización de `syncedPhases` para incluir las nuevas fases de presupuesto:
  - `reno-budget-renovator`
  - `reno-budget-client`
  - `reno-budget-start`

---

### 4. **Archivos que Ángel tiene modificados y tú NO**

Basado en el diff, Ángel tiene cambios en muchos archivos que tú no has tocado:

- `app/reno/construction-manager/notifications/page.tsx` - Página de notificaciones
- `components/reno/reno-sidebar.tsx` - Mejoras de UI/UX
- `components/checklist/` - Varios componentes del checklist
- `components/auth/` - Componentes de autenticación
- `lib/i18n/translations.ts` - Traducciones
- Y muchos más archivos de documentación y scripts

---

## ⚠️ Posibles Conflictos al Hacer Merge

### 1. **`components/reno/reno-kanban-board.tsx`**
- **Riesgo**: MEDIO
- **Razón**: Ambos han modificado la visualización de propiedades retrasadas, pero de forma diferente
- **Tu cambio**: Bandera roja (`Flag`) sin borde, con ordenamiento mejorado de `reno-in-progress`
- **Cambio de Ángel**: Todavía usa `AlertTriangle` y posiblemente tiene el borde que causa desplazamiento
- **Resolución**: Tu versión es mejor (sin desplazamiento), mantenerla

### 2. **`hooks/useSupabaseKanbanProperties.ts`**
- **Riesgo**: MEDIO-ALTO
- **Razón**: Ambos han modificado la lógica de mapeo de fases, pero con enfoques diferentes
- **Tu cambio**: Validación estricta que ignora propiedades con `reno_phase` inválido
- **Cambio de Ángel**: Usa fallback a "Set Up Status" incluso para `reno_phase` inválido
- **Resolución**: Tu versión es más estricta y evita propiedades incorrectas en `upcoming-settlements`. Mantener tu lógica pero revisar si Ángel tiene mejoras adicionales

### 3. **`lib/airtable/sync-from-airtable.ts`**
- **Riesgo**: MEDIO
- **Razón**: Ambos han modificado la lógica de sincronización, pero tu versión es más completa
- **Tu cambio**: Expansión completa de `hasChanges` (verifica todos los campos) y corrección del nombre del campo de Airtable
- **Cambio de Ángel**: Versión más básica de `hasChanges` (solo algunos campos) y mapeo incorrecto del campo de días
- **Resolución**: **CRÍTICO mantener tu versión** - es esencial para la sincronización correcta

### 4. **`app/reno/construction-manager/page.tsx`**
- **Riesgo**: BAJO-MEDIO
- **Razón**: Ambos han modificado la página principal
- **Tu cambio**: Integración de widgets
- **Cambio de Ángel**: Posiblemente diferentes integraciones

---

## 📈 Estadísticas de Cambios

### Archivos modificados en TU código (vs Ángel):
- 9 archivos modificados
- 3 archivos nuevos
- **Total**: +901 líneas añadidas, -36 líneas eliminadas

### Archivos modificados en código de ÁNGEL (vs tú):
- Muchos más archivos (ver lista completa arriba)
- Incluye mejoras de UI/UX, checklist, autenticación, etc.

---

## 🎯 Recomendaciones

### 1. **Antes de hacer la PR**
- ✅ Verificar que tus cambios críticos (`hasChanges`, mapeo de campos) estén presentes
- ✅ Asegurarte de que la lógica de `useSupabaseKanbanProperties.ts` sea compatible
- ✅ Probar que los widgets funcionen correctamente después de un merge

### 2. **Estrategia de Merge**
- Opción A: Hacer merge de `upstream/dev` a tu `develop` primero, resolver conflictos, luego hacer PR
- Opción B: Hacer PR directamente y resolver conflictos en GitHub

### 3. **Prioridades**
- 🔴 **CRÍTICO**: Mantener tus cambios en `sync-from-airtable.ts` (expansión de `hasChanges`)
- 🔴 **CRÍTICO**: Mantener tu validación estricta de `reno_phase` en `useSupabaseKanbanProperties.ts`
- 🟡 **IMPORTANTE**: Mantener tus widgets y modal (nuevos componentes)
- 🟡 **IMPORTANTE**: Mantener el icono `Flag` en lugar de `AlertTriangle`
- 🟢 **NORMAL**: Resolver conflictos menores de UI/UX

---

## 📝 Notas Adicionales

- Ángel ha integrado algunos de tus cambios anteriores (commit `216ffdc` menciona "Integrar widgets de tareas pendientes y modal de Manu")
- Parece que hay un merge commit (`0690649`) que integra mejoras UI/UX del checklist y sidebar
- Ángel ha hecho varios fixes de TypeScript relacionados con la fase `orphaned`
- Hay mejoras de manejo de errores y validación de variables de entorno

---

**Próximos pasos sugeridos**:
1. Hacer merge de `upstream/dev` a tu `develop` localmente
2. Resolver conflictos priorizando tus cambios críticos
3. Probar que todo funcione correctamente
4. Hacer push y crear la PR

