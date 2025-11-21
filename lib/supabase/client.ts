"use client";

/**
 * Supabase Client Configuration
 * 
 * Uses @supabase/ssr for Next.js App Router compatibility
 * Supports multiple environments: development, staging, production
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { config, getSupabaseProjectName } from '@/lib/config/environment';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 
    'Missing Supabase environment variables. ' +
    `Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.\n` +
    `Current environment: ${config.environment}\n` +
    `Expected Supabase project: ${getSupabaseProjectName()}`;
  
  if (config.isDevelopment) {
    console.warn(`⚠️  ${errorMessage}`);
  } else {
    throw new Error(errorMessage);
  }
}

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': `vistral-${config.environment}`,
          'x-supabase-project': getSupabaseProjectName(),
        },
      },
    }
  );
}

// Export singleton for backward compatibility
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
})();
