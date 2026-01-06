import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { processAirtableWebhook } from '@/lib/airtable/webhook-processor';

/**
 * Webhook endpoint para recibir eventos de Airtable
 * 
 * Configurar en Airtable:
 * 1. Ir a Extensions → Webhooks
 * 2. Crear nuevo webhook
 * 3. URL: https://tu-dominio.com/api/webhooks/airtable
 * 4. Eventos: cuando se actualiza un registro
 * 5. Campos a monitorear: "Set Up Status", "Estimated Visit Date", etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (opcional pero recomendado)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    console.log('[Airtable Webhook] Received event:', {
      eventType: body.eventType,
      timestamp: body.timestamp,
      baseId: body.base?.id,
    });

    // Procesar el webhook
    const result = await processAirtableWebhook(body);

    if (result.success) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Webhook processed successfully',
          updates: result.updates 
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Airtable Webhook] Error processing webhook:', error);
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
    message: 'Airtable webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}


