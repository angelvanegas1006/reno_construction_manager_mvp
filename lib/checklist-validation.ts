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

/** En entorno-zonas-comunes se exigen portal, fachada y preguntas acceso-principal, comunicaciones, ascensor */
const ENTORNO_ZONAS_REQUIRED_UPLOAD_IDS = ["portal", "fachada"];
const ENTORNO_ZONAS_REQUIRED_QUESTION_IDS = ["acceso-principal", "comunicaciones", "ascensor"];

/**
 * Verifica si TODOS los elementos requeridos de una sección tienen datos reportados
 * @param sectionId Si es "entorno-zonas-comunes", solo se validan portal, fachada y preguntas acceso-principal, comunicaciones
 */
function areAllRequiredElementsReported(section: ChecklistSection, sectionId?: string): boolean {
  const isEntornoZonas = sectionId === "entorno-zonas-comunes";

  // Verificar upload zones
  if (section.uploadZones && section.uploadZones.length > 0) {
    const zonesToCheck = isEntornoZonas
      ? section.uploadZones.filter((z) => ENTORNO_ZONAS_REQUIRED_UPLOAD_IDS.includes(z.id))
      : section.uploadZones;
    for (const uploadZone of zonesToCheck) {
      const hasPhotos = uploadZone.photos && uploadZone.photos.length > 0;
      const hasVideos = uploadZone.videos && uploadZone.videos.length > 0;
      if (!hasPhotos && !hasVideos) {
        return false;
      }
    }
  }

  // Verificar questions
  if (section.questions && section.questions.length > 0) {
    const questionsToCheck = isEntornoZonas
      ? section.questions.filter((q) => ENTORNO_ZONAS_REQUIRED_QUESTION_IDS.includes(q.id))
      : section.questions;
    for (const question of questionsToCheck) {
      if (!hasQuestionData(question)) {
        return false;
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

      // Verificar carpentryItems del item dinámico - solo los que tienen cantidad > 0 deben tener datos
      if (item.carpentryItems && item.carpentryItems.length > 0) {
        const itemsWithQuantity = item.carpentryItems.filter(carpentry => (carpentry.cantidad || 0) > 0);
        for (const carpentry of itemsWithQuantity) {
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

      // Verificar climatizationItems del item dinámico - solo los que tienen cantidad > 0 deben tener datos
      if (item.climatizationItems && item.climatizationItems.length > 0) {
        const itemsWithQuantity = item.climatizationItems.filter(climatization => (climatization.cantidad || 0) > 0);
        for (const climatization of itemsWithQuantity) {
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

  // Verificar climatization items - solo los que tienen cantidad > 0 deben tener datos
  if (section.climatizationItems && section.climatizationItems.length > 0) {
    const itemsWithQuantity = section.climatizationItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

  // Verificar carpentry items - solo los que tienen cantidad > 0 deben tener datos
  if (section.carpentryItems && section.carpentryItems.length > 0) {
    const itemsWithQuantity = section.carpentryItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

  // Verificar storage items - solo los que tienen cantidad > 0 deben tener datos
  if (section.storageItems && section.storageItems.length > 0) {
    const itemsWithQuantity = section.storageItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

  // Verificar appliances items - solo los que tienen cantidad > 0 deben tener datos
  if (section.appliancesItems && section.appliancesItems.length > 0) {
    const itemsWithQuantity = section.appliancesItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

  // Verificar security items - solo los que tienen cantidad > 0 deben tener datos
  if (section.securityItems && section.securityItems.length > 0) {
    const itemsWithQuantity = section.securityItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

  // Verificar systems items - solo los que tienen cantidad > 0 deben tener datos
  if (section.systemsItems && section.systemsItems.length > 0) {
    const itemsWithQuantity = section.systemsItems.filter(item => (item.cantidad || 0) > 0);
    for (const item of itemsWithQuantity) {
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

/** Secciones requeridas para initial y final (entorno-zonas-comunes se valida solo con portal, fachada, acceso-principal, comunicaciones). */
function getRequiredSectionsForType(_checklistType?: string): string[] {
  return [
    "entorno-zonas-comunes",
    "estado-general",
    "entrada-pasillos",
    "habitaciones",
    "salon",
    "banos",
    "cocina",
    "exteriores",
  ];
}

/**
 * Verifica si todas las secciones del checklist tienen TODOS sus elementos requeridos con datos reportados
 * @param checklist El checklist a validar
 * @returns true si todas las secciones tienen todos los elementos requeridos con datos, false en caso contrario
 */
export function areAllActivitiesReported(checklist: ChecklistData | null): boolean {
  if (!checklist) return false;

  const requiredSections = getRequiredSectionsForType(checklist.checklistType);

  // Verificar cada sección requerida
  for (const sectionId of requiredSections) {
    const section = checklist.sections[sectionId];
    
    // Si la sección no existe, no está reportada
    if (!section) {
      return false;
    }

    // Verificar si TODOS los elementos requeridos tienen datos reportados
    if (!areAllRequiredElementsReported(section, sectionId)) {
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

  const requiredSections = getRequiredSectionsForType(checklist.checklistType);

  const unreported: string[] = [];

  for (const sectionId of requiredSections) {
    const section = checklist.sections[sectionId];
    
    if (!section || !areAllRequiredElementsReported(section, sectionId)) {
      unreported.push(sectionId);
    }
  }

  return unreported;
}


const SECTION_CONFIGS_BY_ID: Record<string, { id: string; refId: string; name: string }> = {
  "entorno-zonas-comunes": { id: "entorno-zonas-comunes", refId: "checklist-entorno-zonas-comunes", name: "Entorno y Zonas Comunes" },
  "estado-general": { id: "estado-general", refId: "checklist-estado-general", name: "Estado General" },
  "entrada-pasillos": { id: "entrada-pasillos", refId: "checklist-entrada-pasillos", name: "Entrada y Pasillos" },
  "habitaciones": { id: "habitaciones", refId: "checklist-habitaciones", name: "Habitaciones" },
  "salon": { id: "salon", refId: "checklist-salon", name: "Salón" },
  "banos": { id: "banos", refId: "checklist-banos", name: "Baños" },
  "cocina": { id: "cocina", refId: "checklist-cocina", name: "Cocina" },
  "exteriores": { id: "exteriores", refId: "checklist-exteriores", name: "Exteriores" },
};

/** Orden para initial check: Entorno y zonas comunes al final (debajo de Exteriores) */
const SECTION_ORDER_INITIAL = ["estado-general", "entrada-pasillos", "habitaciones", "salon", "banos", "cocina", "exteriores", "entorno-zonas-comunes"];
/** Orden para final check: Entorno y zonas comunes primero */
const SECTION_ORDER_FINAL = ["entorno-zonas-comunes", "estado-general", "entrada-pasillos", "habitaciones", "salon", "banos", "cocina", "exteriores"];

function getSectionConfigsOrdered(checklistType: string | undefined): { id: string; refId: string; name: string }[] {
  const order = checklistType === "reno_initial" ? SECTION_ORDER_INITIAL : SECTION_ORDER_FINAL;
  return order.map((id) => SECTION_CONFIGS_BY_ID[id]).filter(Boolean);
}

export function getFirstIncompleteSection(checklist: ChecklistData | null): { sectionId: string; sectionRefId: string; message: string } | null {
  if (!checklist) return null;

  const SECTION_CONFIGS = getSectionConfigsOrdered(checklist.checklistType);

  for (const sectionConfig of SECTION_CONFIGS) {
    const section = checklist.sections[sectionConfig.id];
    
    if (!section) {
      return {
        sectionId: sectionConfig.id,
        sectionRefId: sectionConfig.refId,
        message: `La sección "${sectionConfig.name}" no existe o no está inicializada.`,
      };
    }

    const isEntornoZonas = sectionConfig.id === "entorno-zonas-comunes";
    const uploadZonesToCheck = isEntornoZonas && section.uploadZones
      ? section.uploadZones.filter((z) => ENTORNO_ZONAS_REQUIRED_UPLOAD_IDS.includes(z.id))
      : section.uploadZones || [];
    const questionsToCheck = isEntornoZonas && section.questions
      ? section.questions.filter((q) => ENTORNO_ZONAS_REQUIRED_QUESTION_IDS.includes(q.id))
      : section.questions || [];

    // Verificar upload zones requeridos
    if (uploadZonesToCheck.length > 0) {
      for (const uploadZone of uploadZonesToCheck) {
        const hasPhotos = uploadZone.photos && uploadZone.photos.length > 0;
        const hasVideos = uploadZone.videos && uploadZone.videos.length > 0;
        if (!hasPhotos && !hasVideos) {
          return {
            sectionId: sectionConfig.id,
            sectionRefId: sectionConfig.refId,
            message: `Faltan fotos o videos en la sección "${sectionConfig.name}".`,
          };
        }
      }
    }

    // Verificar questions requeridas
    if (questionsToCheck.length > 0) {
      for (const question of questionsToCheck) {
        if (!hasQuestionData(question)) {
          return {
            sectionId: sectionConfig.id,
            sectionRefId: sectionConfig.refId,
            message: `Faltan preguntas por responder en la sección "${sectionConfig.name}".`,
          };
        }
      }
    }

    // Verificar dynamic items (habitaciones, banos)
    if (section.dynamicItems && section.dynamicItems.length > 0) {
      for (let i = 0; i < section.dynamicItems.length; i++) {
        const item = section.dynamicItems[i];
        
        // Verificar uploadZone del item dinámico
        if (item.uploadZone) {
          const hasPhotos = item.uploadZone.photos && item.uploadZone.photos.length > 0;
          const hasVideos = item.uploadZone.videos && item.uploadZone.videos.length > 0;
          if (!hasPhotos && !hasVideos) {
            const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
            return {
              sectionId: sectionConfig.id,
              sectionRefId: sectionConfig.refId,
              message: `Faltan fotos o videos en ${itemName} de la sección "${sectionConfig.name}".`,
            };
          }
        }

        // Verificar questions del item dinámico
        if (item.questions && item.questions.length > 0) {
          for (const q of item.questions) {
            if (!hasQuestionData(q)) {
              const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
              return {
                sectionId: sectionConfig.id,
                sectionRefId: sectionConfig.refId,
                message: `Faltan preguntas por responder en ${itemName} de la sección "${sectionConfig.name}".`,
              };
            }
          }
        }

        // Verificar carpentryItems con cantidad > 0
        if (item.carpentryItems && item.carpentryItems.length > 0) {
          const itemsWithQuantity = item.carpentryItems.filter(carpentry => (carpentry.cantidad || 0) > 0);
          for (const carpentry of itemsWithQuantity) {
            if (!hasElementData(carpentry)) {
              const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
              return {
                sectionId: sectionConfig.id,
                sectionRefId: sectionConfig.refId,
                message: `Falta seleccionar el estado de elementos en ${itemName} de la sección "${sectionConfig.name}".`,
              };
            }
            // Si tiene cantidad > 1, verificar units
            if (carpentry.cantidad > 1 && carpentry.units) {
              for (let unitIdx = 0; unitIdx < carpentry.units.length; unitIdx++) {
                if (!hasElementData(carpentry.units[unitIdx])) {
                  const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
                  return {
                    sectionId: sectionConfig.id,
                    sectionRefId: sectionConfig.refId,
                    message: `Falta seleccionar el estado de elementos en ${itemName} de la sección "${sectionConfig.name}".`,
                  };
                }
              }
            }
          }
        }

        // Verificar climatizationItems con cantidad > 0
        if (item.climatizationItems && item.climatizationItems.length > 0) {
          const itemsWithQuantity = item.climatizationItems.filter(climatization => (climatization.cantidad || 0) > 0);
          for (const climatization of itemsWithQuantity) {
            if (!hasElementData(climatization)) {
              const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
              return {
                sectionId: sectionConfig.id,
                sectionRefId: sectionConfig.refId,
                message: `Falta seleccionar el estado de elementos en ${itemName} de la sección "${sectionConfig.name}".`,
              };
            }
            if (climatization.cantidad > 1 && climatization.units) {
              for (let unitIdx = 0; unitIdx < climatization.units.length; unitIdx++) {
                if (!hasElementData(climatization.units[unitIdx])) {
                  const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
                  return {
                    sectionId: sectionConfig.id,
                    sectionRefId: sectionConfig.refId,
                    message: `Falta seleccionar el estado de elementos en ${itemName} de la sección "${sectionConfig.name}".`,
                  };
                }
              }
            }
          }
        }

        // Verificar mobiliario
        if (item.mobiliario?.existeMobiliario !== undefined) {
          if (item.mobiliario.existeMobiliario && item.mobiliario.question) {
            if (!hasQuestionData(item.mobiliario.question)) {
              const itemName = sectionConfig.id === "habitaciones" ? `Habitación ${i + 1}` : `Baño ${i + 1}`;
              return {
                sectionId: sectionConfig.id,
                sectionRefId: sectionConfig.refId,
                message: `Falta información sobre el mobiliario en ${itemName} de la sección "${sectionConfig.name}".`,
              };
            }
          }
        }
      }
    }

    // Verificar items con cantidad > 0 (carpentry, storage, appliances, climatization, security, systems)
    const itemTypes = [
      { key: 'carpentryItems', name: 'carpintería' },
      { key: 'storageItems', name: 'almacenamiento' },
      { key: 'appliancesItems', name: 'electrodomésticos' },
      { key: 'climatizationItems', name: 'climatización' },
      { key: 'securityItems', name: 'seguridad' },
      { key: 'systemsItems', name: 'sistemas' },
    ];

    for (const itemType of itemTypes) {
      const items = (section as any)[itemType.key];
      if (items && items.length > 0) {
        const itemsWithQuantity = items.filter((item: any) => (item.cantidad || 0) > 0);
        for (const item of itemsWithQuantity) {
          if (!hasElementData(item)) {
            return {
              sectionId: sectionConfig.id,
              sectionRefId: sectionConfig.refId,
              message: `Falta seleccionar el estado de elementos de ${itemType.name} en la sección "${sectionConfig.name}".`,
            };
          }
          if (item.cantidad > 1 && item.units) {
            for (let unitIdx = 0; unitIdx < item.units.length; unitIdx++) {
              if (!hasElementData(item.units[unitIdx])) {
                return {
                  sectionId: sectionConfig.id,
                  sectionRefId: sectionConfig.refId,
                  message: `Falta seleccionar el estado de elementos de ${itemType.name} en la sección "${sectionConfig.name}".`,
                };
              }
            }
          }
        }
      }
    }

    // Verificar mobiliario
    if (section.mobiliario?.existeMobiliario !== undefined) {
      if (section.mobiliario.existeMobiliario && section.mobiliario.question) {
        if (!hasQuestionData(section.mobiliario.question)) {
          return {
            sectionId: sectionConfig.id,
            sectionRefId: sectionConfig.refId,
            message: `Falta información sobre el mobiliario en la sección "${sectionConfig.name}".`,
          };
        }
      }
    }
  }

  return null; // Todas las secciones están completas
}
