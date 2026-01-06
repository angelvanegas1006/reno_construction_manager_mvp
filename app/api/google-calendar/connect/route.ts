/**
 * GET /api/google-calendar/connect
 * Initiate Google Calendar OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarApiClient } from '@/lib/google-calendar/api-client';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar/config-check';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if Google Calendar is configured
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow all authenticated users to connect their Google Calendar
    // Each user will sync events to their own personal calendar

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session/cookie (simplified - in production use secure session storage)
    const response = NextResponse.redirect(
      getGoogleCalendarApiClient().getAuthorizationUrl(state)
    );
    
    // Set state in cookie (httpOnly, secure in production)
    response.cookies.set('google_calendar_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('[GET /api/google-calendar/connect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

