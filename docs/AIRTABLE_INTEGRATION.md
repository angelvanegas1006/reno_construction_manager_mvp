# Integración con Airtable API

## 📋 Resumen

Este documento describe cómo integrar la aplicación con Airtable usando su API REST para sincronizar campos cuando ocurren eventos importantes, como cambios de fase en el Kanban.

## 🎯 Casos de Uso

1. **Cambio de Fase en Kanban**: Cuando una propiedad se mueve de una fase a otra (ej: "upcoming-settlements" → "initial-check")
2. **Completar Checklist**: Cuando se completa un checklist inicial o final
3. **Actualización de Porcentajes**: Cuando se actualizan los porcentajes de categorías de renovación
4. **Cambio de Estado**: Cuando cambia el "Set Up Status" de una propiedad

## 🏗️ Arquitectura Propuesta

### Opción 1: Integración Directa (Recomendada para MVP)

```
Frontend (Next.js)
    ↓ HTTP POST/PATCH
Airtable API REST
    ↓
Airtable Base
```

**Ventajas:**
- ✅ Simple y directo
- ✅ No requiere infraestructura adicional
- ✅ Rápido de implementar

**Desventajas:**
- ⚠️ Rate limits de Airtable (5 requests/segundo por base)
- ⚠️ Lógica de negocio en el frontend

### Opción 2: Integración vía n8n (Recomendada para Producción)

```
Frontend (Next.js)
    ↓ HTTP POST
Supabase (Trigger/Function)
    ↓ Webhook
n8n Workflow
    ↓ Airtable API
Airtable Base
```

**Ventajas:**
- ✅ Manejo de rate limits
- ✅ Lógica de negocio centralizada
- ✅ Retry automático en caso de errores
- ✅ Logging y monitoreo
- ✅ Transformación de datos antes de enviar

**Desventajas:**
- ⚠️ Requiere configuración de n8n
- ⚠️ Más complejo inicialmente

## 📦 Setup Inicial

### 1. Obtener Credenciales de Airtable

1. Ir a https://airtable.com/api
2. Seleccionar tu base
3. Copiar:
   - **Base ID**: `appXXXXXXXXXXXXXX`
   - **API Key**: `patXXXXXXXXXXXXXX` (Personal Access Token)

### 2. Configurar Variables de Entorno

```env
# .env.local
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Properties  # Nombre de tu tabla en Airtable
```

## 🔧 Implementación

### Opción 1: Servicio Directo de Airtable

Crear un servicio para interactuar con Airtable:

```typescript
// lib/airtable/client.ts
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID!);

export interface AirtableUpdate {
  recordId: string; // ID del registro en Airtable
  fields: Record<string, any>;
}

export async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, any>
): Promise<boolean> {
  try {
    await base(tableName).update([
      {
        id: recordId,
        fields,
      },
    ]);
    return true;
  } catch (error) {
    console.error('Error updating Airtable:', error);
    return false;
  }
}

export async function findRecordByPropertyId(
  tableName: string,
  propertyId: string
): Promise<string | null> {
  try {
    const records = await base(tableName)
      .select({
        filterByFormula: `{Property ID} = "${propertyId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    return records[0]?.id || null;
  } catch (error) {
    console.error('Error finding Airtable record:', error);
    return null;
  }
}
```

### Opción 2: Usar n8n Webhook

```typescript
// lib/airtable/webhook.ts
export async function triggerAirtableUpdate(
  event: 'phase_change' | 'checklist_complete' | 'status_update',
  data: {
    propertyId: string;
    airtableRecordId?: string;
    fields: Record<string, any>;
  }
): Promise<boolean> {
  try {
    const response = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        ...data,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error triggering Airtable update:', error);
    return false;
  }
}
```

## 🎯 Casos de Uso Específicos

### 1. Cambio de Fase en Kanban

**Cuando:** Usuario mueve una propiedad de una fase a otra

**Campos a actualizar en Airtable:**
- `Set Up Status` → Nueva fase
- `Last Phase Change Date` → Fecha actual
- `Phase Change History` → Agregar entrada al historial

**Implementación:**

```typescript
// hooks/useSupabaseKanbanProperties.ts o donde se maneje el drag & drop
import { updateAirtableRecord, findRecordByPropertyId } from '@/lib/airtable/client';

async function handlePhaseChange(
  propertyId: string,
  newPhase: string,
  airtablePropertyId?: string
) {
  // 1. Actualizar en Supabase
  await supabase
    .from('properties')
    .update({ 'Set Up Status': newPhase })
    .eq('id', propertyId);

  // 2. Actualizar en Airtable
  if (airtablePropertyId) {
    const recordId = await findRecordByPropertyId(
      'Properties',
      airtablePropertyId
    );
    
    if (recordId) {
      await updateAirtableRecord('Properties', recordId, {
        'Set Up Status': newPhase,
        'Last Phase Change Date': new Date().toISOString(),
        // Agregar al historial (si es un campo de múltiples líneas)
        'Phase Change History': `${new Date().toISOString()}: ${newPhase}\n`,
      });
    }
  }
}
```

### 2. Completar Checklist

**Cuando:** Usuario completa un checklist inicial o final

**Campos a actualizar:**
- `Initial Check Complete` → true/false
- `Final Check Complete` → true/false
- `Checklist Completion Date` → Fecha
- `Checklist Progress` → Porcentaje

**Implementación:**

```typescript
// hooks/useSupabaseChecklist.ts
import { triggerAirtableUpdate } from '@/lib/airtable/webhook';

async function handleChecklistComplete(
  propertyId: string,
  checklistType: 'initial' | 'final',
  progress: number
) {
  // 1. Guardar en Supabase
  await saveChecklist();

  // 2. Notificar a Airtable vía n8n
  await triggerAirtableUpdate('checklist_complete', {
    propertyId,
    fields: {
      [`${checklistType === 'initial' ? 'Initial' : 'Final'} Check Complete`]: true,
      'Checklist Completion Date': new Date().toISOString(),
      'Checklist Progress': progress,
    },
  });
}
```

### 3. Actualización de Porcentajes de Renovación

**Cuando:** Usuario actualiza los porcentajes de categorías

**Campos a actualizar:**
- `Renovation Progress` → Objeto JSON con porcentajes
- `Last Progress Update` → Fecha

**Implementación:**

```typescript
// components/reno/dynamic-categories-progress.tsx
import { updateAirtableRecord } from '@/lib/airtable/client';

async function handleSaveAll(percentages: Record<string, number>) {
  // 1. Guardar en Supabase
  await savePercentages(percentages);

  // 2. Actualizar Airtable
  if (property.airtable_property_id) {
    const recordId = await findRecordByPropertyId(
      'Properties',
      property.airtable_property_id
    );
    
    if (recordId) {
      await updateAirtableRecord('Properties', recordId, {
        'Renovation Progress': JSON.stringify(percentages),
        'Last Progress Update': new Date().toISOString(),
      });
    }
  }
}
```

## 🔄 Usando Event Bus (Arquitectura Event-Driven)

Si ya tienes el Event Bus implementado, puedes usarlo para desacoplar la integración:

```typescript
// Cuando ocurre un cambio de fase
import { eventBus } from '@/lib/event-bus';

eventBus.publish('property.phase.changed', {
  propertyId: 'xxx',
  oldPhase: 'upcoming-settlements',
  newPhase: 'initial-check',
  timestamp: new Date().toISOString(),
});

// Listener en n8n o servicio separado
eventBus.subscribe('property.phase.changed', async (event) => {
  // Actualizar Airtable
  await updateAirtableRecord(...);
});
```

## 📊 Mapeo de Campos

### Supabase → Airtable

| Campo Supabase | Campo Airtable | Tipo |
|----------------|----------------|------|
| `Set Up Status` | `Set Up Status` | Single select |
| `Estimated Visit Date` | `Estimated Visit Date` | Date |
| `Setup Status Notes` | `Setup Status Notes` | Long text |
| `id` | `Property ID` | Single line text |
| `address` | `Address` | Single line text |

### Eventos → Campos

| Evento | Campo Airtable | Valor |
|--------|----------------|-------|
| Fase cambiada | `Set Up Status` | Nueva fase |
| Checklist inicial completo | `Initial Check Complete` | true |
| Checklist final completo | `Final Check Complete` | true |
| Porcentajes actualizados | `Renovation Progress` | JSON |

## ⚠️ Consideraciones

### Rate Limits

Airtable tiene límites de rate:
- **5 requests/segundo por base**
- **100 requests/segundo por cuenta**

**Solución:**
- Usar debounce/throttle en actualizaciones frecuentes
- Usar n8n para manejar colas y retries
- Agrupar múltiples actualizaciones en batch

### Manejo de Errores

```typescript
async function updateAirtableWithRetry(
  recordId: string,
  fields: Record<string, any>,
  maxRetries = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await updateAirtableRecord('Properties', recordId, fields);
      return true;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('Failed to update Airtable after retries:', error);
        // Opcional: Guardar en cola para procesar después
        await saveToRetryQueue(recordId, fields);
        return false;
      }
      // Esperar antes de reintentar (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return false;
}
```

### Sincronización Bidireccional

Si necesitas que Airtable también actualice Supabase:

1. **Usar Airtable Webhooks** → n8n → Supabase
2. **Polling periódico** (no recomendado)
3. **Airtable Automations** → Zapier/n8n → Supabase

## 🚀 Próximos Pasos

1. **Instalar dependencias:**
   ```bash
   npm install airtable
   ```

2. **Configurar variables de entorno**

3. **Implementar servicio básico** (Opción 1 o 2)

4. **Integrar en puntos clave:**
   - Cambio de fase en Kanban
   - Completar checklist
   - Actualizar porcentajes

5. **Agregar logging y monitoreo**

6. **Configurar n8n workflow** (opcional, para producción)

## 📝 Ejemplo Completo: Cambio de Fase

```typescript
// lib/airtable/phase-sync.ts
import { updateAirtableRecord, findRecordByPropertyId } from './client';
import { createClient } from '@/lib/supabase/client';

export async function syncPhaseToAirtable(
  propertyId: string,
  newPhase: string
): Promise<boolean> {
  const supabase = createClient();
  
  // 1. Obtener propiedad de Supabase
  const { data: property } = await supabase
    .from('properties')
    .select('airtable_property_id')
    .eq('id', propertyId)
    .single();

  if (!property?.airtable_property_id) {
    console.warn('Property has no Airtable ID, skipping sync');
    return false;
  }

  // 2. Buscar record en Airtable
  const recordId = await findRecordByPropertyId(
    'Properties',
    property.airtable_property_id
  );

  if (!recordId) {
    console.warn('Airtable record not found, skipping sync');
    return false;
  }

  // 3. Actualizar Airtable
  const success = await updateAirtableRecord('Properties', recordId, {
    'Set Up Status': newPhase,
    'Last Phase Change Date': new Date().toISOString(),
  });

  if (success) {
    console.log(`✅ Synced phase change to Airtable: ${propertyId} → ${newPhase}`);
  }

  return success;
}
```

## 🔗 Recursos

- [Airtable API Documentation](https://airtable.com/api)
- [Airtable JavaScript SDK](https://github.com/Airtable/airtable.js)
- [n8n Airtable Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.airtable/)


