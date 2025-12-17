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
  // Para rutas públicas, usar cliente anónimo directamente
  const supabase = isPublic ? createAnonymousClient() : createClient();

  // Primero intentar obtener desde property_inspections
  const inspectionType = checklistType === 'reno_initial' ? 'initial' : 'final';
  const { data: inspection, error: inspectionError } = await supabase
    .from('property_inspections')
    .select('pdf_url')
    .eq('property_id', propertyId)
    .eq('inspection_type', inspectionType)
    .eq('inspection_status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (inspectionError) {
    console.warn(`[checklist-html-storage] Error fetching HTML URL from property_inspections for ${propertyId} (${inspectionType}):`, inspectionError.message);
  }

  if (inspection?.pdf_url) {
    console.log(`[checklist-html-storage] ✅ HTML URL found in property_inspections: ${inspection.pdf_url}`);
    return inspection.pdf_url;
  }

  // Si no se encuentra, construir el path y obtener la URL pública
  const type = checklistType === 'reno_initial' ? 'initial' : 'final';
  const path = `${propertyId}/${type}/checklist.html`;

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.warn('[checklist-html-storage] No se pudo generar URL pública para:', path);
    return null;
  }

  return publicUrlData.publicUrl;
}

