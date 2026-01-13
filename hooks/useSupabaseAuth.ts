"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Hook para obtener el usuario de Supabase por email cuando Auth0 está autenticado
 * pero no hay sesión de Supabase
 */
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Usar una API route para obtener el usuario por email (requiere admin)
    const response = await fetch(`/api/auth/get-user-by-email?email=${encodeURIComponent(email)}`);
    if (response.ok) {
      const data = await response.json();
      return data.user || null;
    }
    return null;
  } catch (error) {
    console.warn('[useSupabaseAuth] Error fetching user by email:', error);
    return null;
  }
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const userRef = useRef<User | null>(null);

  // Mantener ref actualizado
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let pollStartTime: number | null = null;
    const MAX_POLL_TIME = 30000; // 30 segundos máximo de polling

    async function checkAuth0User(): Promise<string | null> {
      if (typeof window === 'undefined') return null;
      
      try {
        // Intentar múltiples formas de obtener el email de Auth0
        const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
        if (!clientId) return null;

        // Método 1: Cache estándar de Auth0
        const auth0Cache = localStorage.getItem(`@@auth0spajs@@::${clientId}`);
        if (auth0Cache) {
          try {
            const parsed = JSON.parse(auth0Cache);
            const auth0User = parsed.body?.user || parsed.user;
            if (auth0User?.email) {
              return auth0User.email;
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }

        // Método 2: Buscar en todas las claves de localStorage que contengan auth0
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth0') && key.includes(clientId)) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const parsed = JSON.parse(value);
                const auth0User = parsed.body?.user || parsed.user || parsed;
                if (auth0User?.email) {
                  return auth0User.email;
                }
              }
            } catch (e) {
              // Continuar buscando
            }
          }
        }
      } catch (err) {
        console.warn('[useSupabaseAuth] Error checking Auth0 cache:', err);
      }
      
      return null;
    }

    async function initializeAuth() {
      try {
        // Primero intentar obtener la sesión de Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Hay sesión de Supabase, usar ese usuario
          if (mounted) {
            setSession(session);
            setUser(session.user);
            setLoading(false);
          }
          return;
        }

        // No hay sesión de Supabase - esto es normal para usuarios de Auth0
        // Intentar obtener el usuario desde Auth0 si está disponible
        const auth0Email = await checkAuth0User();
        if (auth0Email && mounted) {
          // Usuario autenticado con Auth0, buscar usuario en Supabase por email
          console.log('[useSupabaseAuth] 🔍 Auth0 user detected, fetching Supabase user by email:', auth0Email);
          const supabaseUser = await getUserByEmail(auth0Email);
          if (supabaseUser && mounted) {
            console.log('[useSupabaseAuth] ✅ Found Supabase user for Auth0 user:', supabaseUser.id);
            setUser(supabaseUser);
            setSession(null); // No hay sesión, pero sí usuario
            setLoading(false);
            return;
          } else if (mounted) {
            // Auth0 está autenticado pero no hay usuario en Supabase aún
            // Esto puede pasar justo después del callback, así que activar polling
            console.log('[useSupabaseAuth] ⏳ Auth0 authenticated but Supabase user not found yet, will poll...');
            setLoading(false);
          }
        } else if (mounted) {
          // No hay sesión ni usuario de Auth0
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      } catch (err: any) {
        // Manejar errores inesperados
        console.warn('[useSupabaseAuth] ⚠️ Error getting session:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Polling: Si Auth0 está autenticado pero no hay usuario de Supabase, buscar periódicamente
    // Esto es útil cuando el usuario se acaba de crear en el callback
    const startPolling = () => {
      if (pollInterval) return; // Ya está polling
      
      pollStartTime = Date.now();
      console.log('[useSupabaseAuth] 🚀 Starting polling for Supabase user...');
      
      pollInterval = setInterval(async () => {
        if (!mounted) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            pollStartTime = null;
          }
          return;
        }

        // Verificar límite de tiempo
        if (pollStartTime && Date.now() - pollStartTime > MAX_POLL_TIME) {
          console.warn('[useSupabaseAuth] ⏱️ Polling timeout reached, stopping...');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            pollStartTime = null;
          }
          return;
        }

        // Solo hacer polling si no hay usuario de Supabase
        if (userRef.current) {
          console.log('[useSupabaseAuth] ✅ User found, stopping polling');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            pollStartTime = null;
          }
          return;
        }

        const auth0Email = await checkAuth0User();
        if (auth0Email) {
          console.log('[useSupabaseAuth] 🔄 Polling: Checking for Supabase user...', auth0Email);
          const supabaseUser = await getUserByEmail(auth0Email);
          if (supabaseUser && mounted) {
            console.log('[useSupabaseAuth] ✅ Polling: Found Supabase user!', supabaseUser.id);
            setUser(supabaseUser);
            setSession(null);
            setLoading(false);
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
              pollStartTime = null;
            }
          }
        } else {
          // Ya no hay usuario de Auth0, detener polling
          console.log('[useSupabaseAuth] ⚠️ No Auth0 user found, stopping polling');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            pollStartTime = null;
          }
        }
      }, 1000); // Poll cada segundo
    };

    // Iniciar polling si hay usuario de Auth0 pero no de Supabase
    const checkAndStartPolling = async () => {
      const auth0Email = await checkAuth0User();
      if (auth0Email && !userRef.current) {
        startPolling();
      }
    };

    // Esperar un momento antes de iniciar polling (para dar tiempo al callback)
    setTimeout(checkAndStartPolling, 500);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Redirect to login if user signs out (only if there's no Auth0 user either)
        if (!session?.user) {
          // Verificar si hay usuario de Auth0 antes de redirigir
          if (typeof window !== 'undefined') {
            const auth0Cache = localStorage.getItem('@@auth0spajs@@::' + process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
            if (!auth0Cache) {
              // No hay sesión de Supabase ni usuario de Auth0, redirigir a login
              setTimeout(() => {
                router.push('/login');
              }, 0);
            }
          } else {
            // Server-side, redirigir si no hay sesión
            setTimeout(() => {
              router.push('/login');
            }, 0);
          }
        }
      }
    });

    // Escuchar eventos personalizados para refrescar el estado cuando se crea un usuario de Auth0
    const handleAuth0UserCreated = async (event: Event) => {
      if (!mounted || typeof window === 'undefined') return;
      
      const customEvent = event as CustomEvent;
      const email = customEvent.detail?.email;
      
      console.log('[useSupabaseAuth] 🔄 Auth0 user created event received, refreshing auth state...', { email });
      
      // Esperar un momento para que el usuario se cree en Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Si tenemos el email del evento, buscar directamente
      if (email) {
        try {
          const supabaseUser = await getUserByEmail(email);
          if (supabaseUser && mounted) {
            console.log('[useSupabaseAuth] ✅ Found Supabase user after creation:', supabaseUser.id);
            setUser(supabaseUser);
            setSession(null);
            setLoading(false);
            // Detener polling si está activo
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          }
        } catch (err) {
          console.warn('[useSupabaseAuth] Error fetching user after creation:', err);
        }
      }
      
      // Si no tenemos email o no encontramos usuario, re-inicializar
      if (mounted) {
        await initializeAuth();
        // Reiniciar polling si es necesario
        await checkAndStartPolling();
      }
    };

    // Escuchar cambios en localStorage de Auth0
    const handleStorageChange = async (e: StorageEvent) => {
      if (!mounted || typeof window === 'undefined') return;
      if (!e.key || !e.key.includes('auth0')) return;
      
      console.log('[useSupabaseAuth] 🔄 Auth0 storage changed, checking for user...');
      const auth0Email = await checkAuth0User();
      if (auth0Email && !userRef.current) {
        const supabaseUser = await getUserByEmail(auth0Email);
        if (supabaseUser && mounted) {
          console.log('[useSupabaseAuth] ✅ Found Supabase user after storage change:', supabaseUser.id);
          setUser(supabaseUser);
          setSession(null);
          setLoading(false);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (!pollInterval) {
          startPolling();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth0-user-created', handleAuth0UserCreated);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        pollStartTime = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth0-user-created', handleAuth0UserCreated);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [router, supabase.auth]);

  const signOut = useCallback(async () => {
    // Hacer logout de Supabase
    await supabase.auth.signOut();
    
    // También hacer logout de Auth0 si está autenticado
    if (typeof window !== 'undefined') {
      const auth0Cache = localStorage.getItem('@@auth0spajs@@::' + process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
      if (auth0Cache) {
        try {
          // Limpiar cache de Auth0
          localStorage.removeItem('@@auth0spajs@@::' + process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
          
          // También limpiar cualquier otra clave relacionada con Auth0
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('auth0') && key.includes(process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '')) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn('[useSupabaseAuth] Error clearing Auth0 cache:', e);
        }
      }
    }
    
    router.push('/login');
  }, [supabase.auth, router]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase.auth]);

  return {
    user,
    session,
    loading,
    signOut,
    getAccessToken,
    isAuthenticated: !!user,
  };
}

