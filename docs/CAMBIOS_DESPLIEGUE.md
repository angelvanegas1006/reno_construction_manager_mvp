# 📋 Cambios Principales que Deberían Estar Visibles en dev.vistral.io

## ✅ Cambios Implementados y Pusheados al Branch `dev`

### 1. 🗓️ Calendario Unificado de Visitas y Recordatorios
- **Componente**: `VisitsCalendar` (`components/reno/visits-calendar.tsx`)
- **Ubicación**: Home page (`/reno/construction-manager`)
- **Funcionalidad**:
  - Vista diaria (8:00 AM - 8:00 PM) y semanal
  - Crear visitas: initial-check, final-check, obra-seguimiento
  - Crear recordatorios
  - Ver detalles al hacer click (dirección, último comentario)
  - Navegar a la tarea desde el popup

### 2. 📑 Tabs en Página de Propiedad
- **Componentes**:
  - `PropertyTabs` - Navegación entre tabs
  - `PropertyActionTab` - Tab "Tareas" (antes "Acción")
  - `PropertySummaryTab` - Tab "Resumen"
  - `PropertyStatusTab` - Tab "Estado de la propiedad"
- **Ubicación**: `/reno/construction-manager/property/[id]`
- **Funcionalidad**:
  - 4 tabs: Tareas, Resumen, Estado de la propiedad, Presupuesto de reforma
  - Tab "Tareas" es el default
  - Muestra información de ejecución y acciones pendientes

### 3. 💬 Comentarios en Sidebar
- **Componente**: `PropertyCommentsSection` (en `PropertyStatusSidebar`)
- **Ubicación**: Sidebar derecho en página de propiedad
- **Funcionalidad**:
  - Sección colapsable/expandible
  - Formulario para agregar comentarios
  - Historial de comentarios
  - Soporte para @mentions
  - Crear recordatorios desde comentarios

### 4. 🔔 Recordatorios y Visitas
- **Componentes**:
  - `PropertyRemindersSection` - Recordatorios en sidebar
  - `VisitsAndRemindersSection` - Sección combinada
- **Funcionalidad**:
  - Ver recordatorios próximos
  - Crear recordatorios con fecha/hora
  - Notificaciones automáticas

### 5. 📊 Mejoras en Portfolio
- **Componente**: `RenoHomePortfolio`
- **Ubicación**: Home page
- **Funcionalidad**:
  - Gráfica de barras por fase
  - Tooltip mejorado (no se oculta detrás del título)
  - Usa datos reales de `reno_phase` de Supabase

### 6. 🎨 Navbar L1, L2, L3
- **Componentes**:
  - `NavbarL1` - Navegación principal (listas/tablas)
  - `NavbarL2` - Navegación secundaria (detalles)
  - `NavbarL3` - Navegación de formularios
  - `HeaderL2` - Header con título extenso
  - `HeaderL3` - Header de formularios
- **Funcionalidad**:
  - Navegación consistente según nivel
  - Botones de acción contextuales

### 7. ✅ Integración Initial Check con Airtable
- **Funcionalidad**:
  - Sincronización bidireccional con Airtable
  - Actualización de campos al completar checklist
  - Generación de link público del checklist
  - Cambio de fase automático

### 8. 🔧 Fixes y Mejoras
- Eliminado mensaje "✓ Todos los cambios guardados"
- Botón "Reportar Problema" con diseño mejorado
- Eliminada pantalla "Initial Information" del checklist
- Checklist inicia directamente con contenido
- Traducciones actualizadas (inglés/español)

## 🔍 Verificación de Deployment

### Pasos para Verificar:

1. **Verificar Branch en Vercel**:
   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Git
   - Verifica que el branch de producción sea `dev` o que haya un preview deployment de `dev`

2. **Verificar Último Deployment**:
   - Ve a Vercel Dashboard → Deployments
   - Verifica que el último deployment sea del commit `f3df209`
   - Verifica que el build haya sido exitoso

3. **Verificar Variables de Entorno**:
   - Ve a Vercel Dashboard → Settings → Environment Variables
   - Verifica que todas las variables necesarias estén configuradas:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_AIRTABLE_API_KEY`
     - `NEXT_PUBLIC_AIRTABLE_BASE_ID`
     - `AIRTABLE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_APP_URL`

4. **Limpiar Cache si es Necesario**:
   - En Vercel Dashboard → Deployments → Click en "..." → "Redeploy"
   - Selecciona "Use existing Build Cache" = NO

## 🐛 Troubleshooting

### Si los cambios no aparecen:

1. **Verificar que Vercel esté desplegando desde `dev`**:
   ```bash
   # Ver commits en remoto
   git log origin/dev --oneline -5
   ```

2. **Forzar nuevo deployment**:
   ```bash
   git commit --allow-empty -m "chore: Force redeploy"
   git push origin dev
   ```

3. **Verificar logs de build en Vercel**:
   - Ve a Vercel Dashboard → Deployments → Click en el deployment
   - Revisa los logs de build para errores

4. **Verificar dominio**:
   - Asegúrate de estar viendo `dev.vistral.io` y no otro dominio
   - Verifica que el dominio esté apuntando al deployment correcto

## 📝 Notas Importantes

- Todos los cambios están en el branch `dev`
- El último commit es `f3df209`
- Los cambios requieren que las migraciones SQL estén ejecutadas en Supabase
- Algunos cambios requieren variables de entorno configuradas en Vercel









