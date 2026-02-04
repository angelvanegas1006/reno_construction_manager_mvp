/**
 * Compresión de imágenes en cliente (navegador) para reducir tamaño antes de subir.
 * Útil en móvil cuando las fotos de cámara son muy grandes y fallan la subida o atob().
 * Solo se ejecuta en entorno con document/window (navegador).
 */

const DEFAULT_MAX_SIZE = 1920;
const DEFAULT_QUALITY = 0.85;
const SIZE_THRESHOLD_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

/**
 * Comprime una imagen en formato data URL si supera el umbral de tamaño.
 * Redimensiona manteniendo proporción (max 1920px lado largo) y re-encodea con calidad JPEG.
 * @param dataUrl data URL (data:image/...;base64,...)
 * @param maxSizeBytes umbral en bytes; por encima se intenta comprimir (default 2.5 MB)
 * @returns data URL comprimida o la original si no se pudo comprimir / no es imagen / no estamos en browser
 */
export async function compressImageDataUrlIfNeeded(
  dataUrl: string,
  maxSizeBytes: number = SIZE_THRESHOLD_BYTES
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  const base64Length = dataUrl.includes(',') ? dataUrl.split(',')[1]?.length ?? 0 : dataUrl.length;
  const estimatedBytes = Math.floor((base64Length * 3) / 4);
  if (estimatedBytes <= maxSizeBytes) {
    return dataUrl;
  }
  if (!isBrowser()) {
    return dataUrl;
  }
  try {
    return await compressImageDataUrl(dataUrl, DEFAULT_MAX_SIZE, DEFAULT_QUALITY);
  } catch {
    return dataUrl;
  }
}

/**
 * Comprime una imagen data URL redimensionando y re-encodeando como JPEG.
 * Solo funciona en navegador (usa canvas).
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidthHeight: number = DEFAULT_MAX_SIZE,
  quality: number = DEFAULT_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      resolve(dataUrl);
      return;
    }
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        let width = w;
        let height = h;
        if (w > maxWidthHeight || h > maxWidthHeight) {
          if (w >= h) {
            width = maxWidthHeight;
            height = Math.round((h * maxWidthHeight) / w);
          } else {
            height = maxWidthHeight;
            width = Math.round((w * maxWidthHeight) / h);
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(dataUrl);
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(dataUrl);
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
