/**
 * Google Calendar Sync Service
 * 
 * Handles bidirectional synchronization between properties and Google Calendar
 */

import { getGoogleCalendarApiClient } from './api-client';
import { getPropertyEvents, mapPropertyEventToGoogleCalendar } from './event-mapper';
import { PropertyEvent, PropertyEventType, SyncResult } from './types';
import { Property } from '@/lib/property-storage';
import { createClient } from '@/lib/supabase/server';
// Encryption is handled in API routes when storing tokens

export class GoogleCalendarSyncService {
  /**
   * Sync property events to Google Calendar
   */
  async syncPropertyEventsToCalendar(
    userId: string,
    properties: Property[]
  ): Promise<SyncResult> {
    const supabase = await createClient();
    const apiClient = getGoogleCalendarApiClient();

    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get user's calendar ID
      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      if (!tokenData?.calendar_id) {
        // Get primary calendar ID
        const calendarId = await apiClient.getPrimaryCalendarId(userId, supabase);
        // Update token with calendar ID
        await supabase
          .from('google_calendar_tokens')
          .update({ calendar_id: calendarId })
          .eq('user_id', userId);
        tokenData.calendar_id = calendarId;
      }

      const calendarId = tokenData.calendar_id;

      // Get existing synced events
      const { data: existingEvents } = await supabase
        .from('google_calendar_events')
        .select('property_id, event_type, google_event_id')
        .eq('user_id', userId);

      const existingEventsMap = new Map<string, string>();
      existingEvents?.forEach((event) => {
        const key = `${event.property_id}_${event.event_type}`;
        existingEventsMap.set(key, event.google_event_id);
      });

      // Process each property
      for (const property of properties) {
        const propertyEvents = getPropertyEvents(property);

        for (const propertyEvent of propertyEvents) {
          try {
            const key = `${propertyEvent.propertyId}_${propertyEvent.eventType}`;
            const existingGoogleEventId = existingEventsMap.get(key);

            const googleEventData = mapPropertyEventToGoogleCalendar(
              property,
              propertyEvent.eventType
            );

            if (!googleEventData) {
              continue; // Skip if event data is invalid
            }

            if (existingGoogleEventId) {
              // Update existing event
              const updatedEvent = await apiClient.updateEvent(
                userId,
                calendarId,
                existingGoogleEventId,
                googleEventData,
                supabase
              );

              // Update sync record
              await supabase
                .from('google_calendar_events')
                .update({
                  synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('property_id', propertyEvent.propertyId)
                .eq('event_type', propertyEvent.eventType);

              result.updated++;
            } else {
              // Create new event
              const createdEvent = await apiClient.createEvent(
                userId,
                calendarId,
                googleEventData,
                supabase
              );

              // Create sync record
              await supabase.from('google_calendar_events').insert({
                user_id: userId,
                property_id: propertyEvent.propertyId,
                event_type: propertyEvent.eventType,
                google_event_id: createdEvent.id!,
                calendar_id: calendarId,
              });

              result.created++;
            }
          } catch (error: any) {
            result.errors.push({
              propertyId: propertyEvent.propertyId,
              eventType: propertyEvent.eventType,
              error: error.message || 'Unknown error',
            });
            result.success = false;
          }
        }
      }

      // Delete events for properties that no longer have the event
      const currentEventKeys = new Set<string>();
      properties.forEach((property) => {
        const propertyEvents = getPropertyEvents(property);
        propertyEvents.forEach((event) => {
          currentEventKeys.add(`${event.propertyId}_${event.eventType}`);
        });
      });

      for (const [key, googleEventId] of existingEventsMap.entries()) {
        if (!currentEventKeys.has(key)) {
          try {
            const [propertyId, eventType] = key.split('_');
            const event = existingEvents?.find(
              (e) => e.property_id === propertyId && e.event_type === eventType
            );

            if (event) {
              await apiClient.deleteEvent(userId, calendarId, googleEventId, supabase);
              await supabase
                .from('google_calendar_events')
                .delete()
                .eq('user_id', userId)
                .eq('property_id', propertyId)
                .eq('event_type', eventType);

              result.deleted++;
            }
          } catch (error: any) {
            result.errors.push({
              propertyId: key.split('_')[0],
              eventType: key.split('_')[1] as PropertyEventType,
              error: `Failed to delete: ${error.message}`,
            });
            result.success = false;
          }
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        propertyId: 'all',
        eventType: 'estimated_visit',
        error: error.message || 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Sync Google Calendar events to properties
   * This is called when Google Calendar events are updated externally
   */
  async syncCalendarToProperties(
    userId: string,
    calendarEvents: Array<{ id: string; summary: string; description?: string; start?: { date?: string; dateTime?: string } }>
  ): Promise<SyncResult> {
    const supabase = await createClient();
    const { extractPropertyEventFromGoogleCalendar } = await import('./event-mapper');

    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Process each Google Calendar event
      for (const googleEvent of calendarEvents) {
        try {
          const extracted = extractPropertyEventFromGoogleCalendar(googleEvent);

          if (!extracted?.propertyId || !extracted?.eventType) {
            continue; // Skip if we can't extract property info
          }

          // Check if we have a sync record
          const { data: syncRecord } = await supabase
            .from('google_calendar_events')
            .select('*')
            .eq('user_id', userId)
            .eq('property_id', extracted.propertyId)
            .eq('event_type', extracted.eventType)
            .single();

          if (syncRecord) {
            // Update sync record timestamp
            await supabase
              .from('google_calendar_events')
              .update({
                synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', syncRecord.id);

            result.updated++;
          } else {
            // Create new sync record (event was created in Google Calendar)
            const { data: tokenData } = await supabase
              .from('google_calendar_tokens')
              .select('calendar_id')
              .eq('user_id', userId)
              .single();

            await supabase.from('google_calendar_events').insert({
              user_id: userId,
              property_id: extracted.propertyId,
              event_type: extracted.eventType,
              google_event_id: googleEvent.id,
              calendar_id: tokenData?.calendar_id || 'primary',
            });

            result.created++;
          }
        } catch (error: any) {
          result.errors.push({
            propertyId: 'unknown',
            eventType: 'estimated_visit',
            error: error.message || 'Unknown error',
          });
          result.success = false;
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        propertyId: 'all',
        eventType: 'estimated_visit',
        error: error.message || 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Sync all events (bidirectional)
   */
  async syncAllEvents(userId: string, properties: Property[]): Promise<SyncResult> {
    // First sync properties to Google Calendar
    const syncToCalendar = await this.syncPropertyEventsToCalendar(userId, properties);

    // Then sync from Google Calendar (to catch any external changes)
    try {
      const apiClient = getGoogleCalendarApiClient();
      const supabase = await createClient();

      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      if (tokenData?.calendar_id) {
        const calendarEvents = await apiClient.listEvents(
          userId,
          tokenData.calendar_id,
          {
            timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Next year
          },
          supabase
        );

        const syncFromCalendar = await this.syncCalendarToProperties(userId, calendarEvents);

        // Combine results
        return {
          success: syncToCalendar.success && syncFromCalendar.success,
          created: syncToCalendar.created + syncFromCalendar.created,
          updated: syncToCalendar.updated + syncFromCalendar.updated,
          deleted: syncToCalendar.deleted + syncFromCalendar.deleted,
          errors: [...syncToCalendar.errors, ...syncFromCalendar.errors],
        };
      }
    } catch (error: any) {
      console.error('[syncAllEvents] Error syncing from calendar:', error);
    }

    return syncToCalendar;
  }
}

let syncService: GoogleCalendarSyncService | null = null;

export function getGoogleCalendarSyncService(): GoogleCalendarSyncService {
  if (!syncService) {
    syncService = new GoogleCalendarSyncService();
  }
  return syncService;
}

