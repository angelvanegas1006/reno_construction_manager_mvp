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
 * Checks if a property's "Technical construction" field matches the user
 * Supports multiple formats:
 * - "Miguel Pertusa" matches "miguel.pertusa@prophero.com"
 * - "miguel.pertusa@prophero.com" matches "miguel.pertusa@prophero.com"
 * - Case-insensitive matching
 */
export function matchesTechnicalConstruction(
  technicalConstruction: string | null,
  userEmail: string
): boolean {
  if (!technicalConstruction || !userEmail) {
    console.log('[matchesTechnicalConstruction] ❌ Missing values:', {
      technicalConstruction,
      userEmail,
    });
    return false;
  }
  
  const normalizedConstruction = technicalConstruction.trim().toLowerCase();
  const normalizedEmail = userEmail.trim().toLowerCase();
  const extractedName = extractNameFromEmail(userEmail).toLowerCase();
  
  // Only log in development to avoid spam
  if (process.env.NODE_ENV === 'development') {
    console.log('[matchesTechnicalConstruction] 🔍 Comparing:', {
      technicalConstruction: normalizedConstruction,
      userEmail: normalizedEmail,
      extractedName: extractedName,
    });
  }
  
  // Check exact matches
  if (normalizedConstruction === normalizedEmail) return true;
  if (normalizedConstruction === extractedName) return true;
  
  // Check if email contains the name or vice versa
  if (normalizedConstruction.includes(extractedName)) return true;
  if (extractedName.includes(normalizedConstruction)) return true;
  
  // Check if construction contains email username (before @)
  const emailUsername = normalizedEmail.split('@')[0];
  if (normalizedConstruction.includes(emailUsername)) return true;
  if (emailUsername.includes(normalizedConstruction)) return true;
  
  return false;
}

