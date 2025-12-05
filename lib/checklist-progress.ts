import { ChecklistData, ChecklistSection, ChecklistQuestion, ChecklistUploadZone, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationItem } from "@/lib/checklist-storage";

/**
 * Calcula el progreso de una sección del checklist
 */
export function calculateSectionProgress(section: ChecklistSection | undefined): number {
  if (!section) return 0;

  let totalFields = 0;
  let completedFields = 0;

  // Upload Zones (required)
  if (section.uploadZones && section.uploadZones.length > 0) {
    section.uploadZones.forEach((zone: ChecklistUploadZone) => {
      totalFields++;
      if (zone.photos && zone.photos.length > 0 || zone.videos && zone.videos.length > 0) {
        completedFields++;
      }
    });
  }

  // Questions (must have status)
  if (section.questions && section.questions.length > 0) {
    section.questions.forEach((question: ChecklistQuestion) => {
      totalFields++;
      if (question.status) {
        completedFields++;
      }
    });
  }

  // Dynamic Items (habitaciones, banos)
  if (section.dynamicItems && section.dynamicItems.length > 0) {
    section.dynamicItems.forEach((item: ChecklistDynamicItem) => {
      // Upload zone
      if (item.uploadZone) {
        totalFields++;
        if (item.uploadZone.photos && item.uploadZone.photos.length > 0 || 
            item.uploadZone.videos && item.uploadZone.videos.length > 0) {
          completedFields++;
        }
      }
      // Questions
      if (item.questions && item.questions.length > 0) {
        item.questions.forEach((q: ChecklistQuestion) => {
          totalFields++;
          if (q.status) {
            completedFields++;
          }
        });
      }
      // Carpentry items
      if (item.carpentryItems && item.carpentryItems.length > 0) {
        item.carpentryItems.forEach((carpentry: ChecklistCarpentryItem) => {
          if (carpentry.cantidad > 0) {
            totalFields++;
            if (carpentry.estado || (carpentry.units && carpentry.units.length > 0 && 
                carpentry.units.every((u: any) => u.estado))) {
              completedFields++;
            }
          }
        });
      }
      // Climatization items
      if (item.climatizationItems && item.climatizationItems.length > 0) {
        item.climatizationItems.forEach((clim: ChecklistClimatizationItem) => {
          if (clim.cantidad > 0) {
            totalFields++;
            if (clim.estado || (clim.units && clim.units.length > 0 && 
                clim.units.every((u: any) => u.estado))) {
              completedFields++;
            }
          }
        });
      }
      // Mobiliario
      if (item.mobiliario) {
        totalFields++;
        if (item.mobiliario.existeMobiliario && item.mobiliario.question?.status) {
          completedFields++;
        } else if (item.mobiliario.existeMobiliario === false) {
          completedFields++;
        }
      }
    });
  }

  // Carpentry Items (for sections like Cocina, Salon)
  if (section.carpentryItems && section.carpentryItems.length > 0) {
    section.carpentryItems.forEach((carpentry: ChecklistCarpentryItem) => {
      if (carpentry.cantidad > 0) {
        totalFields++;
        if (carpentry.estado || (carpentry.units && carpentry.units.length > 0 && 
            carpentry.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Climatization Items (for sections like Estado General, Salon)
  if (section.climatizationItems && section.climatizationItems.length > 0) {
    section.climatizationItems.forEach((clim: ChecklistClimatizationItem) => {
      if (clim.cantidad > 0) {
        totalFields++;
        if (clim.estado || (clim.units && clim.units.length > 0 && 
            clim.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Storage Items (Cocina)
  if (section.storageItems && section.storageItems.length > 0) {
    section.storageItems.forEach((storage: any) => {
      if (storage.cantidad > 0) {
        totalFields++;
        if (storage.estado || (storage.units && storage.units.length > 0 && 
            storage.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Appliances Items (Cocina)
  if (section.appliancesItems && section.appliancesItems.length > 0) {
    section.appliancesItems.forEach((appliance: any) => {
      if (appliance.cantidad > 0) {
        totalFields++;
        if (appliance.estado || (appliance.units && appliance.units.length > 0 && 
            appliance.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Security Items (Exteriores)
  if (section.securityItems && section.securityItems.length > 0) {
    section.securityItems.forEach((security: any) => {
      if (security.cantidad > 0) {
        totalFields++;
        if (security.estado || (security.units && security.units.length > 0 && 
            security.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Systems Items (Exteriores)
  if (section.systemsItems && section.systemsItems.length > 0) {
    section.systemsItems.forEach((system: any) => {
      if (system.cantidad > 0) {
        totalFields++;
        if (system.estado || (system.units && system.units.length > 0 && 
            system.units.every((u: any) => u.estado))) {
          completedFields++;
        }
      }
    });
  }

  // Mobiliario (for sections like Salon)
  if (section.mobiliario) {
    totalFields++;
    if (section.mobiliario.existeMobiliario && section.mobiliario.question?.status) {
      completedFields++;
    } else if (section.mobiliario.existeMobiliario === false) {
      completedFields++;
    }
  }

  if (totalFields === 0) return 0;
  return Math.round((completedFields / totalFields) * 100);
}

/**
 * Calcula el progreso general del checklist
 */
export function calculateOverallChecklistProgress(checklist: ChecklistData | null): number {
  if (!checklist || !checklist.sections) return 0;

  const sectionIds = [
    "entorno-zonas-comunes",
    "estado-general",
    "entrada-pasillos",
    "habitaciones",
    "salon",
    "banos",
    "cocina",
    "exteriores",
  ];

  const progressValues: number[] = [];

  sectionIds.forEach((sectionId) => {
    const section = checklist.sections[sectionId];
    if (section) {
      const progress = calculateSectionProgress(section);
      if (progress > 0) {
        progressValues.push(progress);
      }
    }
  });

  if (progressValues.length === 0) return 0;

  const average = progressValues.reduce((sum, prog) => sum + prog, 0) / progressValues.length;
  return Math.round(average);
}

/**
 * Obtiene el progreso de todas las secciones del checklist
 */
export function getAllChecklistSectionsProgress(checklist: ChecklistData | null): Record<string, number> {
  if (!checklist || !checklist.sections) return {};

  const sectionIds = [
    "entorno-zonas-comunes",
    "estado-general",
    "entrada-pasillos",
    "habitaciones",
    "salon",
    "banos",
    "cocina",
    "exteriores",
  ];

  const progress: Record<string, number> = {};

  sectionIds.forEach((sectionId) => {
    const section = checklist.sections[sectionId];
    progress[sectionId] = calculateSectionProgress(section);
  });

  return progress;
}

