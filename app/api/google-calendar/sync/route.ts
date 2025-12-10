/**
 * POST /api/google-calendar/sync
 * Manually trigger synchronization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarSyncService } from '@/lib/google-calendar/sync-service';
import { useSupabaseKanbanProperties } from '@/hooks/useSupabaseKanbanProperties';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow all authenticated users to sync their Google Calendar

    // Check if Google Calendar is connected
    // google_calendar_tokens table not in types yet - using cast
    const { data: tokenData } = await (supabase as any)
      .from('google_calendar_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Get all properties
    // Note: This is a simplified version - in production, you'd want to fetch properties properly
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('properties')
      .select('*');

    if (propertiesError) {
      throw propertiesError;
    }

    // Convert to Property format (simplified - adjust based on your Property interface)
    const properties = (propertiesData || []).map((p: any) => ({
      id: p.id,
      fullAddress: p.address || '',
      address: p.address,
      estimatedVisitDate: p['Estimated Visit Date'],
      inicio: p.start_date,
      finEst: p.estimated_end_date,
      renoDuration: p['Reno Duration'],
      renovador: p['Renovator name'],
      renoType: p.renovation_type,
      region: p.area_cluster,
      data: {
        clientEmail: p['Client email'],
        notes: p.notes,
      },
    }));

    // Sync events
    const syncService = getGoogleCalendarSyncService();
    const result = await syncService.syncAllEvents(user.id, properties as any);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[POST /api/google-calendar/sync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

