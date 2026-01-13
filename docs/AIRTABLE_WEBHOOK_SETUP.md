# Configuración Completa de Webhooks de Airtable

## ✅ Lo que ya tenemos

1. ✅ **Endpoint para recibir webhooks**: `/api/webhooks/airtable`
2. ✅ **Procesador de webhooks**: `lib/airtable/webhook-processor.ts`
3. ✅ **Gestor de webhooks**: `lib/airtable/webhook-manager.ts` (crear/listar/eliminar)
4. ✅ **Endpoint de configuración**: `/api/airtable/setup-webhook`
5. ✅ **Sincronización App → Airtable**: `lib/airtable/phase-sync.ts`
6. ✅ **Integración en Kanban**: `updatePropertyPhase()` ahora sincroniza con Airtable
7. ✅ **Script de inicialización**: `scripts/setup-airtable-webhook.ts`

## 🔧 Lo que falta para completar la integración

### 1. ✅ COMPLETADO: Integrar sincronización en el Kanban

Cuando se mueve una propiedad en el Kanban, ahora se llama automáticamente a `syncPhaseToAirtable()`.

**Archivo modificado**: `lib/api/supabase-properties.ts`

**Función**: `updatePropertyPhase()` - Ahora sincroniza con Airtable después de actualizar Supabase

### 2. ⚠️ PENDIENTE: Verificar formato del payload de Airtable

El formato del webhook puede variar. Necesitamos:
- Probar con un webhook real
- Ajustar el procesador según el formato real
- Manejar diferentes estructuras de payload

**Nota**: El procesador actual está basado en la documentación de Airtable, pero puede necesitar ajustes según el formato real.

### 3. ✅ COMPLETADO: Script de inicialización automática

Script creado: `scripts/setup-airtable-webhook.ts`

**Uso**:
```bash
npm run setup:airtable-webhook
```

### 4. ⚠️ MEJORABLE: Manejo de errores mejorado

- ✅ Logging básico implementado
- ⚠️ Retry para webhooks fallidos (pendiente)
- ⚠️ Notificaciones de errores (pendiente)

## 📋 Checklist de implementación

- [x] Integrar `syncPhaseToAirtable()` en `updatePropertyPhase()`
- [ ] Probar webhook con payload real de Airtable
- [ ] Ajustar procesador según formato real
- [x] Crear script de inicialización
- [x] Agregar logging básico
- [x] Documentar variables de entorno necesarias
- [ ] Crear guía de troubleshooting
- [ ] Implementar retry para webhooks fallidos

## 🚀 Próximos pasos

1. **Probar webhook real** (prioridad alta)
   - Configurar webhook en Airtable
   - Actualizar un campo
   - Verificar que el payload llegue correctamente
   - Ajustar procesador si es necesario

2. **Mejorar manejo de errores** (prioridad media)
   - Implementar retry para webhooks fallidos
   - Agregar notificaciones de errores
   - Mejorar logging

3. **Documentación de troubleshooting** (prioridad baja)
   - Guía de problemas comunes
   - Cómo verificar que el webhook funciona
   - Cómo debuggear problemas

## 🔧 Variables de Entorno Necesarias

```env
# Airtable API (para App → Airtable)
NEXT_PUBLIC_AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties

# Webhook URL (opcional, se construye automáticamente)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# o
AIRTABLE_WEBHOOK_URL=https://tu-dominio.com/api/webhooks/airtable

# Webhook Security (opcional pero recomendado)
AIRTABLE_WEBHOOK_SECRET=tu_secret_aqui
```

## 📝 Cómo usar

### Configurar webhook automáticamente:

```bash
# Opción 1: Usar el script
npm run setup:airtable-webhook

# Opción 2: Usar el endpoint API
curl -X POST https://tu-dominio.com/api/airtable/setup-webhook

# Opción 3: Desde el código
import { setupAirtableWebhook } from '@/lib/airtable/webhook-manager';
await setupAirtableWebhook(baseId, webhookUrl);
```

### Verificar webhooks existentes:

```bash
curl https://tu-dominio.com/api/airtable/setup-webhook
```

