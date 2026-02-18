import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  syncBudgetForProperty,
  triggerCategoriesExtractionIfNeeded,
} from '@/lib/airtable/sync-budget-from-transactions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const propertyId = body?.propertyId;

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json(
        { error: 'propertyId es requerido' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data: property, error: propertyError } = await adminSupabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", airtable_property_id, reno_phase')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    if (property.reno_phase !== 'reno-in-progress') {
      return NextResponse.json(
        { error: 'Solo aplicable a propiedades en fase obras en proceso' },
        { status: 400 }
      );
    }

    const uniqueId = property['Unique ID From Engagements'] || property.id;

    const result = await syncBudgetForProperty(propertyId, uniqueId, {
      supabase: adminSupabase,
      airtablePropertyId: property.airtable_property_id ?? undefined,
    });

    if (result.error) {
      const isNotFound = result.error.includes('No Transactions record') || result.error.includes('not found');
      return NextResponse.json(
        {
          success: false,
          error: isNotFound
            ? 'No se encontró presupuesto en Airtable para esta propiedad'
            : result.error,
        },
        { status: 400 }
      );
    }

    if (!result.updated || result.urlCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontró presupuesto en Airtable para esta propiedad',
        },
        { status: 400 }
      );
    }

    if (result.firstBudgetUrl) {
      await triggerCategoriesExtractionIfNeeded(
        adminSupabase,
        propertyId,
        result.firstBudgetUrl,
        uniqueId,
        property.address ?? undefined
      );
    }

    return NextResponse.json({
      success: true,
      urlCount: result.urlCount,
      message: 'Presupuesto sincronizado y extracción de categorías iniciada',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Sync Budget from Airtable] Error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
