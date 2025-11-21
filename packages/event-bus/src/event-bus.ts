/**
 * Vistral Event Bus
 * 
 * Event-driven architecture implementation using Supabase Realtime
 * and PostgreSQL triggers for event distribution.
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { EventPayload, EventType, EventCallback, SubscribeOptions } from './types';

export interface EventBusConfig {
  supabase: SupabaseClient;
  channelName?: string;
  enableLogging?: boolean;
}

export class EventBus {
  private supabase: SupabaseClient;
  private channelName: string;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Set<EventCallback>> = new Map();
  private enableLogging: boolean;

  constructor(config: EventBusConfig) {
    this.supabase = config.supabase;
    this.channelName = config.channelName || 'vistral-events';
    this.enableLogging = config.enableLogging ?? false;
  }

  /**
   * Publish an event to the event bus
   * 
   * @param eventType - Type of event (e.g., 'property.created')
   * @param data - Event data payload
   * @param sourceService - Name of the service publishing the event
   * @param metadata - Optional metadata
   */
  async publish(
    eventType: EventType,
    data: Record<string, any>,
    sourceService: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const payload: EventPayload = {
      event_type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source_service: sourceService,
      metadata: metadata || {},
    };

    if (this.enableLogging) {
      console.log(`[EventBus] Publishing event: ${eventType}`, payload);
    }

    try {
      // Option 1: Use Supabase Realtime Broadcast
      const channel = this.getChannel(this.channelName);
      
      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload,
      });

      // Option 2: Also publish via PostgreSQL function (for triggers)
      // This allows database triggers to also publish events
      const { error } = await this.supabase.rpc('publish_event', {
        event_type: eventType,
        event_data: JSON.stringify(data),
        source_service: sourceService,
        event_metadata: metadata ? JSON.stringify(metadata) : null,
      });

      if (error && this.enableLogging) {
        console.warn(`[EventBus] RPC publish_event failed (may not exist yet):`, error);
      }
    } catch (error) {
      console.error(`[EventBus] Error publishing event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to one or more event types
   * 
   * @param eventTypes - Single event type or array of event types
   * @param callback - Function to call when event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  subscribe(
    eventTypes: EventType | EventType[],
    callback: EventCallback,
    options?: SubscribeOptions
  ): () => void {
    const events = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const channel = this.getChannel(this.channelName);

    // Store callbacks for each event type
    events.forEach(eventType => {
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, new Set());
      }
      this.subscriptions.get(eventType)!.add(callback);
    });

    // Subscribe to broadcast events
    channel.on('broadcast', { event: '*' }, (payload) => {
      const eventPayload = payload.payload as EventPayload;
      const eventType = eventPayload.event_type;

      // Check if we're subscribed to this event type
      if (!this.subscriptions.has(eventType)) {
        return;
      }

      // Apply filters
      if (options?.source_service && eventPayload.source_service !== options.source_service) {
        return;
      }

      if (options?.metadata_filter) {
        const matches = Object.entries(options.metadata_filter).every(
          ([key, value]) => eventPayload.metadata?.[key] === value
        );
        if (!matches) {
          return;
        }
      }

      // Call all callbacks for this event type
      const callbacks = this.subscriptions.get(eventType)!;
      callbacks.forEach(cb => {
        try {
          const result = cb(eventPayload);
          // Handle async callbacks
          if (result instanceof Promise) {
            result.catch(error => {
              console.error(`[EventBus] Error in callback for ${eventType}:`, error);
            });
          }
        } catch (error) {
          console.error(`[EventBus] Error in callback for ${eventType}:`, error);
        }
      });
    });

    channel.subscribe((status) => {
      if (this.enableLogging) {
        console.log(`[EventBus] Channel subscription status:`, status);
      }
    });

    // Return unsubscribe function
    return () => {
      events.forEach(eventType => {
        const callbacks = this.subscriptions.get(eventType);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.subscriptions.delete(eventType);
          }
        }
      });

      // If no more subscriptions, remove channel
      if (this.subscriptions.size === 0) {
        this.unsubscribeChannel(this.channelName);
      }
    };
  }

  /**
   * Subscribe to database changes via PostgreSQL triggers
   * 
   * @param table - Table name to watch
   * @param callback - Function to call when change occurs
   * @param schema - Schema name (default: 'public')
   * @returns Unsubscribe function
   */
  subscribeToDatabaseChanges(
    table: string,
    callback: (payload: any) => void,
    schema: string = 'public'
  ): () => void {
    const channelName = `${table}-changes`;
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
        },
        (payload) => {
          if (this.enableLogging) {
            console.log(`[EventBus] Database change on ${table}:`, payload);
          }
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  /**
   * Get or create a Realtime channel
   */
  private getChannel(name: string): RealtimeChannel {
    if (!this.channels.has(name)) {
      const channel = this.supabase.channel(name);
      this.channels.set(name, channel);
    }
    return this.channels.get(name)!;
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribeChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(name);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  disconnect(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

