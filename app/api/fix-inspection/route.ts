import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    console.log(`🔍 Buscando inspecciones para la propiedad: ${propertyId}`);

    // Buscar todas las inspecciones de la propiedad
    let { data: inspections, error } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, inspection_status, completed_at, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    // Si hay error con inspection_type, intentar sin ese campo
    if (error && (error.code === '42883' || error.message?.includes('column'))) {
      console.warn('Campo inspection_type no existe, buscando sin filtro');
      const { data: allInspections, error: allError } = await supabase
        .from('property_inspections')
        .select('id, inspection_status, completed_at, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      
      if (allError) {
        console.error('❌ Error al buscar inspecciones:', allError);
        return NextResponse.json(
          { error: 'Error fetching inspections', details: allError.message },
          { status: 500 }
        );
      }
      inspections = allInspections;
    } else if (error) {
      console.error('❌ Error al buscar inspecciones:', error);
      return NextResponse.json(
        { error: 'Error fetching inspections', details: error.message },
        { status: 500 }
      );
    }

    if (!inspections || inspections.length === 0) {
      return NextResponse.json(
        { error: 'No inspections found for this property' },
        { status: 404 }
      );
    }

    // Buscar la inspección final (la más reciente o la que tenga inspection_type = 'final')
    const finalInspection = inspections.find(insp => 
      (insp as any).inspection_type === 'final'
    ) || inspections[0]; // Si no hay tipo, usar la más reciente

    if (!finalInspection) {
      return NextResponse.json(
        { error: 'No final inspection found' },
        { status: 404 }
      );
    }

    // Verificar si ya está completada
    const isCompleted = finalInspection.inspection_status === 'completed' && finalInspection.completed_at !== null;

    if (isCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Inspection is already completed',
        inspection: {
          id: finalInspection.id,
          status: finalInspection.inspection_status,
          completed_at: finalInspection.completed_at,
        },
      });
    }

    console.log('🔧 Corrigiendo inspección...');

    // Actualizar la inspección para marcarla como completada
    const { error: updateError } = await supabase
      .from('property_inspections')
      .update({
        inspection_status: 'completed',
        completed_at: finalInspection.completed_at || new Date().toISOString(),
      })
      .eq('id', finalInspection.id);

    if (updateError) {
      console.error('❌ Error al actualizar la inspección:', updateError);
      return NextResponse.json(
        { error: 'Error updating inspection', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Inspección corregida exitosamente');

    // Verificar la actualización
    const { data: updatedInspection, error: verifyError } = await supabase
      .from('property_inspections')
      .select('id, inspection_status, completed_at')
      .eq('id', finalInspection.id)
      .single();

    if (verifyError) {
      console.warn('⚠️ No se pudo verificar la actualización:', verifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Inspection fixed successfully',
      inspection: {
        id: updatedInspection?.id || finalInspection.id,
        status: updatedInspection?.inspection_status || 'completed',
        completed_at: updatedInspection?.completed_at || finalInspection.completed_at || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
