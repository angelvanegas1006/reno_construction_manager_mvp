# Análisis de Conflictos Críticos - PR Manu

## 📋 Resumen

**Total conflictos críticos:** 20 archivos  
**Fecha:** $(date)  
**Rama:** `merge-manu-develop-clean`

Estos conflictos afectan directamente la funcionalidad mobile/responsive que implementamos.

---

## 🔴 CATEGORÍA CRÍTICA 1: Estilos Globales y Tipografía

### 1. `app/globals.css` ⚠️⚠️⚠️ **MUY CRÍTICO**

**Cambios de Manu:**
- ❌ **ELIMINÓ** toda la jerarquía de tipografía responsive:
  - `h1`, `h2`, `h3`, `h4` con tamaños responsive
  - `.text-body`, `.text-small`, `.text-caption`
  - Reglas para `label`, `input`, `textarea`, `select`
  - Media query para prevenir zoom en iOS (`font-size: 16px`)
  - Base font size para mobile (`font-size: 14px`)

**Nuestros cambios:**
- ✅ Jerarquía completa de tipografía responsive
- ✅ Reglas para prevenir zoom en iOS
- ✅ Base font size optimizado para mobile

**Impacto:** Sin estas reglas, toda la aplicación perderá consistencia tipográfica y habrá problemas de zoom en iOS.

**🔴 DECISIÓN: MANTENER NUESTROS CAMBIOS COMPLETAMENTE**
- **Razón:** Estas reglas son fundamentales para la experiencia mobile
- **Acción:** Rechazar cambios de Manu, mantener nuestra jerarquía de tipografía
- **Nota:** Si Manu tiene mejoras de estilo específicas, integrarlas manualmente sin eliminar nuestras reglas

---

## 🔴 CATEGORÍA CRÍTICA 2: Navegación Mobile

### 2. `components/layout/navbar-l2.tsx` ⚠️⚠️⚠️ **MUY CRÍTICO**

**Cambios de Manu:**
- ❌ Eliminó el prop `onOpenSidebar?: () => void`
- ❌ Eliminó el botón de sidebar mobile (`Info` icon)
- ❌ Eliminó `pl-12` y `-ml-1` (espacio para hamburger menu)
- ❌ Eliminó clases responsive: `pl-12 md:pl-0`, `min-w-0`, `truncate`
- ❌ Eliminó padding responsive: `px-3 md:px-4 lg:px-6` → `px-4 md:px-6`
- ❌ Eliminó `dark:bg-[var(--prophero-gray-900)]`
- ❌ Eliminó tamaños responsive de botones: `text-xs md:text-sm` → sin tamaño
- ❌ Eliminó `hidden sm:inline` de labels de botones
- Cambió hover de botones (mejora de Manu)

**Nuestros cambios:**
- ✅ `onOpenSidebar` prop para abrir sidebar en mobile
- ✅ Botón de sidebar mobile
- ✅ `pl-12` para espacio del hamburger menu
- ✅ Clases responsive para truncate y min-width
- ✅ Ajustes de padding responsive
- ✅ Tamaños responsive de botones

**Impacto:** Sin estos cambios, el sidebar mobile no funcionará y el título se superpondrá con el hamburger menu.

**🔴 DECISIÓN: MANTENER NUESTROS CAMBIOS**
- **Razón:** Funcionalidad mobile crítica
- **Acción:** Mantener nuestros cambios, aceptar mejoras de hover de Manu manualmente

---

### 3. `components/layout/navbar-l1.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- Probablemente ajustes responsive

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Revisar diff completo antes de decidir

---

## 🔴 CATEGORÍA CRÍTICA 3: Kanban Mobile

### 4. `components/reno/reno-kanban-header.tsx` ⚠️⚠️⚠️ **MUY CRÍTICO**

**Cambios de Manu:**
- ❌ Eliminó `pl-14` del título mobile (espacio para hamburger)
- ❌ Eliminó `relative` y posicionamiento absoluto del botón hamburger
- ❌ Eliminó `min-w-0` de varios elementos
- Cambió `header` → `nav` (semántica mejor)
- Cambió padding: `px-3 md:px-6 py-4` → `px-4 md:px-6 py-3`
- Cambió estilos de botones (colores dark mode mejorados)
- Agregó `rounded-full` al input de búsqueda (mejora visual)
- Agregó separador vertical en desktop (`<div className="h-10 w-px bg-border"></div>`)

**Nuestros cambios:**
- ✅ `pl-14` para espacio del hamburger menu
- ✅ Posicionamiento absoluto del hamburger button
- ✅ `min-w-0` y `truncate` para responsive
- ✅ Ajustes de padding responsive

**Impacto:** Sin `pl-14`, el título se superpondrá con el hamburger menu en mobile.

**🔴 DECISIÓN: MANTENER NUESTROS CAMBIOS MOBILE + ACEPTAR MEJORAS DE MANU**
- **Razón:** Necesitamos el espacio del hamburger, pero las mejoras de Manu son buenas
- **Acción:** 
  - Mantener `pl-14`, posicionamiento absoluto, `min-w-0`
  - Aceptar `rounded-full` en input, mejoras de colores dark mode
  - Aceptar cambio `header` → `nav`
  - Aceptar separador vertical en desktop

---

### 5. `components/reno/reno-kanban-column.tsx` ⚠️⚠️⚠️ **MUY CRÍTICO**

**Cambios de Manu:**
- ❌ Eliminó `mb-1 md:mb-4` → solo `mb-4` (perdemos espaciado reducido mobile)
- ❌ Eliminó estilos mobile del header: `bg-card dark:bg-[#000000] border border-border rounded-lg px-4 py-3`
- ❌ Eliminó `shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]` (sombra suave mobile)
- ❌ Eliminó `pt-1 md:pt-0` del content wrapper
- ❌ Cambió estructura del header (count y chevron agrupados diferente)
- ❌ Eliminó `min-w-[280px]` → solo `min-w-[320px]`
- Cambió colores dark mode (mejoras)
- Cambió estructura: count ahora usa `properties.length` en lugar de `count` prop

**Nuestros cambios:**
- ✅ `mb-1 md:mb-4` para reducir espaciado mobile
- ✅ Header estilo card en mobile con sombra suave
- ✅ `pt-1 md:pt-0` para reducir padding top mobile
- ✅ Agrupamos count y chevron juntos para evitar "bouncing"
- ✅ `min-w-[280px]` para mobile más compacto
- ✅ Título con `flex-1 min-w-0` para truncate correcto

**Impacto:** Sin estos cambios, el Kanban mobile perderá el diseño compacto y los headers no se verán bien.

**🔴 DECISIÓN: MANTENER NUESTROS CAMBIOS MOBILE**
- **Razón:** Cambios mobile críticos para UX
- **Acción:** 
  - Mantener `mb-1 md:mb-4`, `pt-1 md:pt-0`, sombra suave, estructura del header
  - Aceptar mejoras de colores dark mode de Manu
  - Evaluar si `properties.length` vs `count` prop es mejor

---

## 🔴 CATEGORÍA CRÍTICA 4: Property Detail Page

### 6. `app/reno/construction-manager/property/[id]/page.tsx` ⚠️⚠️⚠️ **MUY CRÍTICO**

**Cambios de Manu:**
- ❌ Eliminó import de `Info` y `X` de lucide-react
- ❌ Eliminó import de `PropertyRemindersSection`
- ❌ Eliminó `createClient` de supabase
- ❌ Eliminó estado `isSidebarOpen` y `setIsSidebarOpen`
- ❌ Eliminó lógica de auto-advance basada en nueva fecha
- ❌ Simplificó lógica de `localEstimatedVisitDate`
- ❌ Eliminó `isEditingDate` state
- ✅ Agregó `dateDebounceRef` para debounce (mejora)
- ✅ Mejoró lógica de sync con Airtable (más robusta)
- ✅ Mejor manejo de errores y logging

**Nuestros cambios:**
- ✅ Agregamos tab "Comentarios y Recordatorios"
- ✅ Agregamos `isSidebarOpen` para mobile drawer
- ✅ Agregamos `onOpenSidebar` callback para NavbarL2
- ✅ Agregamos Sheet component para sidebar mobile
- ✅ Agregamos `PropertyRemindersSection` en el tab de comentarios
- ✅ Ajustes de padding responsive

**Impacto:** Sin nuestros cambios, perderemos el tab de comentarios y el sidebar mobile drawer.

**🔴 DECISIÓN: MANTENER NUESTROS CAMBIOS + ACEPTAR MEJORAS DE MANU**
- **Razón:** Necesitamos el tab de comentarios y sidebar mobile, pero las mejoras de Manu son buenas
- **Acción:** 
  - Mantener tab "Comentarios y Recordatorios"
  - Mantener `isSidebarOpen` y Sheet para mobile
  - Mantener `onOpenSidebar` callback
  - Aceptar mejoras de sync Airtable de Manu
  - Aceptar `dateDebounceRef` si es mejor que nuestra implementación
  - Evaluar si simplificación de `localEstimatedVisitDate` es mejor

---

### 7. `components/reno/property-status-sidebar.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ `w-full lg:w-80` para mobile drawer
- ✅ `border-l-0 lg:border-l` para remover borde en mobile

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestros cambios mobile, aceptar mejoras de estilo de Manu

---

## 🔴 CATEGORÍA CRÍTICA 5: Componentes de Property

### 8. `components/reno/property-comments-tab.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo y funcionalidad

**Nuestros cambios:**
- Probablemente ninguno directo

**🟢 DECISIÓN: ACEPTAR CAMBIOS DE MANU**
- **Razón:** Parece ser solo mejoras
- **Acción:** Aceptar cambios de Manu

---

### 9. `components/reno/property-info-section.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- Probablemente ninguno directo

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Revisar diff completo antes de decidir

---

### 10. `components/reno/property-status-tab.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- Probablemente ninguno directo

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Revisar diff completo antes de decidir

---

### 11. `components/reno/property-summary-tab.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- Probablemente ninguno directo

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Revisar diff completo antes de decidir

---

### 12. `components/reno/property-map.tsx` ⚠️

**Cambios de Manu:**
- Componente nuevo o mejoras significativas

**Nuestros cambios:**
- Probablemente ninguno (componente nuevo)

**🟢 DECISIÓN: ACEPTAR CAMBIOS DE MANU**
- **Razón:** Componente nuevo o mejoras
- **Acción:** Aceptar cambios de Manu

---

### 13. `components/reno/property-combobox.tsx` ⚠️

**Cambios de Manu:**
- Componente nuevo o mejoras significativas

**Nuestros cambios:**
- Probablemente ninguno (componente nuevo)

**🟢 DECISIÓN: ACEPTAR CAMBIOS DE MANU**
- **Razón:** Componente nuevo o mejoras
- **Acción:** Aceptar cambios de Manu

---

## 🔴 CATEGORÍA CRÍTICA 6: Componentes de Home y Visits

### 14. `components/reno/reno-property-card.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ Agregamos `hover:shadow-md dark:hover:shadow-none` para light mode
- ✅ Ajustes de avatar circular
- ✅ Mejoras responsive

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestro hover shadow, aceptar mejoras de Manu

---

### 15. `components/reno/visits-calendar.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ Grid responsive para week view
- ✅ `hover:shadow-md dark:hover:shadow-none` para light mode
- ✅ Ajustes de tamaño y espaciado mobile

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestros cambios responsive + hover shadow, aceptar mejoras de Manu

---

### 16. `components/reno/visits-and-reminders-section.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ `hover:shadow-md dark:hover:shadow-none` para light mode

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestro hover shadow, aceptar mejoras de Manu

---

### 17. `components/reno/reno-checklist-sidebar.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo y funcionalidad

**Nuestros cambios:**
- Probablemente ninguno directo

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Revisar diff completo antes de decidir

---

## 🔴 CATEGORÍA CRÍTICA 7: Páginas

### 18. `app/reno/construction-manager/page.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ Conectamos `isMobileMenuOpen` state con `RenoSidebar`
- ✅ Ajustes de padding responsive

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestros cambios mobile, aceptar mejoras de Manu

---

### 19. `app/reno/construction-manager/kanban/page.tsx` ⚠️

**Cambios de Manu:**
- Probablemente mejoras de estilo

**Nuestros cambios:**
- ✅ Ajustes de padding responsive: `p-2 md:p-3 lg:p-6`

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver los cambios específicos
- **Acción:** Mantener nuestros cambios responsive, aceptar mejoras de Manu

---

## 🔴 CATEGORÍA CRÍTICA 8: Dependencies

### 20. `package.json` y `package-lock.json` ⚠️

**Cambios de Manu:**
- Probablemente nuevas dependencias o actualizaciones

**Nuestros cambios:**
- ✅ Agregamos `dotenv` como devDependency

**🟡 DECISIÓN: REVISAR DIFF COMPLETO**
- **Razón:** Necesitamos ver qué dependencias agregó Manu
- **Acción:** Revisar diff completo, mantener `dotenv`, aceptar nuevas dependencias de Manu si son necesarias

---

## 📊 Resumen de Decisiones

### 🔴 MANTENER NUESTROS CAMBIOS (5 archivos críticos):
1. `app/globals.css` - Jerarquía de tipografía responsive
2. `components/layout/navbar-l2.tsx` - Funcionalidad mobile sidebar
3. `components/reno/reno-kanban-header.tsx` - Espacio hamburger mobile
4. `components/reno/reno-kanban-column.tsx` - Diseño mobile compacto
5. `app/reno/construction-manager/property/[id]/page.tsx` - Tab comentarios y sidebar mobile

### 🟢 ACEPTAR CAMBIOS DE MANU (3 archivos):
1. `components/reno/property-comments-tab.tsx` - Mejoras
2. `components/reno/property-map.tsx` - Componente nuevo
3. `components/reno/property-combobox.tsx` - Componente nuevo

### 🟡 REVISAR/EVALUAR (12 archivos):
1. `components/layout/navbar-l1.tsx` - Revisar diff
2. `components/reno/property-status-sidebar.tsx` - Mantener mobile, aceptar mejoras
3. `components/reno/property-info-section.tsx` - Revisar diff
4. `components/reno/property-status-tab.tsx` - Revisar diff
5. `components/reno/property-summary-tab.tsx` - Revisar diff
6. `components/reno/reno-property-card.tsx` - Mantener hover shadow
7. `components/reno/visits-calendar.tsx` - Mantener responsive + hover shadow
8. `components/reno/visits-and-reminders-section.tsx` - Mantener hover shadow
9. `components/reno/reno-checklist-sidebar.tsx` - Revisar diff
10. `app/reno/construction-manager/page.tsx` - Mantener mobile state
11. `app/reno/construction-manager/kanban/page.tsx` - Mantener responsive padding
12. `package.json` / `package-lock.json` - Revisar dependencias

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Archivos Críticos (Mantener nuestros cambios)
1. `app/globals.css` - Mantener jerarquía de tipografía
2. `navbar-l2.tsx` - Mantener funcionalidad mobile
3. `reno-kanban-header.tsx` - Mantener espacio hamburger + aceptar mejoras
4. `reno-kanban-column.tsx` - Mantener diseño mobile + aceptar mejoras
5. `property/[id]/page.tsx` - Mantener tab comentarios + aceptar mejoras sync

### Fase 2: Archivos Nuevos (Aceptar cambios de Manu)
1. `property-map.tsx` - Aceptar
2. `property-combobox.tsx` - Aceptar
3. `property-comments-tab.tsx` - Aceptar

### Fase 3: Archivos a Revisar
1. Revisar diffs completos de archivos marcados con 🟡
2. Mantener cambios mobile/responsive donde sea crítico
3. Aceptar mejoras de estilo de Manu donde no rompan mobile

### Fase 4: Dependencies
1. Revisar `package.json` para nuevas dependencias
2. Mantener `dotenv` que agregamos
3. Aceptar nuevas dependencias de Manu si son necesarias

---

## ⚠️ Principios Rectores

1. **Mobile-first:** Mantener todos los cambios mobile/responsive que implementamos
2. **Funcionalidad crítica:** Mantener funcionalidad que agregamos (tab comentarios, sidebar mobile)
3. **Mejoras de estilo:** Aceptar mejoras de Manu solo si no rompen mobile
4. **Jerarquía de tipografía:** Mantener nuestra jerarquía responsive siempre

---

**Próximo paso:** Revisar este documento y decidir cómo proceder con cada conflicto crítico.

