/**
 * API Route para disparar el escenario n8n que extrae categorías del PDF de partidas de obra.
 * Solo usuarios admin o construction_manager.
 * Obtiene propiedades en reno-in-progress con budget_pdf_url y sin categorías dinámicas,
 * y llama al webhook de n8n para cada una.
 *
 * POST /api/n8n/trigger-categories-extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '@/lib/n8n/webhook-caller';

const ALLOWED_ROLES = ['admin', 'construction_manager'];

async function verifyUserCanTrigger(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return roleData?.role != null && ALLOWED_ROLES.includes(roleData.role);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyUserCanTrigger())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Propiedades en reno-in-progress con budget_pdf_url
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, budget_pdf_url, "Unique ID From Engagements", name, "Client Name", "Client email", renovation_type, area_cluster')
      .eq('reno_phase', 'reno-in-progress')
      .not('budget_pdf_url', 'is', null)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('[N8N Trigger] Error fetching properties:', propertiesError);
      return NextResponse.json(
        { error: propertiesError.message, processed: 0, skipped: 0, failed: 0 },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: 0,
        failed: 0,
        message: 'No hay propiedades en reno-in-progress con budget_pdf_url',
      });
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const details: string[] = [];

    for (const property of properties) {
      const { data: categories } = await supabase
        .from('property_dynamic_categories')
        .select('id')
        .eq('property_id', property.id)
        .limit(1);

      if (categories && categories.length > 0) {
        skipped++;
        details.push(`${property.id}: ya tiene categorías`);
        continue;
      }

      const payload = prepareWebhookPayload(property as any);
      if (!payload) {
        skipped++;
        details.push(`${property.id}: no se pudo preparar payload`);
        continue;
      }

      try {
        const success = await callN8nCategoriesWebhook(payload);
        if (success) {
          processed++;
          details.push(`${property.id}: OK`);
        } else {
          failed++;
          details.push(`${property.id}: webhook falló`);
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        failed++;
        details.push(`${property.id}: ${e?.message || 'error'}`);
      }
    }

    return NextResponse.json({
      success: failed === 0,
      processed,
      skipped,
      failed,
      total: properties.length,
      details: details.slice(0, 50),
    });
  } catch (error: any) {
    console.error('[N8N Trigger] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error', processed: 0, skipped: 0, failed: 0 },
      { status: 500 }
    );
  }
}
