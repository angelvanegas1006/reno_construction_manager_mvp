import { NextRequest, NextResponse } from 'next/server';
import { setupAirtableWebhook, listAirtableWebhooks, deleteAirtableWebhook } from '@/lib/airtable/webhook-manager';

/**
 * Endpoint para configurar el webhook de Airtable automáticamente
 * 
 * GET /api/airtable/setup-webhook - Lista webhooks existentes
 * POST /api/airtable/setup-webhook - Crea/configura el webhook
 * DELETE /api/airtable/setup-webhook?webhookId=xxx - Elimina un webhook
 */
export async function GET(request: NextRequest) {
  try {
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    
    if (!baseId) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_AIRTABLE_BASE_ID no está configurado' },
        { status: 500 }
      );
    }

    const webhooks = await listAirtableWebhooks(baseId);

    return NextResponse.json({
      success: true,
      webhooks: webhooks.map(wh => ({
        id: wh.id,
        url: wh.notificationUrl,
        enabled: wh.isHookEnabled,
        expirationTime: wh.expirationTime,
      })),
    });
  } catch (error: any) {
    console.error('[Setup Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al listar webhooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID; // Opcional
    
    if (!baseId) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_AIRTABLE_BASE_ID no está configurado' },
        { status: 500 }
      );
    }

    // Obtener la URL del webhook desde el body o construirla
    const body = await request.json().catch(() => ({}));
    const webhookUrl = body.webhookUrl || getWebhookUrl();

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'No se pudo determinar la URL del webhook. Proporciona webhookUrl en el body o configura NEXT_PUBLIC_APP_URL' },
        { status: 400 }
      );
    }

    // Configurar el webhook
    const result = await setupAirtableWebhook(baseId, webhookUrl, tableId);

    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo crear el webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.created 
        ? 'Webhook creado exitosamente' 
        : 'Webhook ya existía, reutilizado',
      webhookId: result.webhookId,
      webhookUrl,
      created: result.created,
    });
  } catch (error: any) {
    console.error('[Setup Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al configurar webhook' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');

    if (!baseId) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_AIRTABLE_BASE_ID no está configurado' },
        { status: 500 }
      );
    }

    if (!webhookId) {
      return NextResponse.json(
        { error: 'webhookId es requerido' },
        { status: 400 }
      );
    }

    const success = await deleteAirtableWebhook(baseId, webhookId);

    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook eliminado exitosamente',
      webhookId,
    });
  } catch (error: any) {
    console.error('[Setup Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar webhook' },
      { status: 500 }
    );
  }
}

/**
 * Construye la URL del webhook basándose en las variables de entorno
 */
function getWebhookUrl(): string | null {
  // Intentar obtener de variable de entorno
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  
  if (appUrl) {
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    return `${baseUrl}/api/webhooks/airtable`;
  }

  // En desarrollo, podría usar localhost con ngrok o similar
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  No se pudo determinar la URL del webhook. En desarrollo, usa ngrok o proporciona NEXT_PUBLIC_APP_URL');
  }

  return null;
}









