import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Buscar inspecciones completadas con pdf_url
    const { data: inspections, error } = await supabase
      .from('property_inspections')
      .select('property_id, inspection_type, pdf_url, completed_at')
      .eq('inspection_status', 'completed')
      .not('pdf_url', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[find-completed-checklists] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!inspections || inspections.length === 0) {
      return NextResponse.json({
        message: 'No se encontraron checklists finalizados con HTML generado',
        checklists: []
      });
    }

    // Verificar qué archivos realmente existen en Storage
    const validChecklists = [];

    for (const inspection of inspections) {
      const type = inspection.inspection_type === 'initial' ? 'initial' : 'final';
      const path = `${inspection.property_id}/${type}`;
      
      // Verificar si el archivo existe en Storage
      const { data: files, error: listError } = await supabase.storage
        .from('checklists')
        .list(path, {
          limit: 10
        });

      const hasHtmlFile = !listError && files && files.some(f => f.name === 'checklist.html');

      if (hasHtmlFile) {
        const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dev.vistral.io'}/checklist-public/${inspection.property_id}/${type}`;
        
        validChecklists.push({
          propertyId: inspection.property_id,
          type: inspection.inspection_type,
          typeLabel: inspection.inspection_type === 'initial' ? 'Inicial' : 'Final',
          completedAt: inspection.completed_at,
          publicUrl,
          storageUrl: inspection.pdf_url
        });
      }
    }

    return NextResponse.json({
      count: validChecklists.length,
      checklists: validChecklists,
      message: validChecklists.length === 0 
        ? 'No se encontraron checklists con archivos HTML válidos en Storage. Necesitas finalizar un checklist para generar el HTML.'
        : `${validChecklists.length} checklist(s) válido(s) encontrado(s)`
    });
  } catch (error: any) {
    console.error('[find-completed-checklists] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

