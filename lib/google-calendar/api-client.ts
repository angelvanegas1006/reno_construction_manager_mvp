/**
 * Google Calendar API Client
 * 
 * Handles OAuth flow and API calls to Google Calendar
 */

import { GoogleCalendarConfig, GoogleCalendarApiEvent, GoogleCalendarEventData } from './types';
import { decryptToken } from '@/lib/encryption/token-encryption';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCalendarConfig } from './config-check';

export class GoogleCalendarApiClient {
  private config: GoogleCalendarConfig;

  constructor() {
    const config = getGoogleCalendarConfig();
    
    if (!config) {
      throw new Error('Google Calendar credentials not configured');
    }

    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }

  /**
   * Get valid access token for user (refresh if needed)
   * Note: This should be called from server-side code only
   */
  async getAccessToken(userId: string, supabaseClient?: any): Promise<string> {
    const supabase = supabaseClient || await createClient();
    
    // google_calendar_tokens table not in types yet - using cast
    const { data: tokenData, error } = await (supabase as any)
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      throw new Error('Google Calendar not connected for this user');
    }

    // Decrypt tokens
    const accessToken = decryptToken(tokenData.access_token);
    const refreshToken = decryptToken(tokenData.refresh_token);

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < buffer) {
      // Token expired or expiring soon, refresh it
      const refreshed = await this.refreshAccessToken(refreshToken);
      
      // Note: Encryption should be handled by the API route that calls this
      // For now, we'll return the plain token and let the caller encrypt it
      
      // Update stored token
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      // google_calendar_tokens table not in types yet - using cast
      const { error: updateError } = await (supabase as any)
        .from('google_calendar_tokens')
        .update({
          access_token: encryptedAccessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[getAccessToken] Error updating refreshed token:', updateError);
      }

      return refreshed.access_token;
    }

    return accessToken;
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(
    userId: string,
    calendarId: string,
    eventData: GoogleCalendarEventData,
    supabaseClient?: any
  ): Promise<GoogleCalendarApiEvent> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create event: ${error}`);
    }

    return response.json();
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(
    userId: string,
    calendarId: string,
    eventId: string,
    eventData: Partial<GoogleCalendarEventData>,
    supabaseClient?: any
  ): Promise<GoogleCalendarApiEvent> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update event: ${error}`);
    }

    return response.json();
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(userId: string, calendarId: string, eventId: string, supabaseClient?: any): Promise<void> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  /**
   * List events from Google Calendar
   */
  async listEvents(
    userId: string,
    calendarId: string,
    params?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
    },
    supabaseClient?: any
  ): Promise<GoogleCalendarApiEvent[]> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const queryParams = new URLSearchParams();
    if (params?.timeMin) queryParams.set('timeMin', params.timeMin);
    if (params?.timeMax) queryParams.set('timeMax', params.timeMax);
    if (params?.maxResults) queryParams.set('maxResults', params.maxResults.toString());

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list events: ${error}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Get primary calendar ID for user
   */
  async getPrimaryCalendarId(userId: string, supabaseClient?: any): Promise<string> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get primary calendar: ${error}`);
    }

    const data = await response.json();
    return data.id;
  }
}

let apiClient: GoogleCalendarApiClient | null = null;

export function getGoogleCalendarApiClient(): GoogleCalendarApiClient {
  if (!apiClient) {
    apiClient = new GoogleCalendarApiClient();
  }
  return apiClient;
}

