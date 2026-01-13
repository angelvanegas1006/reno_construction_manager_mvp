# 📸 Análisis Completo: Gestión de Imágenes y Videos

## 📋 Estado Actual del Sistema

### 1. **Fotos de Propiedades (pics_urls)**

#### ✅ **Lo que funciona:**
- **Sincronización Airtable → Supabase**: 
  - Las URLs de fotos se sincronizan desde Airtable (campo `fldq1FLXBToYEY9W3`)
  - Se guardan en `properties.pics_urls` (TEXT[])
  - Se actualizan solo en fase `upcoming-settlements` (primera fase)
  - En otras fases, solo se insertan si no existen (no se sobrescriben)

#### ⚠️ **Problemas identificados:**
- **No hay sincronización bidireccional**: Las fotos solo vienen de Airtable, no se pueden subir desde la app
- **Lógica de actualización compleja**: Solo se actualizan en primera fase, puede causar inconsistencias
- **No hay validación de URLs**: No se verifica si las URLs siguen siendo válidas

#### 📍 **Ubicación del código:**
- `lib/airtable/sync-unified.ts` (líneas 243-286)
- `lib/airtable/sync-from-airtable.ts` (líneas 537-589, 725-750)
- `supabase/migrations/011_add_pics_urls_to_properties.sql`

---

### 2. **Fotos/Videos del Checklist (Initial Check)**

#### ✅ **Lo que funciona:**
- **Subida a Supabase Storage**: 
  - Bucket: `inspection-images`
  - Path: `{propertyId}/{inspectionId}/{zoneId}/{fileName}`
  - Conversión base64 → File → Supabase Storage
  - URLs públicas generadas automáticamente

- **Guardado en Base de Datos**:
  - Tabla: `inspection_elements`
  - Campo: `image_urls` (TEXT[]) para fotos
  - Campo: `video_urls` (TEXT[]) existe pero **NO SE USA**

#### ❌ **Problemas críticos:**

1. **Videos NO se guardan correctamente**:
   ```typescript
   // lib/supabase/checklist-converter.ts línea 147-155
   elements.push({
     zone_id: zoneId,
     element_name: `videos-${uploadZone.id}`,
     condition: null,
     image_urls: null,  // ❌ Debería ser video_urls
     notes: null,
     quantity: null,
     exists: null,
   });
   ```
   - Los videos se suben a Storage pero NO se guardan en `video_urls`
   - Se crea el elemento pero sin las URLs

2. **Videos NO se cargan desde Supabase**:
   ```typescript
   // lib/supabase/checklist-converter.ts línea 492-497
   } else if (element.element_name.startsWith('videos-')) {
     // Videos no están soportados en el esquema actual
     dynamicItem.uploadZone.videos = [];  // ❌ Siempre vacío
   }
   ```
   - Comentario dice "no soportados"
   - Siempre se deja como array vacío

3. **Tipo TypeScript incompleto**:
   - `InspectionElement` en `lib/supabase/types.ts` NO tiene `video_urls`
   - Falta en Row/Insert/Update

4. **No hay sincronización con Airtable**:
   - Las fotos/videos del checklist NO se sincronizan a Airtable
   - Solo se sincroniza progreso y estado completado
   - Las URLs quedan solo en Supabase

#### 📍 **Ubicación del código:**
- `lib/supabase/storage-upload.ts` (subida de archivos)
- `lib/supabase/checklist-converter.ts` (conversión checklist ↔ Supabase)
- `hooks/useSupabaseChecklist.ts` (guardado automático)
- `lib/airtable/initial-check-sync.ts` (sincronización Airtable)

---

### 3. **Visualización en UI**

#### ✅ **Lo que funciona:**
- **Fotos de propiedades**: Se muestran en `PropertySummaryTab`
- **Fotos del checklist**: Se muestran en `ChecklistUploadZone`
- **Videos del checklist**: Se muestran en `ChecklistUploadZone` (pero no se cargan desde DB)

#### ⚠️ **Problemas:**
- Si los videos no se cargan desde DB, no se muestran al recargar la página
- No hay manejo de errores para URLs rotas
- No hay optimización de imágenes (lazy loading, thumbnails)

---

## 🎯 Plan de Acción

### **Fase 1: Corregir Videos del Checklist** (Prioridad ALTA)

#### **Tarea 1.1: Actualizar tipos TypeScript**
- [ ] Agregar `video_urls` a `InspectionElement` en `lib/supabase/types.ts`
- [ ] Incluir en Row, Insert y Update

#### **Tarea 1.2: Corregir guardado de videos**
- [ ] Modificar `convertUploadZonesToElements` para usar `video_urls` en lugar de `image_urls` para videos
- [ ] Asegurar que las URLs de videos se asignen correctamente

#### **Tarea 1.3: Corregir carga de videos**
- [ ] Modificar `convertSupabaseToChecklist` para leer `video_urls` de los elementos
- [ ] Mapear URLs a `FileUpload` objects para videos
- [ ] Eliminar comentario "no soportados"

#### **Tarea 1.4: Verificar migración SQL**
- [ ] Confirmar que `video_urls` existe en `inspection_elements`
- [ ] Si no existe, ejecutar migración

**Archivos a modificar:**
- `lib/supabase/types.ts`
- `lib/supabase/checklist-converter.ts` (2 funciones)
- `supabase/migrations/001_checklist_migrations.sql` (verificar)

---

### **Fase 2: Sincronización Checklist → Airtable** (Prioridad MEDIA)

#### **Tarea 2.1: Investigar campo en Airtable**
- [ ] Identificar campo en Airtable para guardar URLs del checklist
- [ ] Verificar si existe campo "Checklist Photos" o similar
- [ ] Si no existe, decidir si crear nuevo campo o usar campo existente

#### **Tarea 2.2: Implementar sincronización**
- [ ] Modificar `syncChecklistToAirtable` para incluir URLs de fotos/videos
- [ ] Agregar función para recopilar todas las URLs del checklist
- [ ] Actualizar Airtable con las URLs al guardar cada sección

#### **Tarea 2.3: Sincronización al finalizar**
- [ ] Modificar `finalizeInitialCheckInAirtable` para incluir URLs finales
- [ ] Asegurar que todas las URLs se sincronicen al completar checklist

**Archivos a modificar:**
- `lib/airtable/initial-check-sync.ts`
- `hooks/useSupabaseChecklist.ts`

---

### **Fase 3: Mejoras en Gestión de Imágenes** (Prioridad BAJA)

#### **Tarea 3.1: Validación de URLs**
- [ ] Agregar función para verificar si URLs siguen siendo válidas
- [ ] Limpiar URLs rotas periódicamente
- [ ] Mostrar placeholder si URL no carga

#### **Tarea 3.2: Optimización de imágenes**
- [ ] Implementar lazy loading para imágenes
- [ ] Generar thumbnails para previews
- [ ] Comprimir imágenes antes de subir

#### **Tarea 3.3: Manejo de errores**
- [ ] Agregar manejo de errores al cargar imágenes
- [ ] Mostrar mensajes informativos al usuario
- [ ] Logging de errores para debugging

---

### **Fase 4: Documentación y Testing** (Prioridad MEDIA)

#### **Tarea 4.1: Documentar flujo completo**
- [ ] Crear diagrama de flujo de imágenes/videos
- [ ] Documentar estructura de Storage
- [ ] Documentar sincronización Airtable ↔ Supabase

#### **Tarea 4.2: Testing**
- [ ] Probar subida de videos en checklist
- [ ] Probar carga de videos desde DB
- [ ] Probar sincronización con Airtable
- [ ] Probar con múltiples propiedades

---

## 📊 Resumen de Problemas

| Problema | Severidad | Impacto | Estado |
|----------|-----------|---------|--------|
| Videos no se guardan en DB | 🔴 CRÍTICO | Alto | Pendiente |
| Videos no se cargan desde DB | 🔴 CRÍTICO | Alto | Pendiente |
| Tipo TypeScript incompleto | 🟡 MEDIO | Medio | Pendiente |
| No hay sync Checklist → Airtable | 🟡 MEDIO | Medio | Pendiente |
| No hay validación de URLs | 🟢 BAJO | Bajo | Pendiente |
| No hay optimización imágenes | 🟢 BAJO | Bajo | Pendiente |

---

## 🚀 Próximos Pasos Inmediatos

1. **Corregir videos del checklist** (Fase 1)
   - Tiempo estimado: 2-3 horas
   - Impacto: Alto
   - Riesgo: Bajo

2. **Implementar sincronización Airtable** (Fase 2)
   - Tiempo estimado: 3-4 horas
   - Impacto: Medio
   - Riesgo: Medio (requiere verificar campos en Airtable)

3. **Mejoras y optimizaciones** (Fase 3-4)
   - Tiempo estimado: 4-6 horas
   - Impacto: Bajo-Medio
   - Riesgo: Bajo

---

## 📝 Notas Técnicas

### Estructura de Storage
```
inspection-images/
  {propertyId}/
    {inspectionId}/
      {zoneId}/
        {timestamp}_{random}.{ext}
```

### Estructura de Base de Datos
```sql
-- Properties
properties.pics_urls: TEXT[]  -- URLs de fotos de Airtable

-- Checklist
inspection_elements.image_urls: TEXT[]  -- URLs de fotos del checklist
inspection_elements.video_urls: TEXT[]  -- URLs de videos del checklist (NO SE USA)
```

### Flujo Actual
1. **Fotos de propiedades**: Airtable → Supabase (solo lectura)
2. **Fotos checklist**: App → Supabase Storage → Supabase DB (solo escritura)
3. **Videos checklist**: App → Supabase Storage → ❌ NO SE GUARDAN EN DB

---

## ✅ Checklist de Implementación

- [ ] Fase 1: Corregir videos del checklist
- [ ] Fase 2: Sincronización Checklist → Airtable
- [ ] Fase 3: Mejoras en gestión de imágenes
- [ ] Fase 4: Documentación y testing

---

**Última actualización**: 2024-12-19
**Entorno**: Development (dev)
**Branch**: develop

