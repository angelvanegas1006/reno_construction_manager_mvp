/**
 * POST /api/google-calendar/sync-visit
 * Sync a single visit/reminder to Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarApiClient } from '@/lib/google-calendar/api-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { visitId, action } = body; // action: 'create' | 'update' | 'delete'

    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    // Get visit data
    const { data: visit, error: visitError } = await supabase
      .from('property_visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check if user has Google Calendar connected
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('user_id', user.id)
      .single();

    if (!tokenData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Calendar not connected',
        skipped: true 
      });
    }

    const calendarId = tokenData.calendar_id || 'primary';
    const apiClient = getGoogleCalendarApiClient();

    // Get property details
    const { data: property } = await supabase
      .from('properties')
      .select('address')
      .eq('id', visit.property_id)
      .single();

    const address = property?.address || 'Dirección no disponible';

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

    const eventType = visit.visit_type === 'reminder' ? 'reminder' : 'manual_visit';

    if (action === 'delete') {
      // Find sync record
      const { data: syncRecord } = await supabase
        .from('google_calendar_events')
        .select('google_event_id')
        .eq('user_id', user.id)
        .eq('property_id', visit.property_id)
        .eq('event_type', eventType)
        .single();

      if (syncRecord) {
        await apiClient.deleteEvent(
          user.id,
          calendarId,
          syncRecord.google_event_id,
          supabase
        );

        await supabase
          .from('google_calendar_events')
          .delete()
          .eq('user_id', user.id)
          .eq('google_event_id', syncRecord.google_event_id);
      }

      return NextResponse.json({ success: true });
    }

    // Check if this visit is already synced
    const { data: existingSync } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('user_id', user.id)
      .eq('property_id', visit.property_id)
      .eq('event_type', eventType)
      .single();

    if (existingSync?.google_event_id) {
      // Update existing event
      const updatedEvent = await apiClient.updateEvent(
        user.id,
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
        .eq('user_id', user.id)
        .eq('property_id', visit.property_id)
        .eq('event_type', eventType);

      return NextResponse.json({ 
        success: true, 
        googleEventId: updatedEvent.id,
        action: 'updated'
      });
    } else {
      // Create new event
      const createdEvent = await apiClient.createEvent(
        user.id,
        calendarId,
        eventData,
        supabase
      );

      // Create sync record
      await supabase.from('google_calendar_events').insert({
        user_id: user.id,
        property_id: visit.property_id,
        event_type: eventType,
        google_event_id: createdEvent.id!,
        calendar_id: calendarId,
      });

      return NextResponse.json({ 
        success: true, 
        googleEventId: createdEvent.id,
        action: 'created'
      });
    }
  } catch (error: any) {
    console.error('[POST /api/google-calendar/sync-visit] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

