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

/**
 * Check if a property is marked in red (delayed work) based on its phase
 */
export function isDelayedWork(property: Property, phase?: string): boolean {
  const renoPhase = phase || property.renoPhase;
  
  if (!renoPhase) return false;
  
  // reno-in-progress: check duration limit based on reno type
  if (renoPhase === "reno-in-progress" && property.renoDuration && property.renoType) {
    const renoTypeLower = property.renoType.toLowerCase();
    const duration = property.renoDuration;
    
    if (renoTypeLower.includes('light')) {
      return duration > 30;
    } else if (renoTypeLower.includes('medium')) {
      return duration > 60;
    } else if (renoTypeLower.includes('major')) {
      return duration > 120;
    }
  }
  
  // Budget phases: daysToStartRenoSinceRSD > 25
  if ((renoPhase === "reno-budget-renovator" || renoPhase === "reno-budget-client" || renoPhase === "reno-budget-start") && 
      property.daysToStartRenoSinceRSD !== null && 
      property.daysToStartRenoSinceRSD !== undefined) {
    return property.daysToStartRenoSinceRSD > 25;
  }
  
  // initial-check and upcoming-settlements: daysToVisit > 5
  if ((renoPhase === "initial-check" || renoPhase === "upcoming-settlements") && 
      property.daysToVisit !== null && 
      property.daysToVisit !== undefined) {
    return property.daysToVisit > 5;
  }
  
  // furnishing-cleaning: daysToPropertyReady > 25
  if (renoPhase === "furnishing-cleaning" && 
      property.daysToPropertyReady !== null && 
      property.daysToPropertyReady !== undefined) {
    return property.daysToPropertyReady > 25;
  }
  
  return false;
}








