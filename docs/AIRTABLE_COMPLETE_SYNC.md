# 🔄 Sincronización Completa Airtable → Supabase

## 📋 Resumen

Este sistema sincroniza **todas las fases del kanban** desde Airtable hacia Supabase, asegurando que las propiedades en Supabase coincidan exactamente con las views de Airtable.

## 🎯 Funcionalidad

- **Sync Completo**: Sincroniza todas las fases del kanban en una sola ejecución
- **Cron Job Automático**: Se ejecuta 6 veces al día (8:00, 10:30, 13:00, 15:30, 18:00, 20:30)
- **Alineación Exacta**: Las propiedades en Supabase coinciden exactamente con las views de Airtable
- **Manejo de Fases**: Respeta las fechas y estados para asignar correctamente las fases

## 📊 Fases Sincronizadas

### 1. Upcoming Settlements (Upcoming Reno)
- **View ID**: `viwpYQ0hsSSdFrSD1`
- **Fase en Supabase**: `upcoming-settlements`
- **Lógica**: 
  - Propiedades sin fecha → `upcoming-settlements`
  - Propiedades con fecha → `initial-check`

### 2. Upcoming Reno Budget
- **View ID**: `viwKS3iOiyX5iu5zP`
- **Fase en Supabase**: `reno-budget`
- **Lógica**: Todas las propiedades de esta view → `reno-budget`

### 3. Initial Check
- **View ID**: `viwFZZ5S3VFCfYP6g`
- **Fase en Supabase**: `initial-check`
- **Lógica**: Todas las propiedades de esta view → `initial-check`

### 4. Reno In Progress
- **View ID**: `viwQUOrLzUrScuU4k`
- **Fase en Supabase**: `reno-in-progress`
- **Lógica**: Todas las propiedades de esta view → `reno-in-progress`

### 5. Furnishing & Cleaning
- **View ID**: `viw9NDUaeGIQDvugU`
- **Fase en Supabase**: `furnishing-cleaning`
- **Lógica**: Todas las propiedades de esta view → `furnishing-cleaning`

### 6. Final Check
- **View ID**: `viwnDG5TY6wjZhBL2`
- **Fase en Supabase**: `final-check`
- **Lógica**: Todas las propiedades de esta view → `final-check`

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_AIRTABLE_API_KEY=pat...
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Requerido para cron jobs
CRON_SECRET=your-secret-here  # Opcional, para seguridad adicional
```

### Cron Jobs en Vercel

Los cron jobs están configurados en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/sync-airtable", "schedule": "0 8 * * *" },
    { "path": "/api/cron/sync-airtable", "schedule": "30 10 * * *" },
    { "path": "/api/cron/sync-airtable", "schedule": "0 13 * * *" },
    { "path": "/api/cron/sync-airtable", "schedule": "30 15 * * *" },
    { "path": "/api/cron/sync-airtable", "schedule": "0 18 * * *" },
    { "path": "/api/cron/sync-airtable", "schedule": "30 20 * * *" }
  ]
}
```

**Horarios**: 8:00, 10:30, 13:00, 15:30, 18:00, 20:30 (hora local del servidor)

## 🚀 Uso

### Ejecutar Sync Completo Manualmente

```bash
npm run sync:all-phases
```

### Ejecutar Sync de una Fase Específica

```bash
npm run sync:upcoming-settlements
npm run sync:upcoming-reno-budget
npm run sync:initial-check
npm run sync:reno-in-progress
npm run sync:furnishing-cleaning
npm run sync:final-check
```

### Ejecutar Sync desde API (Testing)

```bash
# GET request
curl -X GET https://your-domain.com/api/cron/sync-airtable \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# POST request (también funciona)
curl -X POST https://your-domain.com/api/cron/sync-airtable \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 📝 Flujo de Sincronización

1. **Sync por Fase**: Cada fase se sincroniza desde su view específica de Airtable
2. **Asignación de Fase**: Las propiedades se asignan a la fase correcta según su view
3. **Manejo de Fechas**: Las propiedades con fecha en "upcoming-settlements" se mueven automáticamente a "initial-check"
4. **Limpieza**: Se identifican propiedades que ya no están en ninguna view (solo reporte, no eliminación automática)
5. **Resumen**: Se genera un resumen completo de todas las sincronizaciones

## 🔍 Monitoreo

### Logs del Sync

El sync genera logs detallados para cada fase:

```
🔄 Starting complete Airtable sync for all phases...

📋 Phase 1: Upcoming Settlements (Upcoming Reno)
============================================================
✅ Upcoming Settlements: 5 created, 10 updated, 0 errors

📋 Phase 2: Upcoming Reno Budget
============================================================
✅ Upcoming Reno Budget: 2 created, 3 updated, 0 errors

...

📊 Complete Sync Summary
============================================================
Total Created: 15
Total Updated: 25
Total Errors: 0
Duration: 12.34s
============================================================
```

### Propiedades para Revisar

Si hay propiedades que ya no están en ninguna view de Airtable, se reportan:

```
⚠️  Found 3 properties in synced phases that are not in any Airtable view:
   - SP-XXX-XXX-XXXXXX (upcoming-settlements) - Set Up Status: Pending to visit
   - SP-YYY-YYY-YYYYYY (initial-check) - Set Up Status: initial check
   ...
```

## ⚠️ Notas Importantes

1. **No Eliminación Automática**: Las propiedades que ya no están en ninguna view NO se eliminan automáticamente. Solo se reportan para revisión manual.

2. **Orden de Ejecución**: Los syncs se ejecutan en orden específico para evitar conflictos:
   - Upcoming Settlements → Upcoming Reno Budget → Initial Check → Reno In Progress → Furnishing & Cleaning → Final Check

3. **Manejo de Errores**: Si una fase falla, el sync continúa con las siguientes fases. Los errores se reportan en el resumen final.

4. **Frecuencia**: El cron job se ejecuta 6 veces al día para mantener las propiedades sincronizadas.

5. **Idempotencia**: El sync es idempotente - puede ejecutarse múltiples veces sin causar problemas.

## 🐛 Troubleshooting

### El sync no encuentra propiedades

- Verificar que las views de Airtable estén configuradas correctamente
- Verificar que los filtros en Airtable coincidan con los esperados
- Verificar las variables de entorno (API key, Base ID)

### Propiedades aparecen en fase incorrecta

- Verificar que el `Set Up Status` en Airtable coincida con la fase esperada
- Verificar que las views de Airtable tengan los filtros correctos
- Ejecutar el sync manualmente y revisar los logs

### Errores de Airtable

- Verificar que la API key tenga permisos suficientes
- Verificar que los nombres de campos en Airtable coincidan con los esperados
- Revisar los logs para identificar el campo específico que causa el error

## 📚 Archivos Relacionados

- `lib/airtable/sync-all-phases.ts` - Sync maestro
- `lib/airtable/sync-upcoming-settlements.ts` - Sync de Upcoming Settlements
- `lib/airtable/sync-initial-check.ts` - Sync de Initial Check
- `lib/airtable/sync-reno-in-progress.ts` - Sync de Reno In Progress
- `lib/airtable/sync-furnishing-cleaning.ts` - Sync de Furnishing & Cleaning
- `lib/airtable/sync-final-check.ts` - Sync de Final Check
- `app/api/cron/sync-airtable/route.ts` - Endpoint de API para cron job
- `scripts/sync-all-phases.ts` - Script para ejecución manual






