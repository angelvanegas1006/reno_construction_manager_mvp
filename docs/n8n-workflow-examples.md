# Ejemplos de Workflows n8n

## Workflow 1: Actualizar Fase de Propiedad (Drag & Drop)

### Configuración del Webhook

**Node: Webhook**
- Method: POST
- Path: `/property-phase-update`
- Response Mode: Respond to Webhook

### Flujo Completo

```
1. Webhook (Trigger)
   ↓
2. Set Node: Validar datos
   - propertyId (required)
   - phase (required, enum: upcoming-settlements, initial-check, etc.)
   - position (optional)
   ↓
3. IF Node: Validar fase válida
   - Si fase no válida → Error Response
   - Si válida → Continuar
   ↓
4. HTTP Request: GET /api/properties/:id
   - Obtener propiedad actual
   ↓
5. Set Node: Preparar datos
   - oldPhase: property.renoPhase
   - newPhase: $json.phase
   - updates: { renoPhase: $json.phase }
   ↓
6. HTTP Request: PATCH /api/properties/:id/phase
   - Body: { phase, position }
   ↓
7. IF Node: Verificar respuesta
   - Si éxito → Continuar
   - Si error → Error Response
   ↓
8. WebSocket Node: Notificar cambio
   - Enviar a todos los clientes conectados
   - Payload: { type: 'property.phase.changed', propertyId, oldPhase, newPhase }
   ↓
9. Webhook Response: Success
   - Return: { success: true, property: updatedProperty }
```

### Código de Validación (Function Node)

```javascript
// Validar fase
const validPhases = [
  'upcoming-settlements',
  'initial-check',
  'upcoming',
  'reno-in-progress',
  'furnishing-cleaning',
  'final-check',
  'reno-fixes',
  'done'
];

const phase = $input.item.json.phase;

if (!validPhases.includes(phase)) {
  throw new Error(`Invalid phase: ${phase}`);
}

return { valid: true, phase };
```

---

## Workflow 2: Auto-save Checklist

### Configuración del Webhook

**Node: Webhook**
- Method: POST
- Path: `/checklist-save`
- Response Mode: Respond to Webhook

### Flujo Completo

```
1. Webhook (Trigger)
   ↓
2. Function Node: Debounce
   - Esperar 2 segundos si hay más requests
   - Usar propertyId + type como key
   ↓
3. Set Node: Validar estructura
   - propertyId (required)
   - type (required: reno_initial | reno_final | partner)
   - checklist (required, object)
   ↓
4. HTTP Request: PUT /api/properties/:id/checklist/:type
   - Body: checklist completo
   ↓
5. IF Node: Verificar respuesta
   - Si éxito → Continuar
   - Si error → Error Response
   ↓
6. WebSocket Node: Notificar actualización
   - Payload: { type: 'checklist.updated', propertyId, checklistType }
   ↓
7. Webhook Response: Success
   - Return: { success: true, checklist: savedChecklist }
```

### Código de Debounce (Function Node)

```javascript
// Debounce logic
const propertyId = $input.item.json.propertyId;
const type = $input.item.json.type;
const key = `${propertyId}_${type}`;

// En producción, usar Redis o similar para debounce distribuido
// Por ahora, solo validar estructura
const checklist = $input.item.json.checklist;

if (!checklist || typeof checklist !== 'object') {
  throw new Error('Invalid checklist structure');
}

return {
  propertyId,
  type,
  checklist,
  timestamp: new Date().toISOString()
};
```

---

## Workflow 3: Sincronización Bidireccional

### Configuración del Cron

**Node: Cron**
- Schedule: Every 5 minutes
- Or: Webhook trigger desde backend cuando hay cambios

### Flujo Completo

```
1. Cron Trigger (cada 5 min) o Webhook
   ↓
2. Set Node: Obtener timestamp
   - lastSync: leer de variable o DB
   - currentTime: ahora
   ↓
3. HTTP Request: GET /api/properties?updated_since=:timestamp
   - Obtener propiedades actualizadas
   ↓
4. IF Node: Hay cambios?
   - Si no hay cambios → End
   - Si hay cambios → Continuar
   ↓
5. Loop: Para cada propiedad
   ↓
6. WebSocket Node: Notificar cambio
   - Payload: { type: 'property.updated', property }
   ↓
7. Set Node: Actualizar lastSync
   - Guardar currentTime como nuevo lastSync
```

---

## Workflow 4: Error Handling y Retry

### Configuración

```
1. Try-Catch Node
   ↓
2. IF Node: Tipo de error
   - Network error → Retry (máx 3 veces)
   - Validation error → Error Response inmediato
   - Server error → Log y notificar admin
   ↓
3. Wait Node: Esperar antes de retry
   - 1s, 2s, 4s (exponential backoff)
   ↓
4. Retry HTTP Request
   ↓
5. IF Node: ¿Éxito después de retry?
   - Si sí → Continuar flujo normal
   - Si no → Error Response final
```

---

## Variables de Entorno n8n

```env
# Backend API
BACKEND_API_URL=http://localhost:3001
BACKEND_API_KEY=your-api-key

# WebSocket
WS_SERVER_URL=ws://localhost:3001

# Database (si n8n necesita acceso directo)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vistral_reno
DB_USER=user
DB_PASSWORD=password
```

---

## Testing de Workflows

### Test Manual

1. Usar n8n UI para ejecutar workflow paso a paso
2. Verificar datos en cada nodo
3. Probar casos de error

### Test Automatizado

```bash
# Usar n8n CLI o API para ejecutar workflows
curl -X POST http://localhost:5678/webhook/property-phase-update \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "4463801",
    "phase": "initial-check",
    "position": 0
  }'
```

---

## Mejores Prácticas

1. **Validación temprana**: Validar datos en el primer nodo
2. **Error handling**: Usar Try-Catch nodes
3. **Logging**: Agregar logs en puntos clave
4. **Rate limiting**: Implementar en webhooks
5. **Idempotencia**: Asegurar que requests duplicados no causen problemas
6. **Testing**: Probar todos los casos edge antes de producción

