import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findRecordByPropertyId, updateAirtableWithRetry } from '@/lib/airtable/client';

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

    // Verificar que la propiedad existe
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json(
        { error: `Property ${propertyId} not found` },
        { status: 404 }
      );
    }

    // Primero, eliminar inspecciones relacionadas (initial y final)
    const { data: inspections, error: inspectionsError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type')
      .eq('property_id', propertyId);

    if (!inspectionsError && inspections && inspections.length > 0) {
      console.log(`Found ${inspections.length} inspections for property ${propertyId}`);
      
      // Eliminar todas las inspecciones relacionadas
      const { error: deleteInspectionsError } = await supabase
        .from('property_inspections')
        .delete()
        .eq('property_id', propertyId);

      if (deleteInspectionsError) {
        console.error('Error deleting inspections:', deleteInspectionsError);
        // Continuar de todas formas
      } else {
        console.log(`Deleted ${inspections.length} inspections`);
      }
    }

    // También eliminar zonas y elementos relacionados con las inspecciones
    if (inspections && inspections.length > 0) {
      const inspectionIds = inspections.map(i => i.id);
      
      // Eliminar elementos primero (tienen foreign key a zones)
      await supabase
        .from('checklist_elements')
        .delete()
        .in('inspection_id', inspectionIds);
      
      // Eliminar zonas
      await supabase
        .from('checklist_zones')
        .delete()
        .in('inspection_id', inspectionIds);
    }

    // Resetear a fase inicial
    // Usar los nombres exactos de los campos según el esquema de Supabase
    const updates: Record<string, any> = {
      'Set Up Status': 'Pending to visit',
      reno_phase: 'upcoming-settlements',
      'Renovator name': null,
      'Estimated Visit Date': null,
      start_date: null, // Campo correcto según el esquema
      estimated_end_date: null, // Campo correcto según el esquema
      next_reno_steps: null, // Limpiar pasos siguientes
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Error updating property: ${updateError.message}` },
        { status: 500 }
      );
    }

    // También actualizar Airtable para evitar que la sincronización sobrescriba el estado
    let airtableUpdated = false;
    try {
      const airtablePropertyId = updatedProperty.airtable_property_id || updatedProperty['Unique ID From Engagements'];
      if (airtablePropertyId) {
        const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
        const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
        
        if (recordId) {
          const airtableSuccess = await updateAirtableWithRetry(tableName, recordId, {
            'Set Up Status': 'Pending to visit',
            'Renovator Name': null,
            'Estimated Visit Date': null,
            'Reno Start Date': null,
            'Estimated Reno End Date': null,
          });
          
          if (airtableSuccess) {
            airtableUpdated = true;
            console.log(`✅ Updated Airtable for property ${propertyId}`);
          }
        }
      }
    } catch (airtableError) {
      console.error('Error updating Airtable (non-critical):', airtableError);
      // No fallar si Airtable falla, solo loguear
    }

    return NextResponse.json({
      success: true,
      message: `Property ${propertyId} has been reset to initial phase (upcoming-settlements)`,
      property: {
        id: updatedProperty.id,
        address: updatedProperty.address,
        'Set Up Status': updatedProperty['Set Up Status'],
        reno_phase: updatedProperty.reno_phase,
      },
      airtableUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

