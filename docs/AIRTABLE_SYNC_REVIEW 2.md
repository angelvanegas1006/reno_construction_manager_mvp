# 📊 Revisión de Sincronización Airtable ↔ Supabase

## ✅ Fases con Sincronización Completa

### 1. **upcoming-settlements** ✅
- **Script**: `lib/airtable/sync-upcoming-settlements.ts`
- **View ID**: `viwpYQ0hsSSdFrSD1`
- **Set Up Status**: `Pending to visit`
- **Campos sincronizados**:
  - ✅ Address, Type, Renovation type
  - ✅ Set Up Status, Stage
  - ✅ Keys Location, Client email
  - ✅ Area Cluster, Property Unique ID
  - ✅ Technical construction
  - ✅ Responsible Owner
  - ✅ Hubspot ID
  - ✅ Renovator Name
  - ✅ Estimated Visit Date
  - ✅ Estimated Reno End Date, Reno Start Date
  - ✅ Pics URLs (desde Properties)
  - ✅ Unique ID From Engagements
- **Lógica especial**: 
  - Sin fecha → `upcoming-settlements`
  - Con fecha → `initial-check`

### 2. **reno-budget** ✅
- **Script**: `lib/airtable/sync-upcoming-reno-budget.ts`
- **View ID**: `viwKS3iOiyX5iu5zP`
- **Set Up Status**: `Pending to validate Budget (Client & renovator) & Reno to start`
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `reno-budget`

### 3. **initial-check** ✅
- **Script**: `lib/airtable/sync-initial-check.ts`
- **View ID**: `viwFZZ5S3VFCfYP6g`
- **Set Up Status**: `Initial Check` / `Check inicial`
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `initial-check`

### 4. **reno-in-progress** ✅
- **Script**: `lib/airtable/sync-reno-in-progress.ts`
- **View ID**: `viwQUOrLzUrScuU4k`
- **Set Up Status**: `Reno In Progress` / `Obras en proceso`
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `reno-in-progress`

### 5. **furnishing-cleaning** ✅
- **Script**: `lib/airtable/sync-furnishing-cleaning.ts`
- **View ID**: `viw9NDUaeGIQDvugU`
- **Set Up Status**: `Cleaning & Furnishing` / `Limpieza y amoblamiento`
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `furnishing-cleaning`

### 6. **final-check** ✅
- **Script**: `lib/airtable/sync-final-check.ts`
- **View ID**: `viwnDG5TY6wjZhBL2`
- **Set Up Status**: `Final Check` / `Check final`
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `final-check`

## ⚠️ Fases SIN Sincronización Dedicada

### 7. **upcoming** ⚠️ (PARCIALMENTE IMPLEMENTADO)
- **Script**: `lib/airtable/sync-upcoming.ts` ✅ CREADO
- **View ID**: `PLACEHOLDER_VIEW_ID` ⚠️ **NECESITA CONFIGURACIÓN**
- **Set Up Status**: `Pending to validate budget`, `Reno to start`, `Proximas propiedades`
- **Estado**: Script creado pero necesita View ID real de Airtable
- **Campos sincronizados**: Todos los mismos que upcoming-settlements
- **Lógica**: Todas las propiedades de esta view → `upcoming`
- **⚠️ ACCIÓN REQUERIDA**: Obtener el View ID real de Airtable y reemplazar `PLACEHOLDER_VIEW_ID`

### 8. **reno-fixes** ❌
- **Estado**: NO tiene sincronización
- **Mapeo**: No definido (TODO en kanban-mapping.ts)
- **Recomendación**: Definir Set Up Status y crear script de sincronización

### 9. **done** ❌
- **Estado**: NO tiene sincronización
- **Mapeo**: No definido (TODO en kanban-mapping.ts)
- **Recomendación**: Definir Set Up Status y crear script de sincronización

## 📋 Campos Sincronizados (Comunes a todas las fases)

Todos los scripts usan `syncPropertiesFromAirtable()` que sincroniza:

### Campos Directos de Transactions:
- ✅ `id` (Unique ID From Engagements)
- ✅ `address`
- ✅ `type`
- ✅ `renovation_type` (Required reno)
- ✅ `notes` (Set up team notes)
- ✅ `Set Up Status`
- ✅ `keys_location`
- ✅ `stage`
- ✅ `Client email`
- ✅ `Unique ID From Engagements`

### Campos de Tabla Relacionada Properties:
- ✅ `area_cluster`
- ✅ `property_unique_id`
- ✅ `Technical construction` (field ID: fldtTmer8awVKDx7Y)
- ✅ `pics_urls` (field ID: fldq1FLXBToYEY9W3) - **PRIORIDAD desde Properties**

### Campos de Tabla Relacionada Team Profiles:
- ✅ `responsible_owner`

### Campos de Tabla Relacionada Engagements:
- ✅ `Hubspot ID`

### Campos Específicos por Fase:
- ✅ `next_reno_steps` (Initial Check)
- ✅ `Renovator name`
- ✅ `Estimated Visit Date` (fldIhqPOAFL52MMBn)
- ✅ `estimated_end_date` (Est. Reno End Date)
- ✅ `start_date` (Reno Start Date)

### Metadatos:
- ✅ `airtable_property_id`
- ✅ `updated_at`
- ✅ `reno_phase` (determinado por Set Up Status)

## 🔄 Sincronización Bidireccional

### Airtable → Supabase:
- ✅ Webhooks configurados (ver `lib/airtable/webhook-processor.ts`)
- ✅ Cron job ejecuta sync completo 6 veces al día
- ✅ Scripts individuales por fase

### Supabase → Airtable:
- ✅ `lib/airtable/phase-sync.ts` - Sincroniza cambios de fase
- ✅ `lib/airtable/initial-check-sync.ts` - Sincroniza comentarios de Initial Check
- ✅ `lib/airtable/client.ts` - Funciones `updateAirtableWithRetry` y `findRecordByPropertyId`

## 🚨 Problemas Identificados

1. **Fase "upcoming" sin View ID configurado**: Script creado pero necesita View ID real de Airtable
2. **Fases "reno-fixes" y "done" sin mapeo**: Necesitan definición de Set Up Status y scripts
3. **Campos `next_update` y `last_update`**: Existen en Supabase pero no se sincronizan desde Airtable (pueden calcularse automáticamente)
4. **Campo `real_settlement_date`**: Mencionado en código pero no se sincroniza explícitamente

## 📝 Recomendaciones

1. **Configurar View ID para fase "upcoming"**:
   - ✅ Script creado: `lib/airtable/sync-upcoming.ts`
   - ✅ Agregado a `sync-all-phases.ts`
   - ⚠️ **ACCIÓN REQUERIDA**: Obtener View ID real de Airtable y reemplazar `PLACEHOLDER_VIEW_ID` en `sync-upcoming.ts`

2. **Definir fases "reno-fixes" y "done"**:
   - Definir valores de "Set Up Status" en Airtable
   - Agregar mapeos en `kanban-mapping.ts`
   - Crear scripts de sincronización si es necesario

3. **Verificar campos de cards**:
   - ✅ `uniqueIdFromEngagements` - Sincronizado
   - ✅ `fullAddress` - Sincronizado (address)
   - ✅ `region` - Sincronizado (area_cluster)
   - ✅ `renoType` - Sincronizado (renovation_type)
   - ✅ `renovador` - Sincronizado (Renovator name)
   - ✅ `estimatedVisitDate` - Sincronizado (Estimated Visit Date)
   - ⚠️ `proximaActualizacion` - Existe en Supabase (`next_update`) pero no se sincroniza desde Airtable (puede calcularse automáticamente)
   - ⚠️ `ultimaActualizacion` - Existe en Supabase (`last_update`) pero no se sincroniza desde Airtable (puede calcularse automáticamente)
   - ⚠️ `realSettlementDate` - Mencionado pero no se sincroniza explícitamente

4. **Documentar Views de Airtable**:
   - Crear documentación de todas las views usadas
   - Incluir filtros y criterios de cada view

## ✅ Resumen de Campos en Cards vs Sincronización

| Campo en Card | Campo en Supabase | Sincronizado desde Airtable | Estado |
|---------------|-------------------|----------------------------|--------|
| `uniqueIdFromEngagements` | `Unique ID From Engagements` | ✅ Sí | OK |
| `fullAddress` | `address` | ✅ Sí | OK |
| `region` | `area_cluster` | ✅ Sí | OK |
| `renoType` | `renovation_type` | ✅ Sí | OK |
| `renovador` | `Renovator name` | ✅ Sí | OK |
| `estimatedVisitDate` | `Estimated Visit Date` | ✅ Sí | OK |
| `proximaActualizacion` | `next_update` | ⚠️ No (calculado) | Revisar |
| `ultimaActualizacion` | `last_update` | ⚠️ No (calculado) | Revisar |
| `realSettlementDate` | `real_settlement_date` | ⚠️ No | Revisar |

