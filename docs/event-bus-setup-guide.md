# Event Bus Setup Guide

## 📋 Prerequisitos

1. Supabase project creado
2. Variables de entorno configuradas:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 🚀 Setup Paso a Paso

### Paso 1: Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm install

# Si @supabase/supabase-js no está instalado
npm install @supabase/supabase-js
```

### Paso 2: Ejecutar Migraciones SQL

1. Ve a tu proyecto Supabase Dashboard
2. Abre el SQL Editor
3. Copia y pega el contenido de `packages/event-bus/supabase/migrations/001_event_bus.sql`
4. Ejecuta el script

Esto creará:
- Función `publish_event()` para publicar eventos
- Tabla `event_store` para almacenar eventos (opcional)
- Función `store_event()` para guardar eventos
- Función de ejemplo `notify_property_changed()` para triggers

### Paso 3: Usar el Event Bus en tu Código

```typescript
// Importar el Event Bus singleton
import { eventBus } from '@/lib/event-bus';

// Publicar un evento
await eventBus.publish(
  'property.created',
  {
    property_id: '123',
    granularity_level: 'L2',
  },
  'property-service'
);

// Suscribirse a eventos
const unsubscribe = eventBus.subscribe(
  'property.created',
  async (payload) => {
    console.log('Property created:', payload.data);
    // Tu lógica aquí
  }
);

// Desuscribirse cuando ya no lo necesites
unsubscribe();
```

### Paso 4: Crear Triggers en tus Tablas (Opcional)

Si quieres que los eventos se publiquen automáticamente cuando cambian las tablas:

```sql
-- Ejemplo para una tabla 'property'
CREATE TRIGGER property_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON property
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_changed();
```

**Nota**: Ajusta la función `notify_property_changed()` según la estructura de tu tabla.

## 📝 Ejemplo Completo

Ver `packages/event-bus/examples/property-service-example.ts` para un ejemplo completo que muestra:

1. Property Service publicando eventos
2. Opportunity Service consumiendo eventos
3. Analytics Service trackeando eventos

## 🔍 Verificar que Funciona

### Test 1: Publicar Evento Manualmente

```typescript
import { eventBus } from '@/lib/event-bus';

// Publicar evento
await eventBus.publish(
  'test.event',
  { message: 'Hello from Event Bus!' },
  'test-service'
);
```

### Test 2: Suscribirse y Escuchar

```typescript
import { eventBus } from '@/lib/event-bus';

// Suscribirse
const unsubscribe = eventBus.subscribe('test.event', (payload) => {
  console.log('Event received:', payload);
});

// Publicar desde otra parte del código
await eventBus.publish('test.event', { test: true }, 'test-service');

// Deberías ver el log en la consola
```

### Test 3: Verificar Event Store

```sql
-- Ver eventos almacenados
SELECT * FROM event_store 
ORDER BY timestamp DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### Los eventos no se reciben

1. **Verifica que el canal esté suscrito**:
   ```typescript
   const channel = eventBus.getChannel('vistral-events');
   console.log('Channel status:', channel.state);
   ```

2. **Verifica que Realtime esté habilitado** en Supabase Dashboard:
   - Settings → API → Realtime
   - Asegúrate de que esté habilitado

3. **Verifica los logs**:
   ```typescript
   const eventBus = new EventBus({
     supabase,
     enableLogging: true, // Habilita logs
   });
   ```

### Error: "function publish_event does not exist"

- Asegúrate de haber ejecutado las migraciones SQL
- Verifica que la función existe:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'publish_event';
  ```

### Los triggers no funcionan

1. Verifica que el trigger esté creado:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'property_events_trigger';
   ```

2. Verifica que la función del trigger exista:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'notify_property_changed';
   ```

3. Prueba el trigger manualmente:
   ```sql
   INSERT INTO property (id, granularity_level, status) 
   VALUES ('test-123', 'L2', 'draft');
   -- Debería publicar un evento automáticamente
   ```

## 📚 Próximos Pasos

1. **Integrar con Property Service**: Modifica tu código existente para publicar eventos
2. **Crear Opportunity Service**: Consume eventos de Property para crear oportunidades automáticamente
3. **Agregar más servicios**: Analytics, Notifications, etc.

## 🔗 Recursos

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL NOTIFY/LISTEN](https://www.postgresql.org/docs/current/sql-notify.html)
- Ver `docs/event-driven-architecture.md` para arquitectura completa

