/**
 * Utility to check if Google Calendar is configured
 */

export function isGoogleCalendarConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return !!(clientId && clientSecret);
}

/**
 * Get Google Calendar configuration or null if not configured
 */
export function getGoogleCalendarConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  if (!isGoogleCalendarConfigured()) {
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  
  // Use environment variable or construct from NEXT_PUBLIC_APP_URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.NEXT_PUBLIC_VERCEL_URL ? 
                    `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 
                    'http://localhost:3000');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/google-calendar/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

