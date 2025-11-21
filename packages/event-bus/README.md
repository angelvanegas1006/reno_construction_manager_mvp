# @vistral/event-bus

Event-driven architecture implementation for Vistral using Supabase Realtime and PostgreSQL triggers.

## Installation

```bash
npm install @vistral/event-bus
```

## Usage

### Initialize Event Bus

```typescript
import { EventBus } from '@vistral/event-bus';
import { supabase } from '@/lib/supabase/client';

const eventBus = new EventBus({
  supabase,
  channelName: 'vistral-events',
  enableLogging: true,
});
```

### Publish Events

```typescript
// Publish a property created event
await eventBus.publish(
  'property.created',
  {
    property_id: '123',
    granularity_level: 'L2',
    project_id: '456',
  },
  'property-service'
);
```

### Subscribe to Events

```typescript
// Subscribe to property events
const unsubscribe = eventBus.subscribe(
  'property.created',
  async (payload) => {
    console.log('Property created:', payload.data);
    // Create opportunity automatically
    await createOpportunity(payload.data.property_id);
  }
);

// Later, unsubscribe
unsubscribe();
```

### Subscribe to Multiple Events

```typescript
eventBus.subscribe(
  ['property.created', 'property.updated'],
  (payload) => {
    console.log('Property event:', payload);
  }
);
```

### Subscribe to Database Changes

```typescript
// Listen to PostgreSQL changes via triggers
const unsubscribe = eventBus.subscribeToDatabaseChanges(
  'property',
  (payload) => {
    console.log('Property changed:', payload);
  }
);
```

## PostgreSQL Setup

See `supabase/migrations/001_event_bus.sql` for database setup.

## Examples

See `examples/` directory for usage examples.

