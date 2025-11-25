import { ChecklistData, ChecklistSection, ChecklistQuestion } from "./checklist-storage";

/**
 * Verifica si un elemento tiene datos reportados
 */
function hasElementData(element: {
  status?: string;
  estado?: string;
  notes?: string;
  photos?: any[];
  videos?: any[];
  units?: any[];
  badElements?: string[];
}): boolean {
  if (element.status || element.estado) return true;
  if (element.notes && element.notes.trim()) return true;
  if (element.photos && element.photos.length > 0) return true;
  if (element.videos && element.videos.length > 0) return true;
  if (element.units && element.units.length > 0) return true;
  if (element.badElements && element.badElements.length > 0) return true;
  return false;
}

/**
 * Verifica si una pregunta tiene datos reportados
 */
function hasQuestionData(question: ChecklistQuestion): boolean {
  return hasElementData(question);
}

/**
 * Verifica si TODOS los elementos requeridos de una sección tienen datos reportados
 */
function areAllRequiredElementsReported(section: ChecklistSection): boolean {
  // Verificar upload zones - todos deben tener al menos una foto o video
  if (section.uploadZones && section.uploadZones.length > 0) {
    for (const uploadZone of section.uploadZones) {
      const hasPhotos = uploadZone.photos && uploadZone.photos.length > 0;
      const hasVideos = uploadZone.videos && uploadZone.videos.length > 0;
      if (!hasPhotos && !hasVideos) {
        return false; // Al menos un upload zone sin datos
      }
    }
  }

  // Verificar questions - todas deben tener datos
  if (section.questions && section.questions.length > 0) {
    for (const question of section.questions) {
      if (!hasQuestionData(question)) {
        return false; // Al menos una pregunta sin datos
      }
    }
  }

  // Verificar dynamic items (habitaciones, banos) - todos deben tener datos
  if (section.dynamicItems && section.dynamicItems.length > 0) {
    for (const item of section.dynamicItems) {
      // Verificar uploadZone del item dinámico
      if (item.uploadZone) {
        const hasPhotos = item.uploadZone.photos && item.uploadZone.photos.length > 0;
        const hasVideos = item.uploadZone.videos && item.uploadZone.videos.length > 0;
        if (!hasPhotos && !hasVideos) {
          return false;
        }
      }

      // Verificar questions del item dinámico
      if (item.questions && item.questions.length > 0) {
        for (const q of item.questions) {
          if (!hasQuestionData(q)) {
            return false;
          }
        }
      }

      // Verificar carpentryItems del item dinámico
      if (item.carpentryItems && item.carpentryItems.length > 0) {
        for (const carpentry of item.carpentryItems) {
          if (!hasElementData(carpentry)) {
            return false;
          }
          // Si tiene cantidad > 1, verificar units
          if (carpentry.cantidad > 1 && carpentry.units) {
            for (const unit of carpentry.units) {
              if (!hasElementData(unit)) {
                return false;
              }
            }
          }
        }
      }

      // Verificar climatizationItems del item dinámico
      if (item.climatizationItems && item.climatizationItems.length > 0) {
        for (const climatization of item.climatizationItems) {
          if (!hasElementData(climatization)) {
            return false;
          }
          // Si tiene cantidad > 1, verificar units
          if (climatization.cantidad > 1 && climatization.units) {
            for (const unit of climatization.units) {
              if (!hasElementData(unit)) {
                return false;
              }
            }
          }
        }
      }

      // Verificar mobiliario del item dinámico
      if (item.mobiliario?.existeMobiliario !== undefined) {
        if (item.mobiliario.existeMobiliario && item.mobiliario.question) {
          if (!hasQuestionData(item.mobiliario.question)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar climatization items - todos deben tener datos
  if (section.climatizationItems && section.climatizationItems.length > 0) {
    for (const item of section.climatizationItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar carpentry items - todos deben tener datos
  if (section.carpentryItems && section.carpentryItems.length > 0) {
    for (const item of section.carpentryItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar storage items - todos deben tener datos
  if (section.storageItems && section.storageItems.length > 0) {
    for (const item of section.storageItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar appliances items - todos deben tener datos
  if (section.appliancesItems && section.appliancesItems.length > 0) {
    for (const item of section.appliancesItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar security items - todos deben tener datos
  if (section.securityItems && section.securityItems.length > 0) {
    for (const item of section.securityItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar systems items - todos deben tener datos
  if (section.systemsItems && section.systemsItems.length > 0) {
    for (const item of section.systemsItems) {
      if (!hasElementData(item)) {
        return false;
      }
      // Si tiene cantidad > 1, verificar units
      if (item.cantidad > 1 && item.units) {
        for (const unit of item.units) {
          if (!hasElementData(unit)) {
            return false;
          }
        }
      }
    }
  }

  // Verificar mobiliario
  if (section.mobiliario?.existeMobiliario !== undefined) {
    if (section.mobiliario.existeMobiliario && section.mobiliario.question) {
      if (!hasQuestionData(section.mobiliario.question)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Verifica si todas las secciones del checklist tienen TODOS sus elementos requeridos con datos reportados
 * @param checklist El checklist a validar
 * @returns true si todas las secciones tienen todos los elementos requeridos con datos, false en caso contrario
 */
export function areAllActivitiesReported(checklist: ChecklistData | null): boolean {
  if (!checklist) return false;

  // Secciones requeridas para un checklist completo
  const requiredSections = [
    "entorno-zonas-comunes",
    "estado-general",
    "entrada-pasillos",
    "habitaciones",
    "salon",
    "banos",
    "cocina",
    "exteriores",
  ];

  // Verificar cada sección requerida
  for (const sectionId of requiredSections) {
    const section = checklist.sections[sectionId];
    
    // Si la sección no existe, no está reportada
    if (!section) {
      return false;
    }

    // Verificar si TODOS los elementos requeridos tienen datos reportados
    if (!areAllRequiredElementsReported(section)) {
      return false;
    }
  }

  return true;
}

/**
 * Obtiene las secciones que aún no tienen TODOS sus elementos requeridos con datos reportados
 * @param checklist El checklist a validar
 * @returns Array con los IDs de las secciones con elementos faltantes
 */
export function getUnreportedSections(checklist: ChecklistData | null): string[] {
  if (!checklist) return [];

  const requiredSections = [
    "entorno-zonas-comunes",
    "estado-general",
    "entrada-pasillos",
    "habitaciones",
    "salon",
    "banos",
    "cocina",
    "exteriores",
  ];

  const unreported: string[] = [];

  for (const sectionId of requiredSections) {
    const section = checklist.sections[sectionId];
    
    if (!section || !areAllRequiredElementsReported(section)) {
      unreported.push(sectionId);
    }
  }

  return unreported;
}

