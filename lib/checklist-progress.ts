import { ChecklistData, ChecklistSection, ChecklistQuestion, ChecklistUploadZone, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationItem } from "@/lib/checklist-storage";

/**
 * Calcula el progreso de una sección del checklist
 * Simplificado: cuenta grupos en lugar de campos individuales para facilitar llegar al 100%
 */
export function calculateSectionProgress(section: ChecklistSection | undefined): number {
  if (!section) return 0;

  let totalGroups = 0;
  let completedGroups = 0;

  // Grupo: Upload Zones (completo si al menos uno tiene fotos/videos)
  if (section.uploadZones && section.uploadZones.length > 0) {
    totalGroups++;
    const hasAnyPhotosOrVideos = section.uploadZones.some((zone: ChecklistUploadZone) => 
      (zone.photos && zone.photos.length > 0) || (zone.videos && zone.videos.length > 0)
    );
    if (hasAnyPhotosOrVideos) {
      completedGroups++;
    }
  }

  // Grupo: Questions (completo si todas tienen status)
  if (section.questions && section.questions.length > 0) {
    totalGroups++;
    const allQuestionsHaveStatus = section.questions.every((question: ChecklistQuestion) => 
      question.status !== undefined && question.status !== null
    );
    if (allQuestionsHaveStatus) {
      completedGroups++;
    }
  }

  // Dynamic Items (habitaciones, banos) - todos los dynamic items cuentan como grupos separados
  // Cada dynamic item tiene sus propios grupos internos
  if (section.dynamicItems && section.dynamicItems.length > 0) {
    section.dynamicItems.forEach((item: ChecklistDynamicItem) => {
      // Grupo: Upload zone del dynamic item
      if (item.uploadZone) {
        totalGroups++;
        const hasPhotosOrVideos = (item.uploadZone.photos && item.uploadZone.photos.length > 0) || 
                                  (item.uploadZone.videos && item.uploadZone.videos.length > 0);
        if (hasPhotosOrVideos) {
          completedGroups++;
        }
      }
      
      // Grupo: Questions del dynamic item
      if (item.questions && item.questions.length > 0) {
        totalGroups++;
        const allHaveStatus = item.questions.every((q: ChecklistQuestion) => 
          q.status !== undefined && q.status !== null
        );
        if (allHaveStatus) {
          completedGroups++;
        }
      }
      
      // Grupo: Carpentry items del dynamic item (solo si hay items con cantidad > 0)
      if (item.carpentryItems && item.carpentryItems.length > 0) {
        const itemsWithQuantity = item.carpentryItems.filter((carpentry: ChecklistCarpentryItem) => 
          carpentry.cantidad > 0
        );
        if (itemsWithQuantity.length > 0) {
          totalGroups++;
          const allHaveEstado = itemsWithQuantity.every((carpentry: ChecklistCarpentryItem) => {
            if (carpentry.estado) return true;
            if (carpentry.units && carpentry.units.length > 0) {
              return carpentry.units.every((u: any) => u.estado);
            }
            return false;
          });
          if (allHaveEstado) {
            completedGroups++;
          }
        }
      }
      
      // Grupo: Climatization items del dynamic item (solo si hay items con cantidad > 0)
      if (item.climatizationItems && item.climatizationItems.length > 0) {
        const itemsWithQuantity = item.climatizationItems.filter((clim: ChecklistClimatizationItem) => 
          clim.cantidad > 0
        );
        if (itemsWithQuantity.length > 0) {
          totalGroups++;
          const allHaveEstado = itemsWithQuantity.every((clim: ChecklistClimatizationItem) => {
            if (clim.estado) return true;
            if (clim.units && clim.units.length > 0) {
              return clim.units.every((u: any) => u.estado);
            }
            return false;
          });
          if (allHaveEstado) {
            completedGroups++;
          }
        }
      }
      
      // Grupo: Mobiliario del dynamic item
      if (item.mobiliario) {
        totalGroups++;
        if (item.mobiliario.existeMobiliario === false || 
            (item.mobiliario.existeMobiliario === true && item.mobiliario.question?.status)) {
          completedGroups++;
        }
      }
    });
  }

  // Grupo: Carpentry Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.carpentryItems && section.carpentryItems.length > 0) {
    const itemsWithQuantity = section.carpentryItems.filter((carpentry: ChecklistCarpentryItem) => 
      carpentry.cantidad > 0
    );
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((carpentry: ChecklistCarpentryItem) => {
        if (carpentry.estado) return true;
        if (carpentry.units && carpentry.units.length > 0) {
          return carpentry.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Climatization Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.climatizationItems && section.climatizationItems.length > 0) {
    const itemsWithQuantity = section.climatizationItems.filter((clim: ChecklistClimatizationItem) => 
      clim.cantidad > 0
    );
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((clim: ChecklistClimatizationItem) => {
        if (clim.estado) return true;
        if (clim.units && clim.units.length > 0) {
          return clim.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Storage Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.storageItems && section.storageItems.length > 0) {
    const itemsWithQuantity = section.storageItems.filter((storage: any) => storage.cantidad > 0);
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((storage: any) => {
        if (storage.estado) return true;
        if (storage.units && storage.units.length > 0) {
          return storage.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Appliances Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.appliancesItems && section.appliancesItems.length > 0) {
    const itemsWithQuantity = section.appliancesItems.filter((appliance: any) => appliance.cantidad > 0);
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((appliance: any) => {
        if (appliance.estado) return true;
        if (appliance.units && appliance.units.length > 0) {
          return appliance.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Security Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.securityItems && section.securityItems.length > 0) {
    const itemsWithQuantity = section.securityItems.filter((security: any) => security.cantidad > 0);
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((security: any) => {
        if (security.estado) return true;
        if (security.units && security.units.length > 0) {
          return security.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Systems Items (completo si todos los items con cantidad > 0 tienen estado)
  if (section.systemsItems && section.systemsItems.length > 0) {
    const itemsWithQuantity = section.systemsItems.filter((system: any) => system.cantidad > 0);
    if (itemsWithQuantity.length > 0) {
      totalGroups++;
      const allHaveEstado = itemsWithQuantity.every((system: any) => {
        if (system.estado) return true;
        if (system.units && system.units.length > 0) {
          return system.units.every((u: any) => u.estado);
        }
        return false;
      });
      if (allHaveEstado) {
        completedGroups++;
      }
    }
  }

  // Grupo: Mobiliario (completo si existeMobiliario === false O tiene question.status)
  if (section.mobiliario) {
    totalGroups++;
    if (section.mobiliario.existeMobiliario === false || 
        (section.mobiliario.existeMobiliario === true && section.mobiliario.question?.status)) {
      completedGroups++;
    }
  }

  if (totalGroups === 0) return 0;
  return Math.round((completedGroups / totalGroups) * 100);
}

/**
 * Calcula el progreso general del checklist
 * Calcula el promedio de TODAS las secciones, incluyendo las que tienen 0%
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
      // Incluir TODAS las secciones en el cálculo, incluso las que tienen 0%
      progressValues.push(progress);
    } else {
      // Si la sección no existe, contar como 0%
      progressValues.push(0);
    }
  });

  if (progressValues.length === 0) return 0;

  // Calcular el promedio de todas las secciones
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

