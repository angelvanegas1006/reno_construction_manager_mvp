# Revisión de Cambios con Conflictos Menores

## 1. 🔧 RENO SIDEBAR (`components/reno/reno-sidebar.tsx`)

### ✅ Funcionalidad Nueva (RECOMENDADO APLICAR)
- **Help Modal integrado**: Abre modal en lugar de navegar
- **Badge de notificaciones**: Muestra contador de mensajes no leídos
- **Logo clickeable**: Logo navega a home
- **Notificaciones activas**: Quita "comingSoon" de notificaciones

### ⚠️ Cambios de Estilos (DECIDIR)
- Elimina `dark:bg-[var(--prophero-gray-900)]` del sidebar mobile
- Cambia hover dark mode a `dark:hover:bg-[#1a1a1a]`

**Decisión**: ¿Aplicar funcionalidad nueva + estilos? ¿Solo funcionalidad?

---

## 2. 🔍 RENO KANBAN FILTERS (`components/reno/reno-kanban-filters.tsx`)

### ✅ Mejoras UX (RECOMENDADO APLICAR)
- **MultiCombobox para Renovator Name**: Reemplaza checkboxes con búsqueda
- **MultiCombobox para Area Cluster**: Reemplaza checkboxes con búsqueda
- **Mejora búsqueda Technical Constructor**: Busca también en "Technical Constructor" (mayúsculas)

### 📝 Cambios Específicos:
- Elimina funciones `handleToggleRenovator` y `handleToggleAreaCluster`
- Usa `MultiCombobox` component (ya copiado)
- Agrega placeholders de búsqueda

**Decisión**: ¿Aplicar? (Mejora UX significativa)

---

## 3. 🏠 HOME PAGE (`app/reno/construction-manager/page.tsx`)

### ⚠️ Cambios de Estilos (DECIDIR)
- Cambia `dark:bg-[var(--prophero-gray-950)]` a `dark:bg-[#000000]` (negro puro)
- Agrega `pt-6` al padding

**Nuestros cambios preservados**: 
- Ranking de renovadores
- Portfolio con `visibleRenoKanbanColumns`

**Decisión**: ¿Aplicar cambio a negro puro? ¿Solo el padding?

---

## 4. 📊 RENO HOME RECENT PROPERTIES (`components/reno/reno-home-recent-properties.tsx`)

### ✅ Mejoras de Layout (RECOMENDADO APLICAR)
- Agrega `h-full flex flex-col` para igualar altura con portfolio
- Cambia hover dark mode a `dark:hover:bg-[#1a1a1a]`

### 📝 Cambios Específicos:
- Card: `bg-card h-full flex flex-col`
- CardHeader: `flex-shrink-0`
- CardContent: `flex-1 flex flex-col`
- Content div: `flex-1`

**Nuestros cambios preservados**: 
- Ranking completo de renovadores
- Modal con top 5 y vista completa

**Decisión**: ¿Aplicar? (Mejora visual, sin afectar funcionalidad)

---

## 5. 🌐 TRANSLATIONS (`lib/i18n/translations.ts`)

### ✅ Nuevas Secciones (RECOMENDADO APLICAR)
- **Sección `help`**: Completa (ES + EN)
- **Sección `notifications`**: Completa (ES + EN)
- **Nuevos campos en `kanban.filters`**:
  - `searchRenovator`: "Buscar renovador..." / "Search renovator..."
  - `searchAreaCluster`: "Buscar área..." / "Search area..."

### ⚠️ Cambios de Traducción (REVISAR)
- "Constructor Técnico" → "Jefe de Obra"
- "Site Manager" → "Responsable"

**Nuestros cambios preservados**: 
- `partner.management: "Property Selling"`
- `partner.navProperties: "Property Selling"`
- `upcomingReno` (mantener)

**Decisión**: ¿Aplicar nuevas secciones? ¿Cambiar traducciones de roles?

---

## 6. 🎨 GLOBALS CSS (`app/globals.css`)

### ⚠️ Cambio Mayor de Dark Mode (DECIDIR)
- **Background**: `#212121` → `#000000` (negro puro)
- **Secondary**: `#3d3d3d` → `#1a1a1a`
- **Card**: `#454545` → `#1f1f1f`
- **Muted foreground**: `#d1d1d1` → `#a3a3a3`
- **Destructive**: `#f87171` → `#dc2626`
- **Borders**: `#4f4f4f` → `#333333`

**Impacto**: Cambia completamente el aspecto del dark mode a negro puro

**Decisión**: ¿Aplicar cambio completo? ¿Mantener gris oscuro actual?

---

## 📋 RESUMEN DE RECOMENDACIONES

| Archivo | Recomendación | Prioridad |
|---------|---------------|-----------|
| **Reno Sidebar** | ✅ Aplicar funcionalidad, ⚠️ decidir estilos | Alta |
| **Reno Kanban Filters** | ✅ Aplicar (mejora UX) | Alta |
| **Home Page** | ⚠️ Decidir dark mode | Media |
| **Reno Home Recent Properties** | ✅ Aplicar (mejora layout) | Media |
| **Translations** | ✅ Aplicar nuevas secciones, ⚠️ revisar roles | Alta |
| **Globals CSS** | ⚠️ Decidir dark mode (negro vs gris) | Alta |

---

## 🎯 PREGUNTAS PARA DECIDIR

1. **Dark Mode**: ¿Prefieres negro puro (`#000000`) o mantener gris oscuro (`#212121`)?
2. **Traducciones de Roles**: ¿Cambiar "Constructor Técnico" a "Jefe de Obra"?
3. **Estilos del Sidebar**: ¿Aplicar cambios de dark mode junto con funcionalidad?






