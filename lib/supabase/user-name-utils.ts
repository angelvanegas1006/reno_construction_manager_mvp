/**
 * Extracts a name from an email address
 * miguel.pertusa@prophero.com -> "Miguel Pertusa"
 * carlos.martinez@prophero.com -> "Carlos Martinez"
 */
export function extractNameFromEmail(email: string): string {
  if (!email) return '';
  
  // Get the part before @
  const localPart = email.split('@')[0];
  
  // Split by dots and capitalize each part
  const parts = localPart.split('.');
  const capitalizedParts = parts.map(part => {
    if (!part) return '';
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });
  
  return capitalizedParts.join(' ');
}

/**
 * Mapeo de nombres de foreman a emails
 * Usado para matching parcial de nombres en "Technical construction"
 */
export const FOREMAN_NAME_TO_EMAIL: Record<string, string> = {
  'Raúl': 'raul.pedros@prophero.com',
  'Raúl Pérez': 'raul.pedros@prophero.com',
  'Raul': 'raul.pedros@prophero.com',
  'Raul Perez': 'raul.pedros@prophero.com',
  'Miguel Pertusa': 'miguel.pertusa@prophero.com',
  'Miguel A. Pertusa': 'miguel.pertusa@prophero.com',
  'M. Pertusa': 'miguel.pertusa@prophero.com',
  'Elier Claudio': 'elier.claudio@prophero.com',
  'Victor Maestre': 'victor.maestre@prophero.com',
  'Renée Jimenez': 'tania.jimenez@prophero.com',
  'Renee Jimenez': 'tania.jimenez@prophero.com',
  'Tania Jimenez': 'tania.jimenez@prophero.com',
  'Jonnathan': 'jonnathan.pomares@prophero.com',
  'Jonnathan Pomares': 'jonnathan.pomares@prophero.com',
};

/**
 * Obtiene el email del foreman basado en el nombre en "Technical construction"
 * Usa matching parcial para encontrar coincidencias
 */
export function getForemanEmailFromName(technicalConstruction: string | null): string | null {
  if (!technicalConstruction) return null;
  
  const normalized = technicalConstruction.trim().toLowerCase();
  
  // Primero buscar coincidencia exacta (case-insensitive)
  for (const [name, email] of Object.entries(FOREMAN_NAME_TO_EMAIL)) {
    if (name.toLowerCase() === normalized) {
      return email;
    }
  }
  
  // Luego buscar coincidencia parcial
  for (const [name, email] of Object.entries(FOREMAN_NAME_TO_EMAIL)) {
    const normalizedName = name.toLowerCase();
    
    // Si el nombre contiene el valor o vice versa
    if (normalizedName.includes(normalized) || normalized.includes(normalizedName)) {
      return email;
    }
    
    // También verificar por partes del nombre (ej: "Raúl" en "Raúl Pérez")
    const nameParts = normalizedName.split(' ');
    const constructionParts = normalized.split(' ');
    
    // Si alguna parte del nombre coincide con alguna parte del construction
    for (const part of nameParts) {
      if (part.length > 2 && constructionParts.some(cp => cp.includes(part) || part.includes(cp))) {
        return email;
      }
    }
  }
  
  return null;
}

/**
 * Checks if a property's "Technical construction" field matches the user
 * Supports multiple formats:
 * - "Miguel Pertusa" matches "miguel.pertusa@prophero.com"
 * - "miguel.pertusa@prophero.com" matches "miguel.pertusa@prophero.com"
 * - "Raúl" matches "raul.pedros@prophero.com" (matching parcial)
 * - Case-insensitive matching
 */
export function matchesTechnicalConstruction(
  technicalConstruction: string | null,
  userEmail: string
): boolean {
  if (!technicalConstruction || !userEmail) {
    return false;
  }
  
  const normalizedConstruction = technicalConstruction.trim().toLowerCase();
  const normalizedEmail = userEmail.trim().toLowerCase();
  const extractedName = extractNameFromEmail(userEmail).toLowerCase();
  
  // Check exact matches
  if (normalizedConstruction === normalizedEmail) return true;
  if (normalizedConstruction === extractedName) return true;
  
  // Usar el mapeo de nombres para matching parcial
  const foremanEmail = getForemanEmailFromName(technicalConstruction);
  if (foremanEmail && foremanEmail.toLowerCase() === normalizedEmail) {
    return true;
  }
  
  // Check if email contains the name or vice versa
  if (normalizedConstruction.includes(extractedName)) return true;
  if (extractedName.includes(normalizedConstruction)) return true;
  
  // Check if construction contains email username (before @)
  const emailUsername = normalizedEmail.split('@')[0];
  if (normalizedConstruction.includes(emailUsername)) return true;
  if (emailUsername.includes(normalizedConstruction)) return true;
  
  return false;
}

/**
 * Convierte un email de foreman a nombres posibles de Technical construction
 * Usa el mapeo inverso de FOREMAN_NAME_TO_EMAIL
 */
export function getTechnicalConstructionNamesFromForemanEmail(foremanEmail: string): string[] {
  if (!foremanEmail) return [];
  
  const normalizedEmail = foremanEmail.trim().toLowerCase();
  const names: string[] = [];
  
  // Buscar todos los nombres que mapean a este email
  for (const [name, email] of Object.entries(FOREMAN_NAME_TO_EMAIL)) {
    if (email.toLowerCase() === normalizedEmail) {
      names.push(name);
    }
  }
  
  // Si no se encontró ningún nombre, usar el nombre extraído del email como fallback
  if (names.length === 0) {
    const extractedName = extractNameFromEmail(foremanEmail);
    if (extractedName) {
      names.push(extractedName);
    }
  }
  
  return names;
}

