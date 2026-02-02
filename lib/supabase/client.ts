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

// Interceptar errores globales para suprimir "Auth session missing!" cuando es esperado
// Solo ejecutar una vez usando una variable de módulo
let errorInterceptorsInstalled = false;

if (typeof window !== 'undefined' && !errorInterceptorsInstalled) {
  errorInterceptorsInstalled = true;
  
  // Guardar referencias originales
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalLog = console.log.bind(console);
  
  // Función helper para detectar errores de sesión faltante
  const isAuthSessionMissingError = (arg: any): boolean => {
    if (!arg) return false;
    
    const errorMessage = typeof arg === 'string' ? arg : arg?.message || arg?.toString() || '';
    const errorName = arg?.name || '';
    const errorStack = arg?.stack || '';
    
    return (
      errorMessage.includes('Auth session missing') ||
      errorMessage.includes('AuthSessionMissingError') ||
      errorName === 'AuthSessionMissingError' ||
      errorStack.includes('AuthSessionMissingError') ||
      errorStack.includes('_useSession') ||
      errorStack.includes('_getUser')
    );
  };

  // Errores de red (Failed to fetch): mostrarlos como warn para no disparar el overlay de Next.js
  const isNetworkFetchError = (arg: any): boolean => {
    if (!arg) return false;
    const msg = typeof arg === 'string' ? arg : arg?.message || arg?.toString() || '';
    const name = arg?.name || '';
    return msg === 'Failed to fetch' || (name === 'TypeError' && String(msg).includes('fetch'));
  };
  
  // Interceptar console.error con mejor detección
  console.error = (...args: any[]) => {
    const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
    if (hasAuthSessionError) return;
    const hasNetworkError = args.some(arg => isNetworkFetchError(arg));
    if (hasNetworkError) {
      originalWarn(...args);
      return;
    }
    originalError(...args);
  };
  
  // También interceptar console.warn
  console.warn = (...args: any[]) => {
    const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
    
    if (hasAuthSessionError) {
      return;
    }
    originalWarn(...args);
  };
  
  // Interceptar errores no capturados a nivel de window
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    // Si el error es "Auth session missing!", no mostrarlo
    if (error && isAuthSessionMissingError(error)) {
      return true; // Prevenir que el error se muestre en la consola
    }
    if (typeof message === 'string' && message.includes('Auth session missing')) {
      return true;
    }
    // Para otros errores, llamar al handler original si existe
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Interceptar promesas rechazadas no capturadas
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    // Si el error es "Auth session missing!", prevenir que se muestre
    if (event.reason && isAuthSessionMissingError(event.reason)) {
      event.preventDefault();
      return;
    }
    if (typeof event.reason === 'string' && event.reason.includes('Auth session missing')) {
      event.preventDefault();
      return;
    }
    // Para otros errores, llamar al handler original si existe
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(window, event);
    }
  };
  
  // También interceptar console.trace por si acaso
  const originalTrace = console.trace.bind(console);
  console.trace = (...args: any[]) => {
    const hasAuthSessionError = args.some(arg => isAuthSessionMissingError(arg));
    if (!hasAuthSessionError) {
      originalTrace(...args);
    }
  };
}

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
  const errorMessage = 
    'Missing Supabase environment variables. ' +
    `Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.\n` +
    `Current environment: ${config.environment}\n` +
    `Expected Supabase project: ${getSupabaseProjectName()}\n` +
    `Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}\n` +
    `Supabase Anon Key: ${supabaseAnonKey ? 'Set' : 'Missing'}`;
  
  if (config.isDevelopment) {
    console.error(`❌ ${errorMessage}`);
    // In development, throw error to prevent creating invalid client
    throw new Error(errorMessage);
  } else {
    throw new Error(errorMessage);
  }
}

export function createClient() {
  // Double check before creating client
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
    throw new Error('Cannot create Supabase client: missing required environment variables');
  }
  
  const client = createBrowserClient<Database>(
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

  // Wrap getUser to handle "Auth session missing!" errors gracefully
  // Solo envolver si no está ya envuelto (evitar recursión)
  if (!(client.auth.getUser as any).__wrapped) {
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async (jwt?: string) => {
      try {
        return await originalGetUser(jwt);
      } catch (error: any) {
        // Si el error es "Auth session missing!", es normal cuando no hay sesión (ej: Auth0 users)
        if (error?.message?.includes('Auth session missing') || 
            error?.name === 'AuthSessionMissingError' ||
            error?.message?.includes('session missing')) {
          // Retornar null user en lugar de lanzar error
          return { data: { user: null }, error: null } as any;
        }
        // Para otros errores, lanzarlos normalmente
        throw error;
      }
    };
    // Marcar como envuelto para evitar múltiples wrappers
    (client.auth.getUser as any).__wrapped = true;
  }

  return client;
}

// Export singleton for backward compatibility
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
})();
