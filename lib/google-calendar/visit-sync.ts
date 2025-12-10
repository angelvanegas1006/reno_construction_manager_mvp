/**
 * Visit Sync Service
 * 
 * NOTE: This file should only be used in server-side contexts (API routes).
 * For client-side components, use the API routes instead.
 */

import { getGoogleCalendarApiClient } from './api-client';
import { createClient } from '@/lib/supabase/server';

interface Visit {
  id: string;
  property_id: string;
  visit_date: string;
  visit_type: 'initial-check' | 'final-check' | 'obra-seguimiento' | 'reminder';
  notes: string | null;
  created_by: string | null;
  property_address?: string;
}

/**
 * Sync a single visit/reminder to Google Calendar
 */
export async function syncVisitToGoogleCalendar(
  visit: Visit,
  userId: string
): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const apiClient = getGoogleCalendarApiClient();

    // Check if user has Google Calendar connected
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    const calendarId = tokenData.calendar_id || 'primary';

    // Get property details for event description
    const { data: property } = await supabase
      .from('properties')
      .select('address')
      .eq('id', visit.property_id)
      .single();

    const address = property?.address || visit.property_address || 'Dirección no disponible';

    // Map visit type to event title
    const visitTypeTitles: Record<string, string> = {
      'initial-check': 'Check Inicial',
      'final-check': 'Check Final',
      'obra-seguimiento': 'Seguimiento de Obra',
      'reminder': 'Recordatorio',
    };

    const title = `${visitTypeTitles[visit.visit_type] || 'Visita'} - ${address}`;

    // Build description
    const descriptionParts = [
      `Tipo: ${visitTypeTitles[visit.visit_type] || 'Visita'}`,
      `Dirección: ${address}`,
    ];

    if (visit.notes) {
      descriptionParts.push(`Notas: ${visit.notes}`);
    }

    descriptionParts.push(`\nID de Visita: ${visit.id}`);
    descriptionParts.push(`ID de Propiedad: ${visit.property_id}`);

    // Format date for Google Calendar
    const visitDate = new Date(visit.visit_date);
    const dateStr = visitDate.toISOString().split('T')[0];
    const timeStr = visitDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Check if this visit is already synced
    const { data: existingSync } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('user_id', userId)
      .eq('property_id', visit.property_id)
      .eq('event_type', visit.visit_type === 'reminder' ? 'reminder' : 'manual_visit')
      .single();

    const eventData = {
      summary: title,
      description: descriptionParts.join('\n'),
      start: {
        dateTime: visitDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(visitDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location: address,
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'popup' as const,
            minutes: 30, // 30 minutes before
          },
          {
            method: 'email' as const,
            minutes: 1440, // 1 day before
          },
        ],
      },
    };

    if (existingSync?.google_event_id) {
      // Update existing event
      const updatedEvent = await apiClient.updateEvent(
        userId,
        calendarId,
        existingSync.google_event_id,
        eventData,
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
        .eq('property_id', visit.property_id)
        .eq('event_type', visit.visit_type === 'reminder' ? 'reminder' : 'manual_visit');

      return { success: true, googleEventId: updatedEvent.id };
    } else {
      // Create new event
      const createdEvent = await apiClient.createEvent(
        userId,
        calendarId,
        eventData,
        supabase
      );

      // Create sync record
      await supabase.from('google_calendar_events').insert({
        user_id: userId,
        property_id: visit.property_id,
        event_type: visit.visit_type === 'reminder' ? 'reminder' : 'manual_visit',
        google_event_id: createdEvent.id!,
        calendar_id: calendarId,
      });

      return { success: true, googleEventId: createdEvent.id };
    }
  } catch (error: any) {
    console.error('[syncVisitToGoogleCalendar] Error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a visit/reminder from Google Calendar
 */
export async function deleteVisitFromGoogleCalendar(
  visitId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const apiClient = getGoogleCalendarApiClient();

    // Find sync record - we need to match by visit ID stored in description or use a different approach
    // Since we store property_id in the sync record, we need to get the visit first to find the property_id
    const { data: visit } = await supabase
      .from('property_visits')
      .select('property_id, visit_type')
      .eq('id', visitId)
      .single();

    if (!visit) {
      // Visit already deleted or not found
      return { success: true };
    }

    // Find sync record using property_id and event_type
    const eventType = visit.visit_type === 'reminder' ? 'reminder' : 'manual_visit';
    const { data: syncRecord } = await supabase
      .from('google_calendar_events')
      .select('google_event_id, calendar_id')
      .eq('user_id', userId)
      .eq('property_id', visit.property_id)
      .eq('event_type', eventType)
      .single();

    if (!syncRecord) {
      // Visit wasn't synced, that's okay
      return { success: true };
    }

    // Delete from Google Calendar
    await apiClient.deleteEvent(
      userId,
      syncRecord.calendar_id || 'primary',
      syncRecord.google_event_id,
      supabase
    );

    // Delete sync record
    await supabase
      .from('google_calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('google_event_id', syncRecord.google_event_id);

    return { success: true };
  } catch (error: any) {
    console.error('[deleteVisitFromGoogleCalendar] Error:', error);
    // If visit is already deleted, that's okay
    if (error.message?.includes('No rows') || error.message?.includes('not found')) {
      return { success: true };
    }
    return { success: false, error: error.message || 'Unknown error' };
  }
}

