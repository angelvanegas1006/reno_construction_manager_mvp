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
    // Primero intentar buscar por id, luego por "Unique ID From Engagements"
    let { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase, airtable_property_id, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    // Si no se encuentra por id, buscar por "Unique ID From Engagements"
    if (fetchError || !property) {
      const { data: propertyByUniqueId, error: fetchErrorByUniqueId } = await supabase
        .from('properties')
        .select('id, address, "Set Up Status", reno_phase, airtable_property_id, "Unique ID From Engagements"')
        .eq('Unique ID From Engagements', propertyId)
        .single();
      
      if (fetchErrorByUniqueId || !propertyByUniqueId) {
        return NextResponse.json(
          { error: `Property ${propertyId} not found (searched by id and Unique ID From Engagements)` },
          { status: 404 }
        );
      }
      
      property = propertyByUniqueId;
      fetchError = null;
    }

    // Usar el id real de Supabase para todas las operaciones
    const actualPropertyId = property.id;

    // Primero, eliminar inspecciones relacionadas (initial y final)
    const { data: inspections, error: inspectionsError } = await supabase
      .from('property_inspections')
      .select('id')
      .eq('property_id', actualPropertyId);

    // Solo procesar si no hay error y hay datos
    if (inspectionsError) {
      console.error('Error fetching inspections:', inspectionsError);
      // Continuar de todas formas, puede que no haya inspecciones
    } else if (inspections && inspections.length > 0) {
      console.log(`Found ${inspections.length} inspections for property ${actualPropertyId}`);
      
      const inspectionIds = inspections.map(i => i.id);
      
      // Primero obtener los zone_ids relacionados con estas inspecciones
      const { data: zones, error: zonesFetchError } = await supabase
        .from('inspection_zones')
        .select('id')
        .in('inspection_id', inspectionIds);
      
      if (!zonesFetchError && zones && zones.length > 0) {
        const zoneIds = zones.map(z => z.id);
        
        // Eliminar elementos primero (tienen foreign key a zones)
        const { error: deleteElementsError } = await supabase
          .from('inspection_elements')
          .delete()
          .in('zone_id', zoneIds);
        
        if (deleteElementsError) {
          console.error('Error deleting inspection elements:', deleteElementsError);
        } else {
          console.log(`Deleted inspection elements for ${zoneIds.length} zones`);
        }
      }
      
      // Eliminar zonas
      const { error: deleteZonesError } = await supabase
        .from('inspection_zones')
        .delete()
        .in('inspection_id', inspectionIds);
      
      if (deleteZonesError) {
        console.error('Error deleting inspection zones:', deleteZonesError);
      } else {
        console.log(`Deleted inspection zones for ${inspectionIds.length} inspections`);
      }
      
      // Eliminar todas las inspecciones relacionadas
      const { error: deleteInspectionsError } = await supabase
        .from('property_inspections')
        .delete()
        .eq('property_id', actualPropertyId);

      if (deleteInspectionsError) {
        console.error('Error deleting inspections:', deleteInspectionsError);
        // Continuar de todas formas
      } else {
        console.log(`Deleted ${inspections.length} inspections`);
      }
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
      .eq('id', actualPropertyId)
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
            console.log(`✅ Updated Airtable for property ${actualPropertyId}`);
          }
        }
      }
    } catch (airtableError) {
      console.error('Error updating Airtable (non-critical):', airtableError);
      // No fallar si Airtable falla, solo loguear
    }

    return NextResponse.json({
      success: true,
      message: `Property ${propertyId} (${actualPropertyId}) has been reset to initial phase (upcoming-settlements)`,
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

