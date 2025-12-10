/**
 * GET /api/google-calendar/status
 * Get Google Calendar connection status for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar/config-check';

export async function GET(request: NextRequest) {
  try {
    // Check if Google Calendar is configured
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json({
        connected: false,
        configured: false,
        connectedAt: null,
        lastSyncAt: null,
      });
    }

    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check connection status
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('connected_at, updated_at')
      .eq('user_id', user.id)
      .single();

    // Get last sync time from events
    const { data: lastEvent } = await supabase
      .from('google_calendar_events')
      .select('synced_at')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      connected: !!tokenData,
      configured: true,
      connectedAt: tokenData?.connected_at || null,
      lastSyncAt: lastEvent?.synced_at || null,
    });
  } catch (error: any) {
    console.error('[GET /api/google-calendar/status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

