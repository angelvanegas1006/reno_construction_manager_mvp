/**
 * Parser para extraer partidas individuales del activities_text
 * Formato esperado: "1.1 — UD RETIRADA DE ENSERES Y MOBILIARIO: [descripción]... 125,00 € ... 1 ... 125,00 €"
 */

export interface Partida {
  number: string; // "1.1", "1.2", etc.
  title: string; // "UD RETIRADA DE ENSERES Y MOBILIARIO"
  description?: string; // Descripción completa
  areas?: string[]; // ["Baño 1", "Baño 2", "Habitación 1"]
  unitPrice?: string; // "125,00 €" o "12,15€/ud"
  quantity?: string; // "1" o "3 ud"
  totalPrice?: string; // "125,00 €" o "36,45€"
  rawText: string; // Texto completo de la partida
}

/**
 * Parsea el activities_text y extrae partidas individuales
 */
export function parseActivitiesText(text: string | null): Partida[] {
  if (!text) return [];

  // Normalizar espacios y saltos de línea
  let normalized = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Dividir por patrones de números de partida (ej: "1.1 —", "1.2 —", "8.1 —")
  // Patrón: número.número seguido de espacios opcionales y guión (— o -)
  const partidaPattern = /(\d+\.\d+\s*[—\-])/g;
  const matches = [...normalized.matchAll(partidaPattern)];
  
  if (matches.length === 0) {
    // Si no hay partidas numeradas, retornar todo como una sola partida
    return [{
      number: '1',
      title: normalized.substring(0, 100) + (normalized.length > 100 ? '...' : ''),
      description: normalized,
      rawText: normalized,
    }];
  }

  const partidas: Partida[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIndex = match.index!;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : normalized.length;
    
    const partidaText = normalized.substring(startIndex, endIndex).trim();
    
    // Extraer número de partida (ej: "1.1" de "1.1 —")
    const numberMatch = partidaText.match(/^(\d+\.\d+)/);
    const number = numberMatch ? numberMatch[1] : `${i + 1}`;
    
    // Extraer título (después del número hasta los dos puntos o hasta el final)
    // Formato: "1.1 — UD RETIRADA DE ENSERES Y MOBILIARIO:"
    const titleMatch = partidaText.match(/^\d+\.\d+\s*[—\-]\s*([^:]+?)(?::|$)/);
    let title = titleMatch ? titleMatch[1].trim() : '';
    
    // Si no hay título claro, tomar las primeras palabras después del número
    if (!title) {
      const afterNumber = partidaText.replace(/^\d+\.\d+\s*[—\-]\s*/, '').trim();
      title = afterNumber.split(':')[0] || afterNumber.split('.')[0] || afterNumber.substring(0, 50);
    }
    
    // Extraer descripción (después de los dos puntos)
    const descriptionMatch = partidaText.match(/:\s*(.+)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    // Intentar extraer áreas afectadas (patrones como "Baño 1", "Dormitorio 1: 1Ud", "Baño 1 · Baño 2")
    const areas: string[] = [];
    
    // Patrón 1: Áreas separadas por "·" (ej: "Baño 1 · Baño 2 · Habitación 1")
    const areasSeparatedPattern = /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+\d+)?(?:\s*·\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+\d+)?)*)/;
    const areasSeparatedMatch = partidaText.match(areasSeparatedPattern);
    if (areasSeparatedMatch) {
      const areasList = areasSeparatedMatch[0].split('·').map(a => a.trim()).filter(a => a);
      areas.push(...areasList);
    }
    
    // Patrón 2: Áreas individuales con número (ej: "Baño 1", "Dormitorio 1")
    if (areas.length === 0) {
      const areaPatterns = [
        /(?:Baño|Dormitorio|Habitación|Salón|Cocina|Comedor|Sala|Estudio|Terraza|Balcón|Garaje|Trastero)\s*\d+/gi,
        /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*\d+/g,
      ];
      
      areaPatterns.forEach(pattern => {
        const areaMatches = partidaText.matchAll(pattern);
        for (const areaMatch of areaMatches) {
          const area = areaMatch[0].split(':')[0].trim();
          if (area && !areas.includes(area)) {
            areas.push(area);
          }
        }
      });
    }
    
    // Intentar extraer precios (formato: "125,00 €", "12,15€/ud", "36,45€")
    // Buscar todos los precios en el texto
    const pricePatterns = [
      /(\d+[.,]\d+)\s*€(?:\/ud)?/g, // "125,00 €" o "12,15€/ud"
      /(\d+[.,]\d+)\s*EUR/g,
      /(\d+[.,]\d+)€/g, // "36,45€"
    ];
    
    const prices: Array<{ value: string; index: number; isUnit: boolean }> = [];
    pricePatterns.forEach(pattern => {
      const priceMatches = partidaText.matchAll(pattern);
      for (const priceMatch of priceMatches) {
        const priceText = priceMatch[0].trim();
        const isUnitPrice = priceText.includes('/ud') || priceText.includes('/');
        prices.push({
          value: priceText,
          index: priceMatch.index!,
          isUnit: isUnitPrice,
        });
      }
    });
    
    // Ordenar por posición en el texto
    prices.sort((a, b) => a.index - b.index);
    
    // El precio unitario suele venir antes del total y tiene "/ud"
    const unitPriceObj = prices.find(p => p.isUnit) || (prices.length > 1 ? prices[0] : undefined);
    const unitPrice = unitPriceObj?.value;
    
    // El precio total suele ser el último y no tiene "/ud"
    const totalPriceObj = prices.filter(p => !p.isUnit).pop() || prices[prices.length - 1];
    const totalPrice = totalPriceObj?.value;
    
    // Intentar extraer cantidad (patrones como "1", "3 ud", "2 unidades")
    const quantityPatterns = [
      /(\d+)\s*ud\b/i,
      /(\d+)\s*unidades?/i,
      /\b(\d+)\s*$/,
    ];
    
    let quantity: string | undefined;
    for (const pattern of quantityPatterns) {
      const quantityMatch = partidaText.match(pattern);
      if (quantityMatch) {
        quantity = quantityMatch[1];
        break;
      }
    }
    
    partidas.push({
      number,
      title,
      description: description || undefined,
      areas: areas.length > 0 ? areas : undefined,
      unitPrice,
      quantity,
      totalPrice,
      rawText: partidaText,
    });
  }
  
  return partidas;
}

