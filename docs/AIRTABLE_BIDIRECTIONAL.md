# Integración Bidireccional con Airtable

## 📋 Resumen

Esta integración permite sincronización en ambas direcciones:

1. **App → Airtable**: Cuando actualizamos algo en nuestra app, se escribe en Airtable
2. **Airtable → App**: Cuando se actualiza algo en Airtable, se actualiza nuestra DB y se ejecutan acciones

## 🔄 Flujo de Sincronización

### Dirección 1: App → Airtable

```
Usuario actualiza fase en Kanban
    ↓
Actualizar Supabase
    ↓
syncPhaseToAirtable()
    ↓
Actualizar Airtable
```

**Implementación:**
```typescript
import { syncPhaseToAirtable } from '@/lib/airtable/phase-sync';

// Cuando cambies una fase
await syncPhaseToAirtable(propertyId, 'initial-check');
```

### Dirección 2: Airtable → App

```
Usuario actualiza campo en Airtable
    ↓
Airtable Webhook → POST /api/webhooks/airtable
    ↓
processAirtableWebhook()
    ↓
Actualizar Supabase
    ↓
Ejecutar acciones (mover fase, notificaciones, etc.)
```

## 🔧 Configuración del Webhook en Airtable

### ⚡ Opción 1: Configuración Automática desde el Backend (Recomendado)

Puedes configurar el webhook automáticamente usando nuestro endpoint API:

**Desde la terminal:**
```bash
# Configurar el webhook automáticamente
curl -X POST https://tu-dominio.com/api/airtable/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://tu-dominio.com/api/webhooks/airtable"}'

# O si tienes NEXT_PUBLIC_APP_URL configurado, simplemente:
curl -X POST https://tu-dominio.com/api/airtable/setup-webhook

# Listar webhooks existentes
curl https://tu-dominio.com/api/airtable/setup-webhook

# Eliminar un webhook
curl -X DELETE "https://tu-dominio.com/api/airtable/setup-webhook?webhookId=webhook_xxx"
```

**Desde el código:**
```typescript
import { setupAirtableWebhook } from '@/lib/airtable/webhook-manager';

const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!;
const webhookUrl = 'https://tu-dominio.com/api/webhooks/airtable';

const result = await setupAirtableWebhook(baseId, webhookUrl);
if (result) {
  console.log('✅ Webhook configurado:', result.webhookId);
  console.log('Creado:', result.created ? 'Sí' : 'Ya existía');
}
```

**Ventajas:**
- ✅ No necesitas usar la interfaz de Airtable
- ✅ Puedes automatizar la configuración en deployment
- ✅ Reutiliza webhooks existentes si ya están configurados
- ✅ Fácil de integrar en scripts de setup

### 📱 Opción 2: Configuración Manual desde la Interfaz de Airtable

Si prefieres configurarlo manualmente:

1. Ve a tu base en Airtable
2. Click en **Extensions** → **Webhooks**
3. Click en **Create a webhook**
4. Configura:
   - **Name**: "Vistral Sync"
   - **URL**: `https://tu-dominio.com/api/webhooks/airtable`
   - **Specify events**: Selecciona "When records are created or updated"
   - **Table**: Selecciona "Properties"
   - **Fields to watch**: Selecciona los campos que quieres monitorear:
     - `Set Up Status`
     - `Estimated Visit Date`
     - `Setup Status Notes`
     - `Last Phase Change Date`
     - `Initial Check Complete`
     - `Final Check Complete`
     - `Checklist Progress`

### 🔒 Configurar Seguridad (Recomendado)

1. En el webhook, configura un **Webhook Secret**
2. Agrega el secret a tu `.env.local`:
   ```env
   AIRTABLE_WEBHOOK_SECRET=tu_secret_aqui
   ```

### 🧪 Probar el Webhook

1. Actualiza un campo en Airtable (ej: cambia "Set Up Status")
2. Verifica los logs en tu aplicación
3. Verifica que Supabase se actualizó correctamente

## 📡 Endpoint del Webhook

### URL
```
POST /api/webhooks/airtable
```

### Autenticación
Si configuraste `AIRTABLE_WEBHOOK_SECRET`, el webhook debe incluir:
```
Authorization: Bearer tu_secret_aqui
```

### Payload de Ejemplo

```json
{
  "eventType": "record.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "base": {
    "id": "appT59F8wolMDKZeG"
  },
  "payload": {
    "baseId": "appT59F8wolMDKZeG",
    "webhookId": "webhook_xxx",
    "eventId": "evt_xxx",
    "timestamp": "2024-01-15T10:30:00Z",
    "eventType": "record.updated",
    "payload": {
      "changedTablesById": {
        "tblmX19OTsj3cTHmA": {
          "changedRecordsById": {
            "recXXXXXXXXXXXXXX": {
              "current": {
                "id": "recXXXXXXXXXXXXXX",
                "cellValuesByFieldId": {
                  "Set Up Status": "Initial Check",
                  "Estimated Visit Date": "2024-01-20"
                }
              },
              "previous": {
                "id": "recXXXXXXXXXXXXXX",
                "cellValuesByFieldId": {
                  "Set Up Status": "Upcoming Settlements"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🔄 Campos Sincronizados

### App → Airtable

| Campo App | Campo Airtable | Cuándo se actualiza |
|-----------|----------------|---------------------|
| `Set Up Status` | `Set Up Status` | Cambio de fase en Kanban |
| `Estimated Visit Date` | `Estimated Visit Date` | Actualización de fecha estimada |
| `Setup Status Notes` | `Setup Status Notes` | Actualización de notas |
| Porcentajes de renovación | `Renovation Progress` | Actualización de porcentajes |

### Airtable → App

| Campo Airtable | Campo App | Acción |
|----------------|-----------|--------|
| `Set Up Status` | `Set Up Status` | Actualiza fase y mueve en Kanban |
| `Estimated Visit Date` | `Estimated Visit Date` | Actualiza fecha |
| `Setup Status Notes` | `Setup Status Notes` | Actualiza notas |
| `Initial Check Complete` | - | Puede disparar acciones |
| `Final Check Complete` | - | Puede disparar acciones |

## 🎯 Casos de Uso

### Caso 1: Cambio de Fase desde Airtable

**Escenario**: Un usuario actualiza "Set Up Status" en Airtable de "Upcoming Settlements" a "Initial Check"

**Flujo**:
1. Airtable envía webhook
2. Webhook procesa el cambio
3. Supabase se actualiza con nueva fase
4. La propiedad se mueve automáticamente en el Kanban
5. Se puede disparar notificación al equipo

### Caso 2: Actualización de Fecha desde Airtable

**Escenario**: Se actualiza "Estimated Visit Date" en Airtable

**Flujo**:
1. Webhook recibe el cambio
2. Supabase actualiza `Estimated Visit Date`
3. La UI se actualiza automáticamente (si está usando Supabase Realtime)

### Caso 3: Cambio de Fase desde App

**Escenario**: Usuario mueve tarjeta en Kanban

**Flujo**:
1. Supabase se actualiza
2. `syncPhaseToAirtable()` se ejecuta
3. Airtable se actualiza con nueva fase
4. Otros sistemas conectados a Airtable se actualizan

## 🔒 Seguridad

### Validación del Webhook

El endpoint valida:
1. **Autenticación**: Si `AIRTABLE_WEBHOOK_SECRET` está configurado, valida el header `Authorization`
2. **Base ID**: Verifica que el webhook viene de la base correcta
3. **Estructura**: Valida que el payload tenga la estructura esperada

### Rate Limiting

Airtable tiene límites:
- **5 requests/segundo por base**
- **100 requests/segundo por cuenta**

El webhook procesa eventos de forma asíncrona para evitar bloqueos.

## 🐛 Debugging

### Ver Logs del Webhook

Los logs incluyen:
- Eventos recibidos
- Cambios detectados
- Actualizaciones realizadas
- Errores

```bash
# En desarrollo, verás logs en la consola
# En producción, revisa los logs del servidor
```

### Probar Webhook Localmente

Para probar localmente, usa un servicio como **ngrok**:

```bash
# Instalar ngrok
brew install ngrok

# Exponer puerto local
ngrok http 3000

# Usar la URL de ngrok en Airtable webhook
# Ejemplo: https://abc123.ngrok.io/api/webhooks/airtable
```

### Verificar Estado del Webhook

```bash
# GET request para health check
curl https://tu-dominio.com/api/webhooks/airtable

# Debería responder:
{
  "status": "ok",
  "message": "Airtable webhook endpoint is active",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📝 Variables de Entorno Necesarias

```env
# Airtable API (para App → Airtable)
NEXT_PUBLIC_AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties

# Webhook Security (para Airtable → App)
AIRTABLE_WEBHOOK_SECRET=tu_secret_aqui
```

## 🚀 Próximos Pasos

1. **Configurar webhook en Airtable** siguiendo los pasos arriba
2. **Probar sincronización bidireccional**:
   - Cambiar fase en app → verificar en Airtable
   - Cambiar fase en Airtable → verificar en app
3. **Agregar más campos** según necesidades
4. **Implementar notificaciones** cuando cambien ciertos campos
5. **Agregar logging** para auditoría

## 🔗 Recursos

- [Airtable Webhooks Documentation](https://airtable.com/developers/web/api/webhooks)
- [Airtable API Documentation](https://airtable.com/api)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)


