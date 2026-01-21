/**
 * Extrae texto completo de un PDF usando pdf-parse
 * Funciona en Node.js (server-side)
 * 
 * pdf-parse es más simple y funciona mejor en Next.js que pdfjs-dist
 */

import pdfParse from 'pdf-parse';

/**
 * Extrae todo el texto de un PDF desde un ArrayBuffer
 * @param pdfBuffer ArrayBuffer del PDF
 * @returns Texto completo del PDF concatenado
 */
export async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('[Extract PDF Text] Starting text extraction using pdf-parse...');
    
    // Convertir ArrayBuffer a Buffer (necesario para pdf-parse)
    const buffer = Buffer.from(pdfBuffer);
    console.log(`[Extract PDF Text] PDF buffer size: ${buffer.length} bytes`);
    
    // Extraer texto usando pdf-parse
    const data = await pdfParse(buffer);
    
    console.log(`[Extract PDF Text] PDF parsed successfully. Pages: ${data.numpages}, Text length: ${data.text.length} characters`);
    
    // Retornar el texto extraído
    return data.text;
  } catch (error: any) {
    console.error('[Extract PDF Text] ❌ Error extracting text:', error);
    throw new Error(`Failed to extract PDF text: ${error.message || 'Unknown error'}`);
  }
}
