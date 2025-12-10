/**
 * GET /api/google-calendar/callback
 * Handle Google Calendar OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarApiClient } from '@/lib/google-calendar/api-client';
import { encryptToken } from '@/lib/encryption/token-encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Allow all authenticated users to connect their Google Calendar

    // Verify state token
    const state = request.nextUrl.searchParams.get('state');
    const cookieState = request.cookies.get('google_calendar_oauth_state')?.value;
    
    if (!state || state !== cookieState) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }

    // Get authorization code
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=google_calendar_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    // Exchange code for tokens
    const apiClient = getGoogleCalendarApiClient();
    const tokens = await apiClient.exchangeCodeForTokens(code);

    // Get primary calendar ID
    const tempAccessToken = tokens.access_token;
    const calendarId = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
      headers: {
        Authorization: `Bearer ${tempAccessToken}`,
      },
    }).then((res) => res.json()).then((data) => data.id);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database
    // google_calendar_tokens table not in types yet - using cast
    const { error: insertError } = await (supabase as any)
      .from('google_calendar_tokens')
      .upsert({
        user_id: user.id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        calendar_id: calendarId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (insertError) {
      console.error('[GET /api/google-calendar/callback] Error storing tokens:', insertError);
      return NextResponse.redirect(
        new URL('/login?error=storage_failed', request.url)
      );
    }

    // Clear state cookie
    const response = NextResponse.redirect(new URL('/reno/construction-manager?google_calendar=connected', request.url));
    response.cookies.delete('google_calendar_oauth_state');

    return response;
  } catch (error: any) {
    console.error('[GET /api/google-calendar/callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

