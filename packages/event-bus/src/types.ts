/**
 * Event Types for Vistral Event Bus
 */

export type PropertyEventType =
  | 'property.created'
  | 'property.updated'
  | 'property.status_changed'
  | 'property.deleted';

export type OpportunityEventType =
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'opportunity.status_changed'
  | 'client_share.created'
  | 'client_share.updated';

export type DealsEventType =
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'deal.closed_won'
  | 'deal.closed_lost'
  | 'deal.participant_added'
  | 'deal.participant_removed';

export type ChecklistEventType =
  | 'checklist.created'
  | 'checklist.updated'
  | 'checklist.section_completed'
  | 'checklist.completed';

export type EventType =
  | PropertyEventType
  | OpportunityEventType
  | DealsEventType
  | ChecklistEventType
  | string; // Allow custom event types

/**
 * Event Payload Structure
 */
export interface EventPayload {
  event_type: EventType;
  data: Record<string, any>;
  timestamp: string;
  source_service: string;
  metadata?: Record<string, any>;
}

/**
 * Event Subscription Callback
 */
export type EventCallback = (payload: EventPayload) => void | Promise<void>;

/**
 * Event Subscription Options
 */
export interface SubscribeOptions {
  /**
   * Filter events by source service
   */
  source_service?: string;
  
  /**
   * Filter events by metadata
   */
  metadata_filter?: Record<string, any>;
  
  /**
   * Maximum number of events to process (for testing)
   */
  max_events?: number;
}

