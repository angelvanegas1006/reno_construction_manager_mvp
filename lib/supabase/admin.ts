/**
 * Supabase Admin Client
 * Usa service_role key para operaciones administrativas (cron jobs, etc.)
 * ⚠️ NUNCA usar en el cliente (browser)
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Crea un cliente de Supabase con permisos de administrador
 * Solo usar en server-side (API routes, cron jobs, etc.)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Required for admin operations.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}


