# Arquitectura Basada en Eventos (Event-Driven Architecture) - Vistral

## 📋 Principios Fundamentales

### ✅ **Ventajas de Event-Driven Architecture**

1. **Desacoplamiento Total**: Los servicios no conocen la existencia de otros servicios
2. **Escalabilidad**: Cada servicio escala independientemente según eventos
3. **Resiliencia**: Si un servicio falla, los eventos se procesan cuando vuelve
4. **Flexibilidad**: Agregar nuevos consumidores sin modificar productores
5. **Trazabilidad**: Historial completo de eventos para auditoría

---

## 🏗️ Arquitectura con Event Bus

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Apps (Next.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐            │
│  │ Partner  │  │   Reno    │  │ Super Admin  │            │
└──┼──────────┼──┼───────────┼──┼──────────────┼────────────┘
   │          │  │           │  │              │
   └──────────┼──┼───────────┼──┼──────────────┘
              │  │           │  │
              └──┼───────────┼──┘
                 │           │
        ┌────────▼───────────▼────────┐
        │      API Gateway             │
        │  (Vercel Edge Functions)     │
        └────────┬───────────┬─────────┘
                 │           │
        ┌────────▼───────────▼────────┐
        │      Services Layer          │
        │  ┌──────────┐ ┌──────────┐ │
        │  │Property  │ │Opportunity│ │
        │  │ Service  │ │  Service  │ │
        │  └─────┬────┘ └─────┬─────┘ │
        │        │            │       │
        │  ┌─────▼────────────▼─────┐ │
        │  │   Deals Service        │ │
        │  └─────┬──────────────────┘ │
        └────────┼────────────────────┘
                 │
        ┌────────▼────────────────────┐
        │      Event Bus              │
        │  (Supabase Realtime +       │
        │   PostgreSQL + Triggers)    │
        └────────┬────────────────────┘
                 │
        ┌────────▼────────────────────┐
        │   Event Consumers           │
        │  - Analytics Service        │
        │  - Notification Service     │
        │  - Audit Service           │
        │  - Integration Service      │
        └────────────────────────────┘
```

---

## 🎯 Opciones de Event Bus

### **Opción 1: Supabase Realtime + PostgreSQL Triggers (Recomendado para empezar)**

**Ventajas**:
- ✅ Ya lo tienes (Supabase)
- ✅ Sin infraestructura adicional
- ✅ Integrado con PostgreSQL
- ✅ WebSockets nativos
- ✅ Gratis hasta cierto límite

**Cómo funciona**:
```sql
-- Trigger que publica evento cuando cambia property
CREATE OR REPLACE FUNCTION notify_property_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('property_changed', json_build_object(
    'event_type', TG_OP,
    'property_id', NEW.id,
    'old_data', row_to_json(OLD),
    'new_data', row_to_json(NEW),
    'timestamp', NOW()
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_changed_trigger
  AFTER INSERT OR UPDATE OR DELETE ON property
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_changed();
```

---

### **Opción 2: Supabase Realtime Channels (Más robusto)**

**Ventajas**:
- ✅ Escalable
- ✅ Filtros por canal
- ✅ Presencia (saber quién está escuchando)
- ✅ Broadcasts

**Cómo funciona**:
```typescript
// Servicio publica evento
const channel = supabase.channel('property-events')
  .on('broadcast', { event: 'property.created' }, (payload) => {
    // Consumidores reciben el evento
  })
  .subscribe();

// Publicar evento
channel.send({
  type: 'broadcast',
  event: 'property.created',
  payload: { property_id: '123', ... }
});
```

---

### **Opción 3: Message Broker Externo (Para producción a escala)**

**Opciones**:
- **AWS EventBridge** (si estás en AWS)
- **Google Pub/Sub** (si estás en GCP)
- **RabbitMQ** (self-hosted)
- **Apache Kafka** (para alto volumen)
- **Redis Streams** (simple y rápido)

**Cuándo usar**:
- Alto volumen de eventos (>10k/min)
- Necesitas garantías de entrega
- Múltiples regiones
- Event sourcing completo

---

## 📨 Eventos Propuestos

### **Property Service Events**

```typescript
// Eventos que Property Service publica
interface PropertyEvents {
  'property.created': {
    property_id: string;
    granularity_level: 'L1' | 'L2' | 'L3';
    project_id?: string;
    parent_unit_id?: string;
  };
  
  'property.updated': {
    property_id: string;
    changes: Record<string, any>;
  };
  
  'property.status_changed': {
    property_id: string;
    old_status: string;
    new_status: string;
  };
  
  'property.deleted': {
    property_id: string;
  };
}
```

### **Opportunity Service Events**

```typescript
interface OpportunityEvents {
  'opportunity.created': {
    opportunity_id: string;
    property_id: string;
    opportunity_type: string;
    contact_id: string;
  };
  
  'opportunity.updated': {
    opportunity_id: string;
    changes: Record<string, any>;
  };
  
  'opportunity.status_changed': {
    opportunity_id: string;
    old_status: string;
    new_status: string;
  };
  
  'client_share.created': {
    client_share_id: string;
    opportunity_id: string;
    owner_contact_id: string;
    ownership_percentage: number;
  };
}
```

### **Deals Service Events**

```typescript
interface DealsEvents {
  'deal.created': {
    deal_id: string;
    opportunity_id: string;
    buyer_type: string;
    contact_id: string;
  };
  
  'deal.stage_changed': {
    deal_id: string;
    old_stage: string;
    new_stage: string;
  };
  
  'deal.closed_won': {
    deal_id: string;
    opportunity_id: string;
    settlement_date: string;
  };
  
  'deal.closed_lost': {
    deal_id: string;
    reason: string;
  };
  
  'deal.participant_added': {
    deal_id: string;
    participant_id: string;
    ownership_percentage: number;
  };
}
```

### **Checklist Service Events**

```typescript
interface ChecklistEvents {
  'checklist.created': {
    checklist_id: string;
    property_id: string;
    checklist_type: string;
  };
  
  'checklist.section_completed': {
    checklist_id: string;
    property_id: string;
    section_id: string;
  };
  
  'checklist.completed': {
    checklist_id: string;
    property_id: string;
    checklist_type: string;
  };
}
```

---

## 🔌 Implementación con Supabase Realtime

### **1. Event Bus Service (Package Compartido)**

```typescript
// packages/event-bus/index.ts
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type EventType = 
  | 'property.created'
  | 'property.updated'
  | 'property.status_changed'
  | 'opportunity.created'
  | 'deal.stage_changed'
  | 'checklist.completed'
  | string;

export interface EventPayload {
  event_type: EventType;
  data: Record<string, any>;
  timestamp: string;
  source_service: string;
}

export class EventBus {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Publicar evento al bus
   */
  async publish(eventType: EventType, data: Record<string, any>, sourceService: string) {
    const payload: EventPayload = {
      event_type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source_service: sourceService,
    };

    // Opción 1: Usar PostgreSQL NOTIFY (más simple)
    await supabase.rpc('publish_event', {
      event_type: eventType,
      event_data: JSON.stringify(data),
      source_service: sourceService,
    });

    // Opción 2: Usar Realtime Broadcast (más robusto)
    const channel = this.getChannel('events');
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload,
    });
  }

  /**
   * Suscribirse a eventos
   */
  subscribe(
    eventType: EventType | EventType[],
    callback: (payload: EventPayload) => void
  ): () => void {
    const events = Array.isArray(eventType) ? eventType : [eventType];
    const channel = this.getChannel('events');

    events.forEach(event => {
      channel.on('broadcast', { event }, (payload) => {
        callback(payload.payload as EventPayload);
      });
    });

    channel.subscribe();

    // Retornar función para desuscribirse
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Suscribirse a eventos de PostgreSQL (usando triggers)
   */
  subscribeToDatabaseChanges(
    table: string,
    callback: (payload: any) => void
  ): () => void {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private getChannel(name: string): RealtimeChannel {
    if (!this.channels.has(name)) {
      this.channels.set(name, supabase.channel(name));
    }
    return this.channels.get(name)!;
  }
}

export const eventBus = new EventBus();
```

---

### **2. Función PostgreSQL para Publicar Eventos**

```sql
-- Crear función para publicar eventos
CREATE OR REPLACE FUNCTION publish_event(
  event_type TEXT,
  event_data JSONB,
  source_service TEXT DEFAULT 'unknown'
)
RETURNS void AS $$
BEGIN
  -- Publicar a canal de Realtime
  PERFORM pg_notify('vistral_events', json_build_object(
    'event_type', event_type,
    'data', event_data,
    'timestamp', NOW(),
    'source_service', source_service
  )::text);
END;
$$ LANGUAGE plpgsql;

-- Trigger ejemplo para Property Service
CREATE OR REPLACE FUNCTION property_service_notify()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      event_type := 'property.created';
      PERFORM publish_event(
        event_type,
        row_to_json(NEW)::jsonb,
        'property-service'
      );
    WHEN 'UPDATE' THEN
      event_type := 'property.updated';
      PERFORM publish_event(
        event_type,
        json_build_object(
          'property_id', NEW.id,
          'old_data', row_to_json(OLD),
          'new_data', row_to_json(NEW)
        )::jsonb,
        'property-service'
      );
      
      -- Si cambió el status, publicar evento adicional
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM publish_event(
          'property.status_changed',
          json_build_object(
            'property_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status
          )::jsonb,
          'property-service'
        );
      END IF;
    WHEN 'DELETE' THEN
      event_type := 'property.deleted';
      PERFORM publish_event(
        event_type,
        row_to_json(OLD)::jsonb,
        'property-service'
      );
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON property_service.property
  FOR EACH ROW
  EXECUTE FUNCTION property_service_notify();
```

---

### **3. Property Service (Publica Eventos)**

```typescript
// services/property-service/src/services/property.service.ts
import { eventBus } from '@vistral/event-bus';
import { supabase } from '@/lib/supabase/client';

export class PropertyService {
  async createProperty(property: CreatePropertyDto): Promise<Property> {
    // Crear en BD
    const { data, error } = await supabase
      .from('property')
      .insert(property)
      .select()
      .single();

    if (error) throw error;

    // Publicar evento (el trigger también lo hará, pero esto es explícito)
    await eventBus.publish('property.created', {
      property_id: data.id,
      granularity_level: data.granularity_level,
      project_id: data.project_id,
      parent_unit_id: data.parent_unit_id,
    }, 'property-service');

    return data;
  }

  async updatePropertyStatus(
    propertyId: string,
    newStatus: string
  ): Promise<Property> {
    const { data: oldData } = await supabase
      .from('property')
      .select('status')
      .eq('id', propertyId)
      .single();

    const { data, error } = await supabase
      .from('property')
      .update({ status: newStatus })
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;

    // El trigger publicará el evento automáticamente
    // Pero también podemos publicarlo explícitamente para más control
    await eventBus.publish('property.status_changed', {
      property_id: propertyId,
      old_status: oldData?.status,
      new_status: newStatus,
    }, 'property-service');

    return data;
  }
}
```

---

### **4. Opportunity Service (Consume Eventos)**

```typescript
// services/opportunity-service/src/services/opportunity.service.ts
import { eventBus } from '@vistral/event-bus';

export class OpportunityService {
  constructor() {
    // Suscribirse a eventos de Property
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Cuando se crea una propiedad, crear oportunidad por defecto
    eventBus.subscribe('property.created', async (payload) => {
      const { property_id, granularity_level } = payload.data;
      
      // Crear oportunidad inicial basada en el tipo de propiedad
      if (granularity_level === 'L1') {
        await this.createOpportunity({
          property_id,
          opportunity_type: 'FLIP_INVESTMENT',
          status: 'to-onboard',
        });
      } else if (granularity_level === 'L2') {
        await this.createOpportunity({
          property_id,
          opportunity_type: 'RENTAL_INVESTMENT',
          status: 'to-onboard',
        });
      }
    });

    // Cuando cambia el status de una propiedad, actualizar oportunidades relacionadas
    eventBus.subscribe('property.status_changed', async (payload) => {
      const { property_id, new_status } = payload.data;
      
      // Actualizar oportunidades relacionadas
      await this.updateOpportunitiesByPropertyStatus(property_id, new_status);
    });
  }

  async createOpportunity(opportunity: CreateOpportunityDto): Promise<Opportunity> {
    // Crear oportunidad
    const { data, error } = await supabase
      .from('opportunity')
      .insert(opportunity)
      .select()
      .single();

    if (error) throw error;

    // Publicar evento
    await eventBus.publish('opportunity.created', {
      opportunity_id: data.id,
      property_id: data.property_id,
      opportunity_type: data.opportunity_type,
    }, 'opportunity-service');

    return data;
  }
}
```

---

### **5. Analytics Service (Consume Eventos para Analytics)**

```typescript
// services/analytics-service/src/services/analytics.service.ts
import { eventBus } from '@vistral/event-bus';

export class AnalyticsService {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Trackear todos los eventos para analytics
    eventBus.subscribe([
      'property.created',
      'property.updated',
      'property.status_changed',
      'opportunity.created',
      'deal.stage_changed',
      'deal.closed_won',
      'deal.closed_lost',
    ], async (payload) => {
      // Guardar evento en tabla de analytics
      await this.saveEvent(payload);
      
      // Actualizar métricas en tiempo real
      await this.updateMetrics(payload);
    });
  }

  private async saveEvent(payload: EventPayload) {
    await supabase.from('analytics_events').insert({
      event_type: payload.event_type,
      event_data: payload.data,
      timestamp: payload.timestamp,
      source_service: payload.source_service,
    });
  }

  private async updateMetrics(payload: EventPayload) {
    // Actualizar dashboard en tiempo real
    // Ej: propiedades creadas hoy, deals cerrados esta semana, etc.
  }
}
```

---

### **6. Notification Service (Consume Eventos para Notificaciones)**

```typescript
// services/notification-service/src/services/notification.service.ts
import { eventBus } from '@vistral/event-bus';

export class NotificationService {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Notificar cuando un deal se cierra
    eventBus.subscribe('deal.closed_won', async (payload) => {
      const { deal_id, opportunity_id } = payload.data;
      
      // Obtener contactos relacionados
      const contacts = await this.getDealContacts(deal_id);
      
      // Enviar notificaciones
      for (const contact of contacts) {
        await this.sendNotification(contact.id, {
          type: 'deal_closed',
          message: 'Tu deal ha sido cerrado exitosamente',
          deal_id,
        });
      }
    });

    // Notificar cuando un checklist se completa
    eventBus.subscribe('checklist.completed', async (payload) => {
      const { property_id, checklist_type } = payload.data;
      
      // Notificar al equipo de Reno
      await this.notifyRenoTeam({
        type: 'checklist_completed',
        property_id,
        checklist_type,
      });
    });
  }
}
```

---

## 📊 Event Store (Opcional - Event Sourcing)

Si quieres ir más allá, puedes implementar Event Sourcing:

```sql
-- Tabla para almacenar todos los eventos
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL, -- property_id, opportunity_id, etc.
  aggregate_type TEXT NOT NULL, -- 'property', 'opportunity', etc.
  event_data JSONB NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER NOT NULL,
  
  -- Índices para queries rápidas
  INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id),
  INDEX idx_event_store_type ON event_store(event_type),
  INDEX idx_event_store_timestamp ON event_store(timestamp)
);
```

**Ventajas de Event Sourcing**:
- ✅ Historial completo de cambios
- ✅ Puedes reconstruir el estado en cualquier punto
- ✅ Auditoría completa
- ✅ Time travel debugging

---

## 🔄 Flujo Completo de Ejemplo

### **Escenario: Crear una propiedad y automáticamente crear oportunidad**

```
1. Frontend (Partner App)
   ↓ POST /api/properties
   
2. Property Service
   ↓ Crea property en BD
   ↓ Trigger publica evento 'property.created'
   
3. Event Bus
   ↓ Distribuye evento a suscriptores
   
4. Opportunity Service (suscriptor)
   ↓ Escucha 'property.created'
   ↓ Crea oportunidad automáticamente
   ↓ Publica evento 'opportunity.created'
   
5. Analytics Service (suscriptor)
   ↓ Escucha 'property.created' y 'opportunity.created'
   ↓ Actualiza métricas
   
6. Notification Service (suscriptor)
   ↓ Escucha 'opportunity.created'
   ↓ Envía notificación al equipo
```

**Ventaja**: Property Service no sabe que Opportunity Service existe. Totalmente desacoplado.

---

## 🚀 Plan de Implementación

### **Fase 1: Setup Event Bus (Semana 1)**
- [ ] Crear función PostgreSQL `publish_event`
- [ ] Crear package `@vistral/event-bus`
- [ ] Setup triggers básicos en Property Service
- [ ] Test de publicación y suscripción

### **Fase 2: Integrar Property Service (Semana 2)**
- [ ] Property Service publica eventos
- [ ] Crear consumidor de prueba
- [ ] Verificar que eventos se distribuyen correctamente

### **Fase 3: Integrar Opportunity Service (Semana 3)**
- [ ] Opportunity Service se suscribe a eventos de Property
- [ ] Crear oportunidades automáticamente
- [ ] Publicar eventos propios

### **Fase 4: Servicios Adicionales (Semana 4)**
- [ ] Analytics Service
- [ ] Notification Service
- [ ] Audit Service (opcional)

### **Fase 5: Optimización (Semana 5)**
- [ ] Event Store (si se necesita)
- [ ] Dead Letter Queue para eventos fallidos
- [ ] Monitoring y alerting

---

## ✅ Ventajas de Esta Arquitectura

1. **Totalmente Desacoplado**: Los servicios no se conocen entre sí
2. **Escalable**: Cada servicio escala según eventos que procesa
3. **Resiliente**: Si un servicio falla, eventos se procesan cuando vuelve
4. **Flexible**: Agregar nuevos consumidores sin modificar productores
5. **Trazable**: Historial completo de eventos
6. **Agnóstico**: Puedes cambiar el Event Bus sin afectar servicios

---

## 🎯 Próximos Pasos

1. **Aprobar arquitectura basada en eventos**
2. **Crear Event Bus con Supabase Realtime**
3. **Implementar Property Service con eventos**
4. **Crear Opportunity Service que consume eventos**
5. **Iterar y mejorar**

---

¿Te parece bien esta arquitectura basada en eventos? ¿Quieres que empecemos implementando el Event Bus?

