import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateBudgetIndexForCategories } from '@/lib/supabase/budget-index-updater';

/**
 * API endpoint para actualizar budget_index de categorías
 * POST /api/update-budget-index
 * Body: { propertyId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Obtener la propiedad para obtener las URLs de presupuesto
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('budget_pdf_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: `Property not found: ${propertyError?.message}` },
        { status: 404 }
      );
    }

    if (!property.budget_pdf_url) {
      return NextResponse.json(
        { error: 'Property does not have budget_pdf_url' },
        { status: 400 }
      );
    }

    // Separar múltiples URLs
    const urls = property.budget_pdf_url
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No valid budget URLs found' },
        { status: 400 }
      );
    }

    // Actualizar budget_index
    const result = await updateBudgetIndexForCategories(propertyId, urls);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[Update Budget Index API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
