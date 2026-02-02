import { createClient } from '@/lib/supabase/client';
import type { FileUpload } from '@/lib/checklist-storage';

const STORAGE_BUCKET = 'inspection-images';

/**
 * Sube una imagen o video a Supabase Storage
 * @param file El archivo a subir
 * @param propertyId ID de la propiedad
 * @param inspectionId ID de la inspección
 * @param zoneId ID de la zona (opcional)
 * @returns URL pública del archivo subido
 */
export async function uploadFileToStorage(
  file: File,
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<string> {
  const supabase = createClient();

  // Generar nombre único para el archivo
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = `${timestamp}_${randomString}.${fileExtension}`;

  // Construir path: propertyId/inspectionId/[zoneId/]fileName
  const path = zoneId
    ? `${propertyId}/${inspectionId}/${zoneId}/${fileName}`
    : `${propertyId}/${inspectionId}/${fileName}`;

  // Subir archivo
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('[storage-upload] ❌ Error uploading file:', error);
    // Si el bucket no existe, proporcionar instrucciones claras
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      console.error(`[storage-upload] ⚠️ Bucket '${STORAGE_BUCKET}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${STORAGE_BUCKET}"`);
      throw new Error(`Bucket '${STORAGE_BUCKET}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${STORAGE_BUCKET}"`);
    }
    // Si es un error de RLS, proporcionar instrucciones claras
    if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('policy')) {
      console.error(`[storage-upload] ⚠️ Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver docs/SUPABASE_STORAGE_POLICIES.md`);
      throw new Error(`Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver docs/SUPABASE_STORAGE_POLICIES.md`);
    }
    throw new Error(`Error al subir archivo: ${error.message}`);
  }

  // Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Convierte base64 a File
 */
function base64ToFile(base64: string, filename: string, mimeType: string): File {
  // Remover el prefijo data:image/jpeg;base64, si existe
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Convertir base64 a binary
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  
  // Crear Blob y luego File
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Sube múltiples archivos a Supabase Storage (tolerante a fallos: un fallo no aborta el resto).
 * @param files Array de FileUpload a subir
 * @param propertyId ID de la propiedad
 * @param inspectionId ID de la inspección
 * @param zoneId ID de la zona (opcional)
 * @returns Array de misma longitud que files: URL string en posición correcta o null si falló/no válido
 */
export async function uploadFilesToStorage(
  files: FileUpload[],
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<(string | null)[]> {
  const uploadPromises = files.map(async (file): Promise<string | null> => {
    // Si ya tiene URL (ya subido), retornar directamente
    if (file.data && file.data.startsWith('http')) {
      return file.data;
    }

    // Si tiene data como base64, convertirlo a File y subirlo
    if (file.data && file.data.startsWith('data:')) {
      const mimeMatch = file.data.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      try {
        const fileObj = base64ToFile(file.data, file.name, mimeType);
        return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
      } catch (error: any) {
        if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) {
          console.warn(`[storage-upload] Bucket '${STORAGE_BUCKET}' no encontrado.`);
          return null;
        }
        console.warn('[storage-upload] Error subiendo archivo:', file.name, error?.message || error);
        return null;
      }
    }

    // Si es base64 sin prefijo data:
    if (file.data && !file.data.startsWith('http') && !file.data.startsWith('data:')) {
      try {
        const fileObj = base64ToFile(file.data, file.name, file.type || 'image/jpeg');
        return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
      } catch (error: any) {
        if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) {
          console.warn(`[storage-upload] Bucket '${STORAGE_BUCKET}' no encontrado.`);
          return null;
        }
        console.warn('[storage-upload] Error subiendo archivo:', file.name, error?.message || error);
        return null;
      }
    }

    return null;
  });

  const settled = await Promise.allSettled(uploadPromises);
  return settled.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    console.warn('[storage-upload] Upload rejected:', result.reason);
    return null;
  });
}

/**
 * Convierte un File a FileUpload con URL de Supabase Storage
 */
export async function convertFileToFileUpload(
  file: File,
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<FileUpload> {
  const url = await uploadFileToStorage(file, propertyId, inspectionId, zoneId);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    data: url, // URL de Supabase Storage
    uploadedAt: new Date().toISOString(),
  };
}

