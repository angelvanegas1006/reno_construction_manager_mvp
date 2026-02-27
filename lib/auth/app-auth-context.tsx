"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSupabaseAuthContext } from './supabase-auth-context';
import { createClient } from '@/lib/supabase/client';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import type { Database } from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

type AppRole = Database['public']['Enums']['app_role'];

interface AppUser {
  id: string;
  email: string;
  role: AppRole;
}

interface AppAuthContextType {
  user: AppUser | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isForeman: boolean;
  isUser: boolean;
  isManagerProjects: boolean;
  isTechnicalConstructorProjects: boolean;
  isMadurationAnalyst: boolean;
  isSetUpAnalyst: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

const AppAuthContext = createContext<AppAuthContextType | undefined>(undefined);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const authContext = useSupabaseAuthContext();
  const supabaseUser: User | null = authContext.user;
  const supabaseLoading = authContext.loading;
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      console.log('[AppAuthProvider] 🔄 fetchUserRole called:', {
        hasSupabaseUser: !!supabaseUser,
        supabaseUserId: supabaseUser?.id,
        supabaseUserEmail: supabaseUser?.email,
        supabaseLoading,
        timestamp: new Date().toISOString(),
      });

      if (!supabaseUser) {
        console.log('[AppAuthProvider] ⚠️ No supabaseUser, setting appUser to null');
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        // Get user role from user_roles table
        let role: AppRole = 'user'; // Default role
        
        console.log('[AppAuthProvider] 📡 Fetching user role from user_roles table...', {
          userId: supabaseUser.id,
        });
        
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', supabaseUser.id)
            .single();

          console.log('[AppAuthProvider] 📥 User role query response:', {
            data,
            error: error ? {
              message: error.message,
              code: error.code,
              details: error.details,
            } : null,
            timestamp: new Date().toISOString(),
          });

          if (error) {
            // PGRST116 = no rows returned (user has no role assigned yet - this is OK)
            // 42P01 = relation does not exist (table doesn't exist - need to run migration)
            if (error.code === 'PGRST116') {
              // User has no role assigned, use default 'user'
              console.log('[AppAuthProvider] ⚠️ No role found (PGRST116), using default: user');
              role = 'user';
            } else if (error.code === '42P01') {
              // Table doesn't exist - log warning but continue with default role
              console.warn('[AppAuthProvider] ⚠️ Table user_roles does not exist. Please run migration 002_user_roles.sql');
              role = 'user';
            } else {
              // Other error - log but continue with default role
              console.warn('[AppAuthProvider] ⚠️ Error fetching user role:', error);
              role = 'user';
            }
          } else {
            role = (data?.role as AppRole) || 'user';
            console.log('[AppAuthProvider] ✅ User role found:', role);
          }
        } catch (err) {
          // Catch any unexpected errors
          console.warn('[AppAuthProvider] ⚠️ Unexpected error fetching user role:', err);
          role = 'user';
        }

        const newAppUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role,
        };

        console.log('[AppAuthProvider] 💾 Setting appUser:', {
          id: newAppUser.id,
          email: newAppUser.email,
          role: newAppUser.role,
          timestamp: new Date().toISOString(),
        });

        setAppUser(newAppUser);
      } catch (error) {
        console.error('[AppAuthProvider] ❌ Error in fetchUserRole:', error);
        setAppUser(null);
      } finally {
        setLoading(false);
        console.log('[AppAuthProvider] ✅ fetchUserRole completed, loading set to false');
      }
    }

    if (!supabaseLoading) {
      fetchUserRole();
    } else {
      console.log('[AppAuthProvider] ⏳ Waiting for supabaseLoading to complete...');
    }
  }, [supabaseUser, supabaseLoading, supabase]);

  const hasRole = (role: AppRole): boolean => {
    return appUser?.role === role;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return appUser ? roles.includes(appUser.role) : false;
  };

  useSessionTracker(appUser?.id);

  const value: AppAuthContextType = {
    user: appUser,
    role: appUser?.role || null,
    isLoading: loading || supabaseLoading,
    isAdmin: appUser?.role === 'admin',
    isForeman: appUser?.role === 'foreman',
    isUser: appUser?.role === 'user',
    isManagerProjects: appUser?.role === 'manager_projects',
    isTechnicalConstructorProjects: appUser?.role === 'technical_constructor_projects',
    isMadurationAnalyst: appUser?.role === 'maduration_analyst',
    isSetUpAnalyst: appUser?.role === 'set_up_analyst',
    hasRole,
    hasAnyRole,
  };

  return (
    <AppAuthContext.Provider value={value}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const context = useContext(AppAuthContext);
  if (context === undefined) {
    throw new Error('useAppAuth must be used within an AppAuthProvider');
  }
  return context;
}

