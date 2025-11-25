# ✅ Implementación: Sincronización Airtable → Supabase

## 📦 Archivos Creados/Modificados

### Nuevos Archivos

1. **`lib/airtable/sync-from-airtable.ts`**
   - Función principal de sincronización
   - Lee propiedades de Airtable con filtros
   - Crea/actualiza propiedades en Supabase
   - Maneja lógica de actualización inteligente

2. **`app/api/cron/sync-airtable/route.ts`**
   - API route para cron jobs de Vercel
   - Verifica autenticación del cron
   - Retorna resultados de sincronización

3. **`lib/supabase/admin.ts`**
   - Cliente de Supabase con service_role key
   - Para operaciones administrativas (cron jobs)

4. **`scripts/test-airtable-sync.ts`**
   - Script para probar sincronización manualmente
   - Verifica variables de entorno
   - Muestra resultados detallados

5. **`supabase/migrations/002_add_airtable_sync_columns.sql`**
   - Migración SQL para agregar columnas nuevas
   - Crea índices para mejorar performance

6. **`docs/AIRTABLE_SYNC_SETUP.md`**
   - Documentación completa de configuración
   - Guía de troubleshooting

### Archivos Modificados

1. **`vercel.json`**
   - Agregados 6 cron jobs con horarios:
     - 8:00, 10:30, 13:00, 15:30, 18:00, 20:30

2. **`package.json`**
   - Agregado script: `test:sync-airtable`

## 🔧 Configuración Requerida

### Variables de Entorno en Vercel

```env
NEXT_PUBLIC_AIRTABLE_API_KEY=pat...
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Requerido
```

### Migración SQL

Ejecutar en Supabase SQL Editor:

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

## 🎯 Funcionalidad

### Filtros Aplicados

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

### Comportamiento

- **Nueva propiedad**: Se crea en fase "upcoming-settlements"
- **Propiedad existente**: Se actualiza solo si está en "upcoming-settlements" y hay cambios
- **Propiedad movida manualmente**: NO se modifica (respeta la fase actual)
- **Propiedad que ya no cumple filtros**: Se deja como está

## 🧪 Probar

### Desarrollo Local

```bash
# Probar manualmente
npm run test:sync-airtable

# O con curl
curl http://localhost:3000/api/cron/sync-airtable
```

### Producción

```bash
# Probar manualmente desde Vercel
curl https://dev.vistral.io/api/cron/sync-airtable
```

## 📊 Respuesta del API

```json
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

## ⚠️ Notas Importantes

1. **Service Role Key**: Requerido para operaciones administrativas. Nunca exponer en el cliente.

2. **Cron Jobs**: Solo funcionan en producción (Vercel). En desarrollo, usar el script de prueba.

3. **Rate Limits**: Airtable tiene límites de rate (5 req/seg). El código maneja esto con retry automático.

4. **Idempotencia**: La sincronización es idempotente - puede ejecutarse múltiples veces sin duplicar datos.

5. **Logs**: Revisar logs en Vercel Dashboard → Deployments → Functions

## 🚀 Próximos Pasos

1. ✅ Ejecutar migración SQL en Supabase
2. ✅ Configurar variables de entorno en Vercel
3. ✅ Probar manualmente con `npm run test:sync-airtable`
4. ✅ Verificar que los cron jobs se ejecuten correctamente
5. ✅ Monitorear logs en Vercel

## 📝 Campos Mapeados

| Airtable | Supabase | Tipo |
|----------|----------|------|
| Unique ID (From Engagements) | `id` | Primary Key |
| Address | `address`, `full_address` | TEXT |
| Type | `type`, `property_type` | TEXT |
| Required Reno | `renovation_type` | TEXT |
| Area Cluster | `area_cluster` | TEXT |
| SetUp Team Notes | `notes`, `setup_status_notes` | TEXT |
| Set up status | `Set Up Status` | TEXT |
| Hubspot ID | `Hubspot ID` | NUMBER |
| Property Unique ID | `property_unique_id` | TEXT |
| Keys Location | `keys_location` | TEXT |
| Stage | `stage` | TEXT |
| Responsible Owner | `responsible_owner` | TEXT |
| Client email | `Client email` | TEXT |
| Technical Constructor | `Technical construction` | TEXT |


