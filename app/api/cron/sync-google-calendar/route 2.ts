/**
 * POST /api/cron/sync-google-calendar
 * Cron job to automatically sync Google Calendar events
 * Should be called periodically (e.g., every hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleCalendarSyncService } from '@/lib/google-calendar/sync-service';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (if configured)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const syncService = getGoogleCalendarSyncService();

    // Get all users with Google Calendar connected
    // google_calendar_tokens table not in types yet - using cast
    const { data: connectedUsers, error: usersError } = await (supabaseAdmin as any)
      .from('google_calendar_tokens')
      .select('user_id');

    if (usersError) {
      throw usersError;
    }

    if (!connectedUsers || connectedUsers.length === 0) {
      return NextResponse.json({ message: 'No users with Google Calendar connected' });
    }

    const results = [];

    // Sync for each connected user
    for (const { user_id } of connectedUsers) {
      try {
        // Get user's properties
        const { data: propertiesData, error: propertiesError } = await supabaseAdmin
          .from('properties')
          .select('*');

        if (propertiesError) {
          console.error(`[sync-google-calendar] Error fetching properties for user ${user_id}:`, propertiesError);
          continue;
        }

        // Convert to Property format
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
        const result = await syncService.syncAllEvents(user_id, properties as any);
        
        results.push({
          userId: user_id,
          success: result.success,
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
          errors: result.errors.length,
        });
      } catch (error: any) {
        console.error(`[sync-google-calendar] Error syncing for user ${user_id}:`, error);
        results.push({
          userId: user_id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedUsers: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[POST /api/cron/sync-google-calendar] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

