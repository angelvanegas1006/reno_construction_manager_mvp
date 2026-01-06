/**
 * Event Bus Singleton Instance
 * 
 * Use this instance throughout the application
 * Automatically configures based on environment
 */

import { EventBus } from '@vistral/event-bus';
import { supabase } from '@/lib/supabase/client';
import { config } from '@/lib/config/environment';

let eventBusInstance: EventBus | null = null;

/**
 * Get or create the Event Bus instance
 */
export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus({
      supabase,
      channelName: `vistral-events-${config.environment}`,
      enableLogging: config.features.eventBusLogging || config.isDevelopment,
    });
  }
  return eventBusInstance;
}

/**
 * Export the instance directly for convenience
 */
export const eventBus = getEventBus();

