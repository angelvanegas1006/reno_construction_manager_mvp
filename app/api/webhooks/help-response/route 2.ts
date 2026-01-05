import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Webhook endpoint para recibir respuestas de n8n sobre conversaciones de ayuda
 * 
 * Configurar en n8n:
 * 1. Después de procesar el mensaje de ayuda, hacer POST a este endpoint
 * 2. URL: https://tu-dominio.com/api/webhooks/help-response
 * 3. Body debe incluir:
 *    - conversation_id: UUID de la conversación en Supabase
 *    - response_message: Texto de la respuesta
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Help Response Webhook] Received response:', {
      conversationId: body.conversation_id,
      hasResponse: !!body.response_message,
      timestamp: new Date().toISOString(),
    });

    // Validar campos requeridos
    if (!body.conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    if (!body.response_message) {
      return NextResponse.json(
        { error: 'response_message is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Actualizar la conversación con la respuesta
    // Nota: help_conversations aún no está en los tipos de TypeScript, usar cast temporal
    const { data, error } = await (supabase as any)
      .from('help_conversations')
      .update({
        response_message: body.response_message,
        response_received_at: new Date().toISOString(),
        is_read: false, // Marcar como no leída cuando llega la respuesta
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.conversation_id)
      .select()
      .single();

    if (error) {
      console.error('[Help Response Webhook] Error updating conversation:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update conversation',
          details: error.message 
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('[Help Response Webhook] Conversation updated successfully:', {
      conversationId: data.id,
      userId: data.user_id,
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Response saved successfully',
        conversation_id: data.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Help Response Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET para verificación/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Help response webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

