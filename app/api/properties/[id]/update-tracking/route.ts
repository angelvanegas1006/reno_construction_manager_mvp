import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateNextUpdateDate } from "@/lib/reno/update-calculator";

/**
 * PUT /api/properties/[id]/update-tracking
 * 
 * Actualiza el campo needs_foreman_notification de una propiedad
 * Solo permite actualizar si:
 * - El usuario tiene rol construction_manager o admin
 * - La propiedad está en fase reno-in-progress
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const body = await request.json();
    const { needsTracking } = body;

    if (typeof needsTracking !== "boolean") {
      return NextResponse.json(
        { error: "needsTracking debe ser un booleano" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar rol del usuario
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "No se pudo verificar el rol del usuario" },
        { status: 403 }
      );
    }

    const role = userRole.role;
    if (role !== "construction_manager" && role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    // Verificar que la propiedad existe y está en fase reno-in-progress
    const supabaseAdmin = createAdminClient();
    const { data: property, error: fetchError } = await supabaseAdmin
      .from("properties")
      .select("id, reno_phase")
      .eq("id", propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json(
        { error: "Propiedad no encontrada" },
        { status: 404 }
      );
    }

    if (property.reno_phase !== "reno-in-progress") {
      return NextResponse.json(
        {
          error:
            "Solo se puede marcar seguimiento para propiedades en fase reno-in-progress",
        },
        { status: 400 }
      );
    }

    // Actualizar el campo needs_foreman_notification
    const { error: updateError } = await supabaseAdmin
      .from("properties")
      .update({
        needs_foreman_notification: needsTracking,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", propertyId);

    if (updateError) {
      console.error("Error al actualizar seguimiento:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar seguimiento" },
        { status: 500 }
      );
    }

    // Si se marca como que necesita seguimiento, crear visita automática en calendario
    if (needsTracking) {
      // Obtener next_update, start_date y renovation_type para calcular fecha correctamente
      const { data: propertyData } = await supabaseAdmin
        .from("properties")
        .select("next_update, start_date, renovation_type")
        .eq("id", propertyId)
        .single();

      // Calcular fecha correctamente según tipo de reno
      let visitDate = propertyData?.next_update;
      if (!visitDate) {
        // Si no hay next_update, calcular según tipo de reno
        const renoStartDate = propertyData?.start_date;
        const renoType = propertyData?.renovation_type;
        visitDate = calculateNextUpdateDate(null, renoType, renoStartDate);
      }

      if (visitDate) {
        // Verificar si ya existe una visita de tipo obra-seguimiento para esta propiedad
        const { data: existingVisit } = await supabaseAdmin
          .from("property_visits")
          .select("id")
          .eq("property_id", propertyId)
          .eq("visit_type", "obra-seguimiento")
          .single();

        if (!existingVisit) {
          // Crear visita automática
          const { error: visitError } = await supabaseAdmin
            .from("property_visits")
            .insert({
              property_id: propertyId,
              visit_date: visitDate,
              visit_type: "obra-seguimiento",
              notes: "Seguimiento de obra solicitado por Gerente de Construcción",
              created_by: user.id,
            });

          if (visitError) {
            console.warn("Error al crear visita automática:", visitError);
            // No retornar error, solo registrar warning
          }
        }
      }
    } else {
      // Si se desmarca, eliminar visitas automáticas de tipo obra-seguimiento
      // que fueron creadas por el sistema
      const { error: deleteError } = await supabaseAdmin
        .from("property_visits")
        .delete()
        .eq("property_id", propertyId)
        .eq("visit_type", "obra-seguimiento")
        .or(
          "notes.is.null,notes.eq.Seguimiento de obra solicitado por Gerente de Construcción"
        );

      if (deleteError) {
        console.warn("Error al eliminar visita automática:", deleteError);
        // No retornar error, solo registrar warning
      }
    }

    return NextResponse.json({
      success: true,
      needs_foreman_notification: needsTracking,
    });
  } catch (error) {
    console.error("Error en update-tracking:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
