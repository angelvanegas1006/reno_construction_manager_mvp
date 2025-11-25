# 🔄 Configuración de Sincronización Airtable → Supabase

## 📋 Resumen

Esta integración sincroniza automáticamente propiedades desde Airtable hacia Supabase, creando tarjetas en la fase "upcoming-settlements" del Reno Construction Manager.

## 🎯 Funcionalidad

- **Cron Job**: Se ejecuta 6 veces al día (8:00, 10:30, 13:00, 15:30, 18:00, 20:30)
- **Filtros**: Solo trae propiedades que cumplen todos los criterios especificados
- **Creación**: Crea nuevas propiedades en Supabase si no existen
- **Actualización**: Actualiza propiedades existentes solo si están en "upcoming-settlements" y han cambiado
- **Protección**: No modifica propiedades que fueron movidas manualmente a otras fases

## 🔧 Configuración

### 1. Variables de Entorno

Asegúrate de tener estas variables configuradas en Vercel:

```env
NEXT_PUBLIC_AIRTABLE_API_KEY=pat...
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Requerido para cron jobs
```

### 2. Ejecutar Migración SQL

Ejecuta la migración en Supabase SQL Editor:

```bash
# Ver el archivo de migración
cat supabase/migrations/002_add_airtable_sync_columns.sql
```

O ejecuta directamente en Supabase Dashboard → SQL Editor:

```sql
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS keys_location TEXT,
ADD COLUMN IF NOT EXISTS responsible_owner TEXT,
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS property_unique_id TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_property_unique_id ON properties(property_unique_id);
CREATE INDEX IF NOT EXISTS idx_properties_stage ON properties(stage);
CREATE INDEX IF NOT EXISTS idx_properties_airtable_property_id ON properties(airtable_property_id);
```

### 3. Configurar Cron Jobs en Vercel

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

**Nota**: Los cron jobs solo funcionan en producción (Vercel). En desarrollo, puedes probar manualmente.

## 🧪 Probar Manualmente

### Opción 1: Desde el Navegador

```bash
# En desarrollo local
curl http://localhost:3000/api/cron/sync-airtable

# En producción
curl https://dev.vistral.io/api/cron/sync-airtable
```

### Opción 2: Script de Prueba

```bash
npm run test:sync-airtable
```

### Opción 3: Desde Vercel Dashboard

1. Ve a tu proyecto en Vercel
2. Settings → Cron Jobs
3. Click en "Run Now" para probar manualmente

## 📊 Filtros Aplicados

Las propiedades deben cumplir **TODOS** estos criterios:

1. ✅ `Stage` = "Presettlement & Settled"
2. ✅ `Set Up status` = "Pending to visit"
3. ✅ `Type` = "Unit & Building"
4. ✅ `Test Flag` != "Test"
5. ✅ `Country` = "Spain"
6. ✅ `Unique ID (From Engagements)` != Empty
7. ✅ `Hubspot ID` != Empty
8. ✅ `Property Unique ID` != Empty
9. ✅ `Real settlement date` < 7 días desde ahora
10. ✅ `Already Tenanted` != "Yes"

## 🔄 Mapeo de Campos

| Campo Airtable | Campo Supabase | Notas |
|----------------|----------------|-------|
| Unique ID (From Engagements) | `id` | ID principal |
| Address | `address`, `full_address` | |
| Type | `type`, `property_type` | |
| Required Reno | `renovation_type` | |
| Area Cluster | `area_cluster` | |
| SetUp Team Notes | `notes`, `setup_status_notes` | |
| Set up status | `Set Up Status` | |
| Hubspot ID | `Hubspot ID` | |
| Property Unique ID | `property_unique_id` | |
| Keys Location | `keys_location` | |
| Stage | `stage` | |
| Responsible Owner | `responsible_owner` | |
| Client email | `Client email` | |
| Technical Constructor | `Technical construction` | |

## 🛡️ Comportamiento de Actualización

- **Nueva propiedad**: Se crea en "upcoming-settlements"
- **Propiedad existente en "upcoming-settlements"**: Se actualiza si hay cambios
- **Propiedad movida manualmente**: NO se modifica (se respeta la fase actual)
- **Propiedad que ya no cumple filtros**: Se deja como está (no se elimina)

## 📝 Logs

Los logs se pueden ver en:

- **Vercel Dashboard** → Deployments → Functions → `/api/cron/sync-airtable`
- **Console logs** en el código (usando `console.log`)

## ⚠️ Troubleshooting

### Error: "Airtable credentials not configured"
- Verifica que `NEXT_PUBLIC_AIRTABLE_API_KEY` y `NEXT_PUBLIC_AIRTABLE_BASE_ID` estén configurados

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado en Vercel
- Esta key es necesaria para operaciones administrativas

### Las propiedades no se están creando
- Verifica los logs en Vercel
- Verifica que los filtros en Airtable sean correctos
- Prueba manualmente con `curl` o el script de prueba

### Las propiedades se están duplicando
- Verifica que `Unique ID (From Engagements)` sea único en Airtable
- Verifica que la migración SQL se haya ejecutado correctamente

## 🔍 Verificar Estado

Para verificar el estado de la sincronización:

```bash
# Ver logs del último cron job
curl https://dev.vistral.io/api/cron/sync-airtable

# Respuesta esperada:
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "created": 5,
  "updated": 2,
  "errors": 0,
  "details": [
    "Created: PROP-001 (Calle Example 123)",
    "Updated: PROP-002 (Calle Example 456)",
    ...
  ]
}
```


