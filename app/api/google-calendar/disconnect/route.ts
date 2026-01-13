/**
 * POST /api/google-calendar/disconnect
 * Disconnect Google Calendar for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete tokens
    // google_calendar_tokens table not in types yet - using cast
    const { error: deleteError } = await (supabase as any)
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Delete synced events
    // google_calendar_events table not in types yet - using cast
    await (supabase as any)
      .from('google_calendar_events')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/google-calendar/disconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

