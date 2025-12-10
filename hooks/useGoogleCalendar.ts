/**
 * Hook for Google Calendar integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppAuth } from '@/lib/auth/app-auth-context';
import { toast } from 'sonner';

interface GoogleCalendarStatus {
  isConnected: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  isConfigured: boolean;
}

export function useGoogleCalendar() {
  const { user, role } = useAppAuth();
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    isConnected: false,
    isLoading: true,
    isSyncing: false,
    lastSyncAt: null,
    error: null,
    isConfigured: true,
  });

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!user) {
      setStatus((prev) => ({ ...prev, isLoading: false, isConnected: false }));
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/google-calendar/status');
      if (!response.ok) {
        throw new Error('Failed to check connection status');
      }

      const data = await response.json();
      setStatus((prev) => ({
        ...prev,
        isConnected: data.connected || false,
        lastSyncAt: data.lastSyncAt || null,
        isConfigured: data.configured !== false, // Default to true if not specified
        isLoading: false,
      }));
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        isConnected: false,
        error: error.message,
        isConfigured: false, // Assume not configured on error
      }));
    }
  }, [user]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Connect Google Calendar
  const connect = useCallback(() => {
    if (!user) {
      toast.error('Debes iniciar sesión para conectar Google Calendar');
      return;
    }

    window.location.href = '/api/google-calendar/connect';
  }, [user]);

  // Disconnect Google Calendar
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      setStatus((prev) => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
      }));

      toast.success('Google Calendar desconectado');
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      toast.error('Error al desconectar: ' + error.message);
    }
  }, [user]);

  // Sync events
  const sync = useCallback(async () => {
    if (!user || !status.isConnected) return;

    try {
      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync');
      }

      const result = await response.json();
      
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      }));

      toast.success(
        `Sincronización completada: ${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados`
      );
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error.message,
      }));
      toast.error('Error al sincronizar: ' + error.message);
    }
  }, [user, status.isConnected]);

  return {
    ...status,
    connect,
    disconnect,
    sync,
    refresh: checkConnection,
    canConnect: !!user, // Show button if user is authenticated (button will be disabled if not configured)
  };
}

