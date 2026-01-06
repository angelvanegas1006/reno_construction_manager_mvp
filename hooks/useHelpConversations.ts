"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface HelpConversation {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  original_message: string;
  error_type: 'property' | 'general' | null;
  property_address: string | null;
  property_airtable_id: string | null;
  response_message: string | null;
  response_received_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseHelpConversationsReturn {
  conversations: HelpConversation[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export function useHelpConversations(): UseHelpConversationsReturn {
  const [conversations, setConversations] = useState<HelpConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchConversations = useCallback(async () => {
    try {
      console.log('[useHelpConversations] 🔄 Iniciando fetchConversations...');
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[useHelpConversations] ❌ Error obteniendo usuario:', userError);
        setConversations([]);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.log('[useHelpConversations] ⚠️ No hay usuario autenticado');
        setConversations([]);
        setLoading(false);
        return;
      }

      console.log('[useHelpConversations] 👤 Usuario encontrado:', { userId: user.id, email: user.email });

      // Nota: help_conversations aún no está en los tipos de TypeScript, usar cast temporal
      const { data, error: fetchError } = await (supabase as any)
        .from('help_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useHelpConversations] ❌ Error en query:', fetchError);
        // Si la tabla no existe, simplemente retornar array vacío sin error
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist') || fetchError.message?.includes('relation') || fetchError.message?.includes('table')) {
          console.log('[useHelpConversations] ⚠️ Tabla help_conversations no existe aún, retornando array vacío');
          setConversations([]);
          setLoading(false);
          return;
        }
        throw fetchError;
      }

      console.log('[useHelpConversations] ✅ Conversaciones obtenidas:', { count: data?.length || 0 });
      setConversations((data as HelpConversation[]) || []);
    } catch (err: any) {
      console.error('[useHelpConversations] ❌ Error en catch:', err);
      // No mostrar error si la tabla no existe, solo loguear
      if (err.code === '42P01' || err.message?.includes('does not exist') || err.message?.includes('relation') || err.message?.includes('table')) {
        console.log('[useHelpConversations] ⚠️ Tabla no existe, usando array vacío');
        setConversations([]);
        setError(null); // No mostrar error al usuario
      } else {
        setError(err.message || 'Error al cargar las conversaciones');
        setConversations([]);
      }
    } finally {
      console.log('[useHelpConversations] ✅ Finalizando fetchConversations, setLoading(false)');
      setLoading(false);
    }
  }, [supabase]);

  const markAsRead = async (conversationId: string) => {
    try {
      // Nota: help_conversations aún no está en los tipos de TypeScript, usar cast temporal
      const { error: updateError } = await (supabase as any)
        .from('help_conversations')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        } as any)
        .eq('id', conversationId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, is_read: true, read_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err: any) {
      console.error('Error marking conversation as read:', err);
    }
  };

  useEffect(() => {
    console.log('[useHelpConversations] 🎯 useEffect ejecutado');
    fetchConversations();

    // Set up real-time subscription for new responses
    // Nota: help_conversations aún no está en los tipos de TypeScript, usar cast temporal
    // Solo suscribirse si no hay error (tabla existe)
    let channel: any = null;
    
    try {
      console.log('[useHelpConversations] 📡 Configurando suscripción en tiempo real...');
      channel = (supabase as any)
        .channel('help_conversations_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'help_conversations',
          },
          (payload: any) => {
            console.log('[useHelpConversations] 🔔 Cambio detectado en tiempo real:', payload);
            // Refresh conversations when a response is received
            fetchConversations();
          }
        )
        .subscribe();
      console.log('[useHelpConversations] ✅ Suscripción configurada');
    } catch (err) {
      // Si falla la suscripción (tabla no existe), simplemente no suscribirse
      console.log('[useHelpConversations] ⚠️ No se pudo suscribir a cambios (tabla puede no existir):', err);
    }

    return () => {
      console.log('[useHelpConversations] 🧹 Limpiando suscripción...');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = conversations.filter((conv) => !conv.is_read && conv.response_message).length;

  return {
    conversations,
    unreadCount,
    loading,
    error,
    refresh: fetchConversations,
    markAsRead,
  };
}

