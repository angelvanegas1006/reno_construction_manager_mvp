# Event Bus Examples

## Property Service Example

See `property-service-example.ts` for a complete example showing:

1. **Property Service** - Publishes events when properties are created/updated
2. **Opportunity Service** - Consumes property events and creates opportunities automatically
3. **Analytics Service** - Tracks all events for analytics

## How to Run

```typescript
import { exampleUsage } from './property-service-example';

// Make sure you have:
// 1. Supabase configured with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// 2. Run the SQL migrations in supabase/migrations/001_event_bus.sql
// 3. Have the necessary tables (property, opportunity, analytics_events)

await exampleUsage();
```

## Key Concepts

### Publishing Events

```typescript
await eventBus.publish(
  'property.created',
  { property_id: '123', ... },
  'property-service'
);
```

### Subscribing to Events

```typescript
eventBus.subscribe('property.created', async (payload) => {
  // Handle event
});
```

### Database Triggers

The SQL migration includes triggers that automatically publish events when database changes occur. This means you don't always need to explicitly publish events in your code.

