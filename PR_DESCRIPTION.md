# 🚀 Pull Request: Mejoras y Nuevas Funcionalidades - Reno Construction Manager

## 📋 Descripción General

Este PR incluye múltiples mejoras y nuevas funcionalidades para la aplicación Reno Construction Manager, incluyendo filtros avanzados, sistema de ayuda con notificaciones, integración de Google Maps, mejoras de UI/UX, y correcciones de sincronización con Airtable.

---

## ✨ Nuevas Funcionalidades

### 1. **Sistema de Ayuda y Notificaciones**
- ✅ Modal de ayuda accesible desde el sidebar
- ✅ Formulario de dos pasos: selección de tipo de error (propiedad/general)
- ✅ Integración con webhook de n8n para envío de mensajes
- ✅ Sistema de notificaciones en tiempo real con badge de mensajes no leídos
- ✅ Página de notificaciones con vista de conversaciones
- ✅ Tabla `help_conversations` en Supabase con soporte para respuestas
- ✅ Endpoint webhook `/api/webhooks/help-response` para recibir respuestas de n8n

### 2. **Filtros Avanzados en Kanban**
- ✅ Filtros múltiples para:
  - Renovator Name
  - Technical Constructor
  - Area Cluster
- ✅ Lógica OR: muestra propiedades que coincidan con cualquiera de los valores seleccionados
- ✅ Todos los valores visibles por defecto
- ✅ Badge con número de filtros activos
- ✅ Filtros no persisten entre sesiones

### 3. **Integración de Google Maps**
- ✅ Componente `PropertyMap` para mostrar ubicación de propiedades
- ✅ Geocodificación de direcciones usando Google Maps Geocoding API
- ✅ Marcadores con InfoWindow mostrando dirección y area cluster
- ✅ Estados de carga y error con mensajes informativos
- ✅ Soporte para dark mode

### 4. **Mejoras de UI/UX**

#### Image Viewer
- ✅ Zoom ajustado para imágenes verticales (mejor visualización)
- ✅ Modal con fondo claro en lugar de negro
- ✅ Botones de navegación con estilo "Light Reno" (azul claro)
- ✅ Ajuste dinámico del tamaño del modal según orientación de la imagen

#### Logo y Branding
- ✅ Nuevo logo para dark mode con diseño circular y segmento azul
- ✅ Logo clicable que redirige al home
- ✅ Logo responsive en mobile y desktop

#### Headers y Alineación
- ✅ Headers alineados con la línea del sidebar
- ✅ Padding consistente entre home y kanban
- ✅ Mejoras visuales en navbar L1

### 5. **Internacionalización (i18n)**
- ✅ Traducciones completas para modal de ayuda (español/inglés)
- ✅ Traducciones completas para página de notificaciones (español/inglés)
- ✅ Locale dinámico para fechas relativas (date-fns)

### 6. **Sincronización con Airtable**

#### Technical Construction
- ✅ Sincronización correcta desde tabla `Transactions` en Airtable
- ✅ Campo ID: `fldtTmer8awVKDx7Y`
- ✅ Script `update-technical-construction.ts` para actualización masiva
- ✅ Mapeo mejorado en `sync-from-airtable.ts`

#### Estimated Visit Date
- ✅ Detección inteligente de record ID de Airtable
- ✅ Soporte para record IDs directos (formato `recXXXXXXXXXXXXXX`)
- ✅ Fallback a búsqueda por Property ID cuando sea necesario

---

## 📁 Archivos Nuevos

### Componentes
- `components/reno/help-modal.tsx` - Modal de ayuda con formulario de dos pasos
- `components/reno/property-combobox.tsx` - Combobox para selección de propiedades
- `components/reno/property-map.tsx` - Componente de Google Maps para propiedades

### Hooks
- `hooks/useHelpConversations.ts` - Hook para gestionar conversaciones de ayuda con real-time

### Páginas
- `app/reno/construction-manager/notifications/page.tsx` - Página de notificaciones
- `app/api/webhooks/help-response/route.ts` - Endpoint para recibir respuestas de n8n

### Migraciones
- `supabase/migrations/003_help_conversations.sql` - Migración para tabla de conversaciones

### Assets
- `public/vistral-logo-dark.svg` - Nuevo logo para dark mode
- `public/login-left.jpeg` - Nueva imagen de login

---

## 🔧 Archivos Modificados

### Componentes
- `components/reno/reno-sidebar.tsx` - Integración de modal de ayuda y logo clicable
- `components/reno/reno-kanban-filters.tsx` - Filtros múltiples mejorados
- `components/reno/reno-kanban-header.tsx` - Ajustes de padding y alineación
- `components/reno/reno-home-header.tsx` - Ajustes de padding y alineación
- `components/reno/property-summary-tab.tsx` - Integración de Google Maps e image viewer mejorado
- `components/vistral-logo.tsx` - Soporte para logo dark mode
- `components/layout/navbar-l1.tsx` - Ajustes de padding
- `components/architectural-wireframe-background.tsx` - Soporte para login-left.jpeg

### Hooks
- `hooks/useSupabaseKanbanProperties.ts` - Inclusión de supabaseProperty en conversión

### Librerías
- `lib/airtable/sync-from-airtable.ts` - Mapeo mejorado de Technical construction
- `lib/airtable/sync-upcoming-settlements.ts` - Ajustes menores
- `lib/i18n/translations.ts` - Traducciones para help y notifications

### Scripts
- `scripts/update-technical-construction.ts` - Script mejorado para sincronización desde Transactions
- `scripts/debug-estimated-visit-sync.ts` - Mejoras en logging

---

## 🐛 Correcciones

1. **Technical Construction Sync**: Corregida la sincronización para obtener valores desde tabla `Transactions` en lugar de `Properties`
2. **Estimated Visit Date**: Mejorada la detección de record IDs de Airtable
3. **Image Viewer**: Corregido el zoom y tamaño del modal para imágenes verticales
4. **Logo Dark Mode**: Implementado logo específico para dark mode
5. **Alineación Headers**: Corregida la alineación de headers con sidebar

---

## 🧪 Testing Realizado

✅ **Filtros de Kanban**: Verificado funcionamiento con múltiples valores y lógica OR  
✅ **Modal de Ayuda**: Probado flujo completo de envío de mensajes  
✅ **Notificaciones**: Verificado sistema de real-time y badge de no leídos  
✅ **Google Maps**: Probado geocodificación y visualización de mapas  
✅ **Technical Construction**: Ejecutado script de sincronización masiva (116 propiedades actualizadas)  
✅ **i18n**: Verificado traducciones en español e inglés  
✅ **Logo Dark Mode**: Verificado cambio automático según tema  

---

## 📝 Checklist para Review

- [x] Nuevas funcionalidades implementadas
- [x] Correcciones de bugs aplicadas
- [x] Traducciones completas (español/inglés)
- [x] Testing manual realizado
- [x] Documentación actualizada
- [ ] Testing en ambiente de desarrollo
- [ ] Verificar migración de Supabase en producción

---

## 🚀 Próximos Pasos

1. Merge a `upstream/dev`
2. Ejecutar migración de Supabase en producción (`003_help_conversations.sql`)
3. Verificar funcionamiento de webhook con n8n
4. Monitorear sincronización de Technical Construction
5. Verificar Google Maps en producción

---

## 🔑 Variables de Entorno Requeridas

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - API key de Google Maps
- `NEXT_PUBLIC_N8N_WEBHOOK_URL` - URL del webhook de n8n (ya configurado en código)
- Variables existentes de Supabase y Airtable

---

**Branch**: `develop` → `upstream/dev`  
**Autor**: Manuel  
**Fecha**: 2025-11-25
