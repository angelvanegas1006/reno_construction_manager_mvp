/**
 * POST /api/google-calendar/webhook
 * Receive notifications from Google Calendar when events change
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarSyncService } from '@/lib/google-calendar/sync-service';
import { getGoogleCalendarApiClient } from '@/lib/google-calendar/api-client';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid Google Calendar notification
    const headers = request.headers;
    const channelId = headers.get('X-Goog-Channel-Id');
    const channelToken = headers.get('X-Goog-Channel-Token');
    const resourceState = headers.get('X-Goog-Resource-State');

    if (!channelId || !channelToken) {
      return NextResponse.json({ error: 'Invalid webhook request' }, { status: 400 });
    }

    // In production, verify the channel token matches what we stored
    // For now, we'll process the notification

    if (resourceState === 'sync') {
      // Initial sync - acknowledge but don't process
      return NextResponse.json({ success: true });
    }

    // Get the resource URI from headers
    const resourceUri = headers.get('X-Goog-Resource-Uri');
    if (!resourceUri) {
      return NextResponse.json({ error: 'Missing resource URI' }, { status: 400 });
    }

    // Extract calendar ID and user ID from resource URI or channel token
    // In production, you'd store this mapping when creating the channel
    // For now, we'll need to find the user by channel token
    
    const supabase = await createClient();
    
    // Find user by channel token (you'd store this when creating the watch)
    // This is simplified - in production, maintain a channels table
    // google_calendar_tokens table not in types yet - using cast
    const { data: tokenData } = await (supabase as any)
      .from('google_calendar_tokens')
      .select('user_id, calendar_id')
      .limit(1)
      .single();

    if (!tokenData) {
      return NextResponse.json({ error: 'No connected users' }, { status: 404 });
    }

    // Get events from Google Calendar
    const apiClient = getGoogleCalendarApiClient();
    const events = await apiClient.listEvents(
      tokenData.user_id,
      tokenData.calendar_id || 'primary',
      {
        timeMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Next year
      },
      supabase
    );

    // Sync events to properties
    const syncService = getGoogleCalendarSyncService();
    await syncService.syncCalendarToProperties(tokenData.user_id, events);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/google-calendar/webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (Google may use this)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}

