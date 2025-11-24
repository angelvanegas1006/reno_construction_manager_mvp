/**
 * Sync Property Comments to Airtable
 * 
 * Combina todos los comentarios de una propiedad en un solo texto
 * separado por timestamps y lo sincroniza con Airtable
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { updateAirtableWithRetry, findRecordByPropertyId } from "./client";

const AIRTABLE_TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Properties";
const AIRTABLE_SETUP_NOTES_FIELD_ID = "fldPJAWIuIZsS0zw7"; // SetUp Team Notes field ID

/**
 * Sincroniza todos los comentarios de una propiedad a Airtable
 * Combina todos los comentarios con timestamps en un solo texto
 */
export async function syncPropertyCommentsToAirtable(
  propertyId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // 1. Obtener todos los comentarios de la propiedad
    const { data: comments, error: commentsError } = await supabase
      .from("property_comments")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true }); // Orden cronológico

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return false;
    }

    if (!comments || comments.length === 0) {
      console.log("No comments to sync");
      return true; // No hay comentarios, pero no es un error
    }

    // 2. Obtener la propiedad para encontrar el Airtable ID
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("property_unique_id")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      console.error("Error fetching property:", propertyError);
      return false;
    }

    const airtablePropertyId = property.property_unique_id;

    if (!airtablePropertyId) {
      console.error("Property does not have Airtable ID");
      return false;
    }

    // 3. Encontrar el record ID en Airtable
    const recordId = await findRecordByPropertyId(
      AIRTABLE_TABLE_NAME,
      airtablePropertyId
    );

    if (!recordId) {
      console.error("Record not found in Airtable");
      return false;
    }

    // 4. Combinar todos los comentarios con timestamps
    const combinedComments = comments
      .map((comment) => {
        const date = new Date(comment.created_at);
        const timestamp = date.toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const author = comment.created_by ? `[${comment.created_by}]` : "";
        return `[${timestamp}] ${author}\n${comment.comment_text}`;
      })
      .join("\n\n---\n\n");

    // 5. Actualizar Airtable con el texto combinado
    await updateAirtableWithRetry(AIRTABLE_TABLE_NAME, recordId, {
      [AIRTABLE_SETUP_NOTES_FIELD_ID]: combinedComments,
    });

    // 6. Marcar comentarios como sincronizados
    const commentIds = comments.map((c) => c.id);
    await supabase
      .from("property_comments")
      .update({
        synced_to_airtable: true,
        airtable_sync_date: new Date().toISOString(),
      })
      .in("id", commentIds);

    console.log(`✅ Synced ${comments.length} comments to Airtable`);
    return true;
  } catch (error) {
    console.error("Error syncing comments to Airtable:", error);
    return false;
  }
}

/**
 * Sincroniza comentarios de todas las propiedades pendientes
 * Útil para sincronización masiva o cron job
 */
export async function syncAllPendingCommentsToAirtable(): Promise<{
  synced: number;
  errors: number;
}> {
  try {
    const supabase = createAdminClient();

    // Obtener todas las propiedades con comentarios no sincronizados
    const { data: comments, error } = await supabase
      .from("property_comments")
      .select("property_id")
      .eq("synced_to_airtable", false);

    if (error) {
      console.error("Error fetching properties with pending comments:", error);
      return { synced: 0, errors: 0 };
    }

    if (!comments || comments.length === 0) {
      return { synced: 0, errors: 0 };
    }

    // Obtener property_id únicos usando Set
    const uniquePropertyIds = Array.from(new Set(comments.map(c => c.property_id)));

    let synced = 0;
    let errors = 0;

    for (const propertyId of uniquePropertyIds) {
      const success = await syncPropertyCommentsToAirtable(propertyId);
      if (success) {
        synced++;
      } else {
        errors++;
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error("Error in syncAllPendingCommentsToAirtable:", error);
    return { synced: 0, errors: 0 };
  }
}

