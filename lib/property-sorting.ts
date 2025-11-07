import { Property } from "./property-storage";

/**
 * Check if a property is expired (needs update and past due date)
 */
export function isPropertyExpired(property: Property): boolean {
  if (!property.proximaActualizacion) return false;
  const updateDate = new Date(property.proximaActualizacion);
  const today = new Date();
  return updateDate < today && updateDate.toDateString() !== today.toDateString();
}

/**
 * Sort properties: expired first, then others
 */
export function sortPropertiesByExpired(properties: Property[]): Property[] {
  return [...properties].sort((a, b) => {
    const aExpired = isPropertyExpired(a);
    const bExpired = isPropertyExpired(b);
    
    // Expired properties first
    if (aExpired && !bExpired) return -1;
    if (!aExpired && bExpired) return 1;
    
    // If both are expired or both are not expired, maintain original order
    return 0;
  });
}




