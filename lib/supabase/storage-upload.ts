import { createClient } from '@/lib/supabase/client';
import type { FileUpload } from '@/lib/checklist-storage';
import { compressImageDataUrlIfNeeded } from '@/lib/image-compress';
import { getOriginalVideoFile, removeOriginalVideoFile } from '@/hooks/useFileUpload';

const STORAGE_BUCKET = 'inspection-images';
const IMAGE_COMPRESS_THRESHOLD_BYTES = 2.5 * 1024 * 1024; // 2.5 MB – comprimir imágenes más grandes (ej. fotos móvil)

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

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log('[storage-upload] 📤 Uploading file:', { name: file.name, sizeBytes: file.size, sizeMB: fileSizeMB, path });

  // Subir archivo
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('[storage-upload] ❌ Error uploading file:', {
      name: file.name,
      sizeBytes: file.size,
      sizeMB: fileSizeMB,
      errorMessage: error.message,
      error,
    });
    // Si el bucket no existe, proporcionar instrucciones claras
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      console.error(`[storage-upload] ⚠️ Bucket '${STORAGE_BUCKET}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${STORAGE_BUCKET}"`);
      throw new Error(`Bucket '${STORAGE_BUCKET}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${STORAGE_BUCKET}"`);
    }
    // Si es un error de RLS, proporcionar instrucciones claras
    if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('policy')) {
      console.error(`[storage-upload] ⚠️ Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md`);
      throw new Error(`Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md`);
    }
    // Cuota de almacenamiento de Supabase superada (plan Free = 1 GB). Mensaje claro para el usuario.
    if (error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded')) {
      throw new Error(
        'Cuota de almacenamiento superada. El proyecto ha alcanzado el límite de espacio (p. ej. 1 GB en plan gratuito). ' +
        'Libera espacio en Supabase Dashboard → Storage o sube un vídeo más corto/ligero.'
      );
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

const UPLOAD_BATCH_SIZE = 3; // Subir de 3 en 3 para no saturar memoria ni bloquear la UI

async function uploadOneFile(
  file: FileUpload,
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<string | null> {
  if (file.data && file.data.startsWith('http')) return file.data;

  // Videos almacenados con blob URL: subir el File original directamente (sin pasar por base64)
  if (file.data && file.data.startsWith('blob:')) {
    const originalFile = getOriginalVideoFile(file.id);
    if (originalFile) {
      try {
        console.log(`[storage-upload] 🎥 Uploading video directly from File object: ${file.name} (${(originalFile.size / (1024 * 1024)).toFixed(1)}MB)`);
        const url = await uploadFileToStorage(originalFile, propertyId, inspectionId, zoneId);
        // Limpiar referencia y blob URL tras subida exitosa
        removeOriginalVideoFile(file.id);
        URL.revokeObjectURL(file.data);
        return url;
      } catch (error: any) {
        if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) return null;
        console.warn('[storage-upload] Error uploading video:', file.name, error?.message);
        return null;
      }
    } else {
      console.warn('[storage-upload] ⚠️ Blob URL found but no original File in store:', file.id, file.name);
      return null;
    }
  }

  if (file.data && file.data.startsWith('data:')) {
    const mimeMatch = file.data.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
    const base64Length = file.data.length;
    const estimatedSizeBytes = Math.floor((base64Length * 3) / 4);
    let dataToUpload = file.data;
    if (file.data.startsWith('data:image/') && estimatedSizeBytes > IMAGE_COMPRESS_THRESHOLD_BYTES) {
      try {
        dataToUpload = await compressImageDataUrlIfNeeded(file.data, IMAGE_COMPRESS_THRESHOLD_BYTES);
      } catch (e) {
        console.warn('[storage-upload] Compression failed, uploading original:', file.name, e);
      }
    }
    try {
      const fileObj = base64ToFile(dataToUpload, file.name, mimeType);
      return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
    } catch (error: any) {
      if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) return null;
      console.warn('[storage-upload] Error subiendo archivo:', file.name, error?.message);
      return null;
    }
  }

  if (file.data && !file.data.startsWith('http') && !file.data.startsWith('data:')) {
    try {
      const fileObj = base64ToFile(file.data, file.name, file.type || 'image/jpeg');
      return await uploadFileToStorage(fileObj, propertyId, inspectionId, zoneId);
    } catch (error: any) {
      if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) return null;
      console.warn('[storage-upload] Error subiendo archivo (base64 raw):', file.name, error?.message);
      return null;
    }
  }

  return null;
}

/**
 * Sube múltiples archivos a Supabase Storage en lotes (evita saturar memoria y que la app vaya lenta).
 * Un fallo en un archivo no aborta el resto.
 */
export async function uploadFilesToStorage(
  files: FileUpload[],
  propertyId: string,
  inspectionId: string,
  zoneId?: string
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(files.length).fill(null);

  for (let i = 0; i < files.length; i += UPLOAD_BATCH_SIZE) {
    const batch = files.slice(i, i + UPLOAD_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((file) => uploadOneFile(file, propertyId, inspectionId, zoneId))
    );
    batchResults.forEach((url, j) => {
      results[i + j] = url;
    });
  }

  return results;
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

