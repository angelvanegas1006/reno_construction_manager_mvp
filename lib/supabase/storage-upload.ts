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
    console.error('Error uploading file:', error);
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
 * Sube múltiples archivos a Supabase Storage
 * @param files Array de FileUpload a subir
 * @param propertyId ID de la propiedad
 * @param inspectionId ID de la inspección
 * @param zoneId ID de la zona (opcional)
 * @returns Array de URLs públicas
 */
export async function uploadFilesToStorage(
  files: FileUpload[],
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<string[]> {
  const uploadPromises = files.map(async (file) => {
    // Si ya tiene URL (ya subido), retornar directamente
    if (file.data && file.data.startsWith('http')) {
      return file.data;
    }

    // Si tiene data como base64, convertirlo a File y subirlo
    if (file.data && file.data.startsWith('data:')) {
      // Extraer mimeType del data URL
      const mimeMatch = file.data.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      
      const fileObj = base64ToFile(file.data, file.name, mimeType);
      return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
    }

    // Si es base64 sin prefijo data:, intentar con el tipo del archivo
    if (file.data && !file.data.startsWith('http') && !file.data.startsWith('data:')) {
      const fileObj = base64ToFile(file.data, file.name, file.type || 'image/jpeg');
      return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
    }

    // Si no tiene data, retornar null (archivo no válido)
    return null;
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
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

