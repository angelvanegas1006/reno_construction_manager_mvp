/**
 * @vistral/event-bus
 * 
 * Event-driven architecture package for Vistral
 */

export { EventBus } from './event-bus';
export type {
  EventType,
  EventPayload,
  EventCallback,
  SubscribeOptions,
  PropertyEventType,
  OpportunityEventType,
  DealsEventType,
  ChecklistEventType,
} from './types';

// Re-export for convenience
export { EventBusConfig } from './event-bus';

