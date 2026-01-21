/**
 * Extrae actividades de una categoría específica del texto completo del PDF
 */

/**
 * Normaliza el nombre de una categoría para búsqueda
 * - Elimina números iniciales (ej: "1 FONTANERÍA" -> "FONTANERÍA")
 * - Convierte a mayúsculas
 * - Elimina espacios extra
 */
function normalizeCategoryName(categoryName: string): string {
  return categoryName
    .replace(/^\d+\s*[.—\-]\s*/, '') // Eliminar números iniciales con separadores
    .replace(/^\d+\s+/, '') // Eliminar números iniciales sin separadores
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Busca el nombre de una categoría en el texto (con variaciones)
 * Retorna la posición de inicio si se encuentra, -1 si no
 */
function findCategoryInText(categoryName: string, text: string): number {
  const normalizedCategory = normalizeCategoryName(categoryName);
  const normalizedText = text.toUpperCase();
  const originalCategoryUpper = categoryName.toUpperCase();

  // 1. Buscar el nombre exacto normalizado (sin números iniciales)
  let index = normalizedText.indexOf(normalizedCategory);
  if (index !== -1) {
    console.log(`[Find Category] ✅ Found "${categoryName}" using normalized name at position ${index}`);
    return index;
  }

  // 2. Buscar sin números iniciales (variación más común)
  const withoutNumbers = categoryName.replace(/^\d+\s*[.—\-]?\s*/, '').trim().toUpperCase();
  if (withoutNumbers && withoutNumbers !== normalizedCategory && withoutNumbers.length > 3) {
    index = normalizedText.indexOf(withoutNumbers);
    if (index !== -1) {
      console.log(`[Find Category] ✅ Found "${categoryName}" using name without numbers ("${withoutNumbers}") at position ${index}`);
      return index;
    }
  }

  // 3. Buscar el nombre original completo (con números si los tiene)
  index = normalizedText.indexOf(originalCategoryUpper);
  if (index !== -1) {
    console.log(`[Find Category] ✅ Found "${categoryName}" using original name at position ${index}`);
    return index;
  }

  // 4. Buscar variaciones con números (ej: "1 FONTANERÍA", "1. FONTANERÍA", "1- FONTANERÍA")
  const numberPatterns = [
    /^\d+\s+/,           // "1 FONTANERÍA"
    /^\d+\.\s+/,         // "1. FONTANERÍA"
    /^\d+[.—\-]\s+/,     // "1- FONTANERÍA" o "1— FONTANERÍA"
  ];

  for (const pattern of numberPatterns) {
    const withPattern = categoryName.replace(pattern, '').trim().toUpperCase();
    if (withPattern && withPattern.length > 3) {
      index = normalizedText.indexOf(withPattern);
      if (index !== -1) {
        console.log(`[Find Category] ✅ Found "${categoryName}" using pattern (removed number prefix) "${withPattern}" at position ${index}`);
        return index;
      }
    }
  }

  // 5. Buscar solo la primera palabra importante (último recurso)
  // Para "5 CARPINTERÍAS", buscar solo "CARPINTERÍAS"
  const importantWords = normalizedCategory.split(/\s+/).filter(w => w.length > 3);
  if (importantWords.length > 0) {
    const firstImportantWord = importantWords[0];
    index = normalizedText.indexOf(firstImportantWord);
    if (index !== -1) {
      // Verificar que no sea parte de otra palabra
      const beforeChar = index > 0 ? normalizedText[index - 1] : ' ';
      const afterChar = index + firstImportantWord.length < normalizedText.length 
        ? normalizedText[index + firstImportantWord.length] 
        : ' ';
      
      // Si está rodeado de espacios o está al inicio/fin de línea, es válido
      if (!/[A-Z0-9]/.test(beforeChar) && !/[A-Z0-9]/.test(afterChar)) {
        console.log(`[Find Category] ✅ Found "${categoryName}" using first important word "${firstImportantWord}" at position ${index}`);
        return index;
      }
    }
  }

  // 6. Buscar palabras clave (último recurso)
  // Dividir el nombre en palabras y buscar al menos 2 palabras consecutivas
  if (importantWords.length >= 2) {
    const keywordSearch = importantWords.slice(0, 2).join(' ');
    index = normalizedText.indexOf(keywordSearch);
    if (index !== -1) {
      console.log(`[Find Category] ✅ Found "${categoryName}" using keywords "${keywordSearch}" at position ${index}`);
      return index;
    }
  }

  // Log detallado para debugging
  console.warn(`[Find Category] ❌ Could not find "${categoryName}" in PDF text`);
  console.warn(`[Find Category]   Tried: normalized="${normalizedCategory}"`);
  console.warn(`[Find Category]   Tried: withoutNumbers="${withoutNumbers}"`);
  console.warn(`[Find Category]   Tried: original="${originalCategoryUpper}"`);
  console.warn(`[Find Category]   Important words: ${importantWords.join(', ')}`);
  
  // Buscar cualquier coincidencia parcial para ayudar a diagnosticar
  const partialMatches: string[] = [];
  importantWords.forEach(word => {
    if (normalizedText.includes(word)) {
      const matchIndex = normalizedText.indexOf(word);
      const context = normalizedText.substring(Math.max(0, matchIndex - 20), Math.min(normalizedText.length, matchIndex + word.length + 20));
      partialMatches.push(`Found "${word}" at position ${matchIndex}: "...${context}..."`);
    }
  });
  
  if (partialMatches.length > 0) {
    console.warn(`[Find Category]   Partial matches found:`, partialMatches);
  }
  
  return -1;
}

/**
 * Encuentra la siguiente categoría en el texto después de una posición dada
 */
function findNextCategory(
  currentPosition: number,
  allCategoryNames: string[],
  text: string
): number {
  let nextPosition = text.length; // Por defecto, hasta el final

  for (const categoryName of allCategoryNames) {
    const categoryPos = findCategoryInText(categoryName, text);
    if (categoryPos !== -1 && categoryPos > currentPosition) {
      if (categoryPos < nextPosition) {
        nextPosition = categoryPos;
      }
    }
  }

  return nextPosition;
}

/**
 * Extrae el texto de actividades para una categoría específica
 * @param categoryName Nombre de la categoría a buscar
 * @param fullText Texto completo del PDF
 * @param allCategoryNames Lista de todas las categorías (para encontrar límites)
 * @returns Texto de actividades o null si no se encuentra
 */
export function extractActivitiesFromPdf(
  categoryName: string,
  fullText: string,
  allCategoryNames: string[]
): string | null {
  try {
    console.log(`[Extract Activities] Searching for category: "${categoryName}"`);

    // Buscar la posición de la categoría en el texto
    const categoryPosition = findCategoryInText(categoryName, fullText);

    if (categoryPosition === -1) {
      console.warn(`[Extract Activities] Category "${categoryName}" not found in PDF text`);
      return null;
    }

    console.log(`[Extract Activities] Found category at position ${categoryPosition}`);

    // Encontrar la siguiente categoría (o el final del documento)
    const nextCategoryPosition = findNextCategory(categoryPosition, allCategoryNames, fullText);
    console.log(`[Extract Activities] Next category at position ${nextCategoryPosition}`);

    // Extraer el texto entre la categoría actual y la siguiente
    let activitiesText = fullText.substring(categoryPosition, nextCategoryPosition);

    console.log(`[Extract Activities] Extracted text chunk length: ${activitiesText.length} characters`);
    console.log(`[Extract Activities] Text chunk preview (first 200 chars): "${activitiesText.substring(0, 200)}"`);

    // Limpiar el texto extraído
    // 1. Encontrar y eliminar el nombre de la categoría del inicio
    const normalizedCategory = normalizeCategoryName(categoryName);
    const activitiesUpper = activitiesText.toUpperCase();
    
    // Buscar el nombre de la categoría en diferentes formatos
    let categoryIndex = activitiesUpper.indexOf(normalizedCategory);
    if (categoryIndex === -1) {
      // Intentar sin números
      const withoutNumbers = categoryName.replace(/^\d+\s*[.—\-]?\s*/, '').trim().toUpperCase();
      if (withoutNumbers) {
        categoryIndex = activitiesUpper.indexOf(withoutNumbers);
      }
    }
    
    // Si aún no encontramos, buscar solo la primera palabra importante
    if (categoryIndex === -1) {
      const importantWords = normalizedCategory.split(/\s+/).filter(w => w.length > 3);
      if (importantWords.length > 0) {
        categoryIndex = activitiesUpper.indexOf(importantWords[0]);
      }
    }
    
    if (categoryIndex !== -1) {
      console.log(`[Extract Activities] Found category name at position ${categoryIndex} in extracted text`);
      
      // Encontrar el final del nombre de la categoría
      let startIndex = categoryIndex;
      
      // Avanzar hasta encontrar el final del nombre de categoría
      // Buscar dos puntos, salto de línea, o número de actividad
      const searchEnd = Math.min(startIndex + 100, activitiesText.length);
      let foundEnd = false;
      
      for (let i = startIndex; i < searchEnd; i++) {
        const char = activitiesText[i];
        // Si encontramos un número seguido de punto (ej: "1.1"), ese es el inicio de actividades
        if (/\d/.test(char) && i + 1 < activitiesText.length && activitiesText[i + 1] === '.') {
          // Verificar que sea un patrón de número de actividad (ej: "1.1", "2.1")
          const activityMatch = activitiesText.substring(i).match(/^\d+\.\d+/);
          if (activityMatch) {
            startIndex = i;
            foundEnd = true;
            console.log(`[Extract Activities] Found activity number "${activityMatch[0]}" at position ${startIndex}`);
            break;
          }
        }
        // Si encontramos dos puntos seguido de texto, puede ser el inicio
        if (char === ':' && i + 1 < activitiesText.length && activitiesText[i + 1] !== ' ') {
          startIndex = i + 1;
          foundEnd = true;
          break;
        }
      }
      
      // Si no encontramos un marcador claro, avanzar desde el final del nombre de categoría
      if (!foundEnd) {
        // Buscar el final del nombre de categoría (buscar espacios, saltos de línea, o dos puntos)
        startIndex = categoryIndex + normalizedCategory.length;
        
        // Buscar dos puntos después del nombre
        const colonIndex = activitiesText.indexOf(':', startIndex);
        if (colonIndex !== -1 && colonIndex < startIndex + 200) {
          startIndex = colonIndex + 1;
        }
        
        // Buscar el primer número de actividad (ej: "1.1", "2.1") que indica el inicio de las actividades
        const activityNumberMatch = activitiesText.substring(startIndex).match(/\d+\.\d+/);
        if (activityNumberMatch && activityNumberMatch.index !== undefined) {
          startIndex = startIndex + activityNumberMatch.index;
          console.log(`[Extract Activities] Found activity number "${activityNumberMatch[0]}" at position ${startIndex}`);
        } else {
          // Si no hay número de actividad, buscar el primer carácter no-espacio después del nombre
          while (startIndex < activitiesText.length && 
                 (activitiesText[startIndex] === ' ' || 
                  activitiesText[startIndex] === '\n' || 
                  activitiesText[startIndex] === '\t' ||
                  activitiesText[startIndex] === '—' ||
                  activitiesText[startIndex] === '-' ||
                  activitiesText[startIndex] === ':')) {
            startIndex++;
          }
        }
      }
      
      activitiesText = activitiesText.substring(startIndex);
      console.log(`[Extract Activities] Text after removing category name (first 200 chars): "${activitiesText.substring(0, 200)}"`);
    } else {
      console.warn(`[Extract Activities] Category name not found in extracted text chunk, using full chunk`);
    }

    // 2. Limpiar espacios y saltos de línea excesivos
    activitiesText = activitiesText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Máximo 2 saltos de línea consecutivos
      .replace(/[ \t]+/g, ' ') // Múltiples espacios a uno solo
      .trim();

    // 3. Validar que el texto extraído no sea solo el nombre de la categoría
    const normalizedText = activitiesText.toUpperCase();
    const categoryVariations = [
      normalizedCategory,
      categoryName.toUpperCase(),
      categoryName.replace(/^\d+\s*[.—\-]?\s*/, '').trim().toUpperCase(),
    ];
    
    let isOnlyCategoryName = false;
    for (const variation of categoryVariations) {
      if (variation && normalizedText === variation.trim()) {
        isOnlyCategoryName = true;
        console.warn(`[Extract Activities] Extracted text is only the category name: "${variation}"`);
        break;
      }
      // También verificar si el texto empieza y termina con el nombre de categoría
      if (variation && normalizedText.startsWith(variation) && normalizedText.length < variation.length + 50) {
        isOnlyCategoryName = true;
        console.warn(`[Extract Activities] Extracted text is mostly the category name: "${variation}"`);
        break;
      }
    }

    if (activitiesText.length === 0 || isOnlyCategoryName) {
      console.warn(`[Extract Activities] No activities text found for category "${categoryName}"`);
      console.warn(`[Extract Activities] Extracted text was: "${activitiesText.substring(0, 200)}"`);
      return null;
    }

    // 4. Verificar que haya contenido que parezca actividades (números, guiones, texto descriptivo)
    // Si solo hay espacios, saltos de línea o caracteres especiales, probablemente no hay actividades
    const hasActivityContent = /[\d\w]{3,}/.test(activitiesText);
    if (!hasActivityContent) {
      console.warn(`[Extract Activities] Extracted text doesn't contain meaningful activity content for "${categoryName}"`);
      console.warn(`[Extract Activities] Extracted text: "${activitiesText.substring(0, 200)}"`);
      return null;
    }

    console.log(`[Extract Activities] ✅ Extracted ${activitiesText.length} characters for category "${categoryName}"`);
    console.log(`[Extract Activities] Final activities text preview (first 300 chars): "${activitiesText.substring(0, 300)}"`);

    return activitiesText;
  } catch (error: any) {
    console.error(`[Extract Activities] ❌ Error extracting activities for "${categoryName}":`, error);
    return null;
  }
}
