import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateChecklistHTML } from '@/lib/html/checklist-html-generator';
import { translations } from '@/lib/i18n/translations';
import { convertSupabaseToChecklist } from '@/lib/supabase/checklist-converter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, type } = body;

    if (!propertyId || !type) {
      return NextResponse.json(
        { error: 'propertyId and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'initial' && type !== 'final') {
      return NextResponse.json(
        { error: 'type must be "initial" or "final"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const checklistType = type === 'initial' ? 'reno_initial' : 'reno_final';
    const inspectionType = type;

    // 1. Obtener la propiedad
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: `Property not found: ${propError?.message}` },
        { status: 404 }
      );
    }

    // 2. Obtener la inspección
    // Intentar primero con inspection_type, si falla buscar sin él
    let inspection: any = null;
    let inspError: any = null;

    try {
      let { data: inspectionData, error: inspectionQueryError } = await supabase
        .from('property_inspections')
        .select('id, inspection_type, inspection_status')
        .eq('property_id', propertyId)
        .eq('inspection_type', inspectionType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Si el error es que la columna no existe, buscar sin inspection_type
      if (inspectionQueryError && (inspectionQueryError.code === '42883' || inspectionQueryError.message?.includes('column') || inspectionQueryError.message?.includes('does not exist'))) {
        console.warn('[regenerate-checklist-html] inspection_type column does not exist, querying without it');
        const { data: allInspections, error: allError } = await supabase
          .from('property_inspections')
          .select('id, inspection_status')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (allError && allError.code !== 'PGRST116') {
          inspError = allError;
        } else {
          inspection = allInspections;
        }
      } else if (inspectionQueryError && inspectionQueryError.code !== 'PGRST116') {
        inspError = inspectionQueryError;
      } else {
        inspection = inspectionData;
      }
    } catch (err: any) {
      inspError = err;
    }

    if (inspError) {
      return NextResponse.json(
        { error: `Error fetching inspection: ${inspError.message}` },
        { status: 500 }
      );
    }

    if (!inspection) {
      return NextResponse.json(
        { error: `No ${inspectionType} inspection found for this property` },
        { status: 404 }
      );
    }

    // 3. Obtener zonas y elementos
    const { data: zones, error: zonesError } = await supabase
      .from('inspection_zones')
      .select('*')
      .eq('inspection_id', inspection.id)
      .order('created_at', { ascending: true });

    if (zonesError) {
      return NextResponse.json(
        { error: `Error fetching zones: ${zonesError.message}` },
        { status: 500 }
      );
    }

    // Obtener elementos a través de las zonas
    const zoneIds = zones?.map(z => z.id) || [];
    const { data: elements, error: elementsError } = await supabase
      .from('inspection_elements')
      .select('*')
      .in('zone_id', zoneIds.length > 0 ? zoneIds : ['00000000-0000-0000-0000-000000000000']); // Usar un UUID inválido si no hay zonas para evitar error

    if (elementsError) {
      return NextResponse.json(
        { error: `Error fetching elements: ${elementsError.message}` },
        { status: 500 }
      );
    }

    // 4. Convertir a formato ChecklistData
    const checklistData = convertSupabaseToChecklist(
      zones || [],
      elements || [],
      property.bedrooms || null,
      property.bathrooms || null
    );

    const fullChecklist = {
      propertyId,
      checklistType,
      sections: checklistData.sections || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 5. Generar HTML
    const htmlContent = await generateChecklistHTML(
      fullChecklist,
      {
        address: property.address || propertyId,
        propertyId,
        renovatorName: property['Renovator name'] || undefined,
      },
      translations.es
    );

    // 6. Subir a Storage usando cliente admin para evitar RLS
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    const storagePath = `${propertyId}/${type}/checklist.html`;
    const adminSupabase = createAdminClient();

    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('checklists')
      .upload(storagePath, htmlBuffer, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error uploading HTML: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 7. Obtener URL pública
    const { data: publicUrlData } = adminSupabase.storage
      .from('checklists')
      .getPublicUrl(uploadData.path);

    const htmlUrl = publicUrlData.publicUrl;

    // 8. Actualizar inspección con URL
    const { error: updateError } = await supabase
      .from('property_inspections')
      .update({ pdf_url: htmlUrl })
      .eq('id', inspection.id);

    if (updateError) {
      console.warn('[regenerate-checklist-html] Error updating inspection:', updateError);
    }

    // 9. Generar link público
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dev.vistral.io'}/checklist-public/${propertyId}/${type}`;

    return NextResponse.json({
      success: true,
      propertyId,
      type,
      publicUrl,
      storageUrl: htmlUrl,
      message: 'HTML generado exitosamente'
    });
  } catch (error: any) {
    console.error('[regenerate-checklist-html] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

