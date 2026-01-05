import { createClient } from '@/lib/supabase/client';
import { generateChecklistHTML } from '@/lib/html/checklist-html-generator';
import { ChecklistData } from '@/lib/checklist-storage';
import { translations } from '@/lib/i18n/translations';

const STORAGE_BUCKET = 'checklists';

/**
 * Sube el HTML estático del checklist a Supabase Storage
 * Estructura: checklists/{propertyId}/{type}/checklist.html
 */
export async function uploadChecklistPDFToStorage(
  checklist: ChecklistData,
  propertyInfo: {
    address: string;
    propertyId: string;
    renovatorName?: string;
    driveFolderUrl?: string;
  },
  language: 'es' | 'en' = 'es'
): Promise<string> {
  const supabase = createClient();

  // Generar el HTML estático
  const htmlContent = await generateChecklistHTML(
    checklist,
    propertyInfo,
    translations[language]
  );

  // Convertir HTML a Blob y luego a File
  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
  const htmlFile = new File([htmlBlob], 'checklist.html', { type: 'text/html' });

  // Construir path: checklists/{propertyId}/{type}/checklist.html
  const checklistType = checklist.checklistType === 'reno_initial' ? 'initial' : 
                        checklist.checklistType === 'reno_final' ? 'final' : 
                        checklist.checklistType;
  const path = `${propertyInfo.propertyId}/${checklistType}/checklist.html`;

  // Subir archivo
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, htmlFile, {
      contentType: 'text/html',
      upsert: true, // Sobrescribir si ya existe
    });

  if (error) {
    console.error('[checklist-html-storage] ❌ Error uploading HTML:', error);
    
    // Si el bucket no existe, proporcionar instrucciones claras
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      throw new Error(`Bucket '${STORAGE_BUCKET}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${STORAGE_BUCKET}"`);
    }
    
    // Si es un error de RLS, proporcionar instrucciones claras
    if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('policy')) {
      throw new Error(`Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver docs/SUPABASE_STORAGE_POLICIES.md`);
    }
    
    throw new Error(`Error al subir HTML: ${error.message}`);
  }

  if (!data || !data.path) {
    throw new Error('No se recibió el path del archivo subido');
  }

  // Obtener URL pública usando el path exacto que se subió
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('No se pudo generar la URL pública del HTML');
  }

  // Validar que la URL sea completa y válida
  const publicUrl = publicUrlData.publicUrl;
  if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
    throw new Error(`URL pública inválida: ${publicUrl}`);
  }

  // Verificar que la URL contenga el dominio completo de Supabase
  if (!publicUrl.includes('.supabase.co')) {
    console.warn('[checklist-html-storage] ⚠️ URL pública no contiene dominio Supabase:', publicUrl);
  }

  console.log('[checklist-html-storage] ✅ HTML uploaded successfully:', {
    path: data.path,
    publicUrl: publicUrl,
    urlLength: publicUrl.length,
  });
  
  return publicUrl;
}

/**
 * Crea un cliente Supabase anónimo para acceso público (sin autenticación)
 */
function createAnonymousClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Obtiene la URL pública del HTML del checklist si existe
 * Versión pública que no requiere autenticación
 */
export async function getChecklistPDFUrl(
  propertyId: string,
  checklistType: 'reno_initial' | 'reno_final',
  isPublic: boolean = false
): Promise<string | null> {
  // Para rutas públicas, construir directamente la URL desde Storage sin consultar BD
  if (isPublic) {
    const type = checklistType === 'reno_initial' ? 'initial' : 'final';
    const path = `${propertyId}/${type}/checklist.html`;
    
    // Crear cliente anónimo solo para generar URL pública
    const anonymousClient = createAnonymousClient();
    
    // Generar URL pública directamente (no verificamos existencia porque puede fallar por permisos)
    // Si el archivo no existe, el proxy mostrará un error 400 que ya está manejado
    const { data: publicUrlData } = anonymousClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.warn('[checklist-html-storage] No se pudo generar URL pública para:', path);
      return null;
    }

    console.log(`[checklist-html-storage] ✅ Public URL generated from Storage: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  }

  // Para rutas autenticadas, intentar obtener desde property_inspections primero
  const supabase = createClient();
  const inspectionType = checklistType === 'reno_initial' ? 'initial' : 'final';
  
  // IMPORTANTE: Incluir inspection_type en el select para validar que coincida
  const { data: inspection, error: inspectionError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, pdf_url')
    .eq('property_id', propertyId)
    .eq('inspection_type', inspectionType)
    .eq('inspection_status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar errores si no existe

  // Si hay un error relacionado con la columna inspection_type, intentar sin ese filtro
  if (inspectionError && (inspectionError.code === '42883' || inspectionError.message?.includes('column') || inspectionError.message?.includes('does not exist'))) {
    console.warn(`[checklist-html-storage] Campo inspection_type no existe, buscando sin filtro:`, inspectionError.message);
    
    // Buscar todas las inspecciones completadas y filtrar manualmente
    const { data: allInspections, error: allError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, pdf_url')
      .eq('property_id', propertyId)
      .eq('inspection_status', 'completed')
      .order('completed_at', { ascending: false });
    
    if (allError) {
      console.warn(`[checklist-html-storage] Error buscando inspecciones:`, allError.message);
    } else if (allInspections) {
      // Filtrar manualmente por inspection_type
      const matchingInspection = allInspections.find((insp: any) => 
        insp.inspection_type === inspectionType
      );
      
      if (matchingInspection?.pdf_url) {
        console.log(`[checklist-html-storage] ✅ HTML URL found in property_inspections (sin filtro de BD): ${matchingInspection.pdf_url}`);
        return matchingInspection.pdf_url;
      }
    }
  } else if (inspectionError && inspectionError.code !== 'PGRST116') {
    // PGRST116 es "no rows returned", que es válido si no existe la inspección
    console.warn(`[checklist-html-storage] Error fetching HTML URL from property_inspections for ${propertyId} (${inspectionType}):`, inspectionError.message);
  }

  // IMPORTANTE: Validar que el inspection_type coincida antes de usar el pdf_url
  if (inspection) {
    if (inspection.inspection_type && inspection.inspection_type !== inspectionType) {
      console.warn(`[checklist-html-storage] ⚠️ Inspección con tipo incorrecto (esperado: ${inspectionType}, obtenido: ${inspection.inspection_type}), ignorando...`);
      // No usar esta inspección, continuar con el fallback
    } else if (inspection.pdf_url) {
      console.log(`[checklist-html-storage] ✅ HTML URL found in property_inspections: ${inspection.pdf_url}`);
      return inspection.pdf_url;
    }
  }

  // Si no se encuentra, construir el path y obtener la URL pública
  const type = checklistType === 'reno_initial' ? 'initial' : 'final';
  const path = `${propertyId}/${type}/checklist.html`;

  console.log(`[checklist-html-storage] 🔍 Construyendo URL desde storage para:`, {
    propertyId,
    checklistType,
    type,
    path,
  });

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.warn('[checklist-html-storage] ⚠️ No se pudo generar URL pública para:', path);
    return null;
  }

  console.log(`[checklist-html-storage] ✅ URL pública generada desde storage: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

