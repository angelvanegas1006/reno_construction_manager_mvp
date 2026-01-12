import { ChecklistData, ChecklistStatus, ChecklistSection, FileUpload } from '@/lib/checklist-storage';

/**
 * Helper para obtener el label traducido de un elemento
 */
function getTranslatedLabel(
  translations: any,
  sectionId: string,
  category: string,
  itemId: string
): string {
  const section = translations.checklist?.sections?.[sectionId];
  if (!section) {
    const words = itemId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return words.join(' ');
  }

  const categoryMap: Record<string, string> = {
    carpinteria: 'carpinteria',
    climatizacion: 'climatizacion',
    almacenamiento: 'almacenamiento',
    electrodomesticos: 'electrodomesticos',
    seguridad: 'seguridad',
    sistemas: 'sistemas',
  };

  const categoryPath = categoryMap[category];
  if (categoryPath && section[categoryPath]?.items?.[itemId]) {
    return section[categoryPath].items[itemId];
  }

  if (section[category]?.items?.[itemId]) {
    return section[category].items[itemId];
  }

  const words = itemId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de una pregunta
 */
function getQuestionLabel(
  translations: any,
  sectionId: string,
  questionId: string
): string {
  const section = translations.checklist?.sections?.[sectionId];
  if (!section) {
    const words = questionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return words.join(' ');
  }

  const questionPaths = [
    section[questionId]?.title,
    section.questions?.[questionId],
    section[questionId],
  ];

  for (const path of questionPaths) {
    if (path) return path;
  }

  if (questionId.includes('acabados') && section.acabados?.title) {
    return section.acabados.title;
  }
  if (questionId.includes('electricidad') && section.electricidad?.title) {
    return section.electricidad.title;
  }

  const words = questionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de un upload zone
 */
function getUploadZoneLabel(
  translations: any,
  sectionId: string,
  zoneId: string
): string {
  let cleanId = zoneId.replace(/^[0-9]+=/, '').replace(/^fotos-/, '').replace(/^video-/, '');
  
  const section = translations.checklist?.sections?.[sectionId];
  if (section?.uploadZones?.[zoneId]) {
    return section.uploadZones[zoneId];
  }

  const words = cleanId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de estado traducido
 */
function getStatusLabel(status: string | undefined, translations: any): string {
  if (!status) return 'Buen estado';
  
  const statusMap: Record<string, string> = {
    buen_estado: 'Buen estado',
    necesita_reparacion: 'Necesita reparación',
    necesita_reemplazo: 'Necesita reemplazo',
    no_aplica: 'No aplica',
  };

  return statusMap[status] || 'Buen estado';
}

/**
 * Helper para obtener las clases CSS del badge según el estado
 */
function getStatusBadgeClasses(status: string | undefined): string {
  if (!status) {
    return 'bg-green-50 text-green-800 border-green-200';
  }
  
  const statusClasses: Record<string, string> = {
    buen_estado: 'bg-green-50 text-green-800 border-green-200',
    necesita_reparacion: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    necesita_reemplazo: 'bg-red-50 text-red-800 border-red-200',
    no_aplica: 'bg-gray-50 text-gray-800 border-gray-200',
  };

  return statusClasses[status] || statusClasses.buen_estado;
}

/**
 * Helper para escapar HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Interfaz para imágenes con metadata
 */
interface ImageWithMetadata {
  url: string;
  label?: string;
  notes?: string;
  source: 'uploadZone' | 'question' | 'item' | 'dynamicItem';
}

/**
 * Recolecta todas las imágenes de una sección
 */
function collectSectionImages(
  section: ChecklistSection,
  sectionId: string,
  translations: any
): ImageWithMetadata[] {
  const images: ImageWithMetadata[] = [];

  // Imágenes de upload zones
  if (section.uploadZones) {
    for (const zone of section.uploadZones) {
      if (zone.photos && zone.photos.length > 0) {
        const zoneLabel = getUploadZoneLabel(translations, sectionId, zone.id);
        for (const photo of zone.photos) {
          if (photo.data) {
            images.push({
              url: photo.data,
              label: zoneLabel,
              source: 'uploadZone',
            });
          }
        }
      }
    }
  }

  // Imágenes de questions
  if (section.questions) {
    for (const question of section.questions) {
      if (question.photos && question.photos.length > 0) {
        const questionLabel = getQuestionLabel(translations, sectionId, question.id);
        for (const photo of question.photos) {
          if (photo.data) {
            images.push({
              url: photo.data,
              label: questionLabel,
              notes: question.notes,
              source: 'question',
            });
          }
        }
      }
    }
  }

  // Imágenes de items (carpentry, climatization, etc.)
  const itemCategories = [
    'carpentryItems',
    'climatizationItems',
    'storageItems',
    'appliancesItems',
    'securityItems',
    'systemsItems',
  ];

  for (const categoryKey of itemCategories) {
    const items = (section as any)[categoryKey];
    if (!items || !Array.isArray(items)) continue;

    for (const item of items) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(
        translations,
        sectionId,
        categoryKey.replace('Items', ''),
        item.id
      );

      // Si tiene unidades, recolectar fotos de cada unidad
      if (item.units && Array.isArray(item.units)) {
        for (const unit of item.units) {
          if (unit.photos && unit.photos.length > 0) {
            for (const photo of unit.photos) {
              if (photo.data) {
                images.push({
                  url: photo.data,
                  label: `${itemLabel} ${unit.id || ''}`,
                  notes: unit.notes,
                  source: 'item',
                });
              }
            }
          }
        }
      } else {
        // Si no tiene unidades, usar fotos del item directamente
        if (item.photos && item.photos.length > 0) {
          for (const photo of item.photos) {
            if (photo.data) {
              images.push({
                url: photo.data,
                label: itemLabel,
                notes: item.notes,
                source: 'item',
              });
            }
          }
        }
      }
    }
  }

  // Imágenes de dynamic items (habitaciones, baños)
  if (section.dynamicItems) {
    for (const dynamicItem of section.dynamicItems) {
      // Upload zone del dynamic item
      if (dynamicItem.uploadZone?.photos) {
        for (const photo of dynamicItem.uploadZone.photos) {
          if (photo.data) {
            images.push({
              url: photo.data,
              label: dynamicItem.id,
              source: 'dynamicItem',
            });
          }
        }
      }

      // Questions del dynamic item
      if (dynamicItem.questions) {
        for (const question of dynamicItem.questions) {
          if (question.photos && question.photos.length > 0) {
            for (const photo of question.photos) {
              if (photo.data) {
                images.push({
                  url: photo.data,
                  label: `${dynamicItem.id} - ${question.id}`,
                  notes: question.notes,
                  source: 'dynamicItem',
                });
              }
            }
          }
        }
      }

      // Items del dynamic item (carpentry)
      if (dynamicItem.carpentryItems) {
        for (const item of dynamicItem.carpentryItems) {
          if (!item.cantidad || item.cantidad === 0) continue;
          
          const itemLabel = getTranslatedLabel(translations, sectionId, 'carpinteria', item.id);
          
          // Si tiene unidades, recolectar fotos de cada unidad
          if (item.units && Array.isArray(item.units)) {
            for (const unit of item.units) {
              if (unit.photos && unit.photos.length > 0) {
                for (const photo of unit.photos) {
                  if (photo.data) {
                    images.push({
                      url: photo.data,
                      label: `${dynamicItem.id} - ${itemLabel} ${unit.id || ''}`,
                      notes: unit.notes || item.notes,
                      source: 'dynamicItem',
                    });
                  }
                }
              }
            }
          } else {
            // Si no tiene unidades, usar fotos del item directamente
            if (item.photos && item.photos.length > 0) {
              for (const photo of item.photos) {
                if (photo.data) {
                  images.push({
                    url: photo.data,
                    label: `${dynamicItem.id} - ${itemLabel}`,
                    notes: item.notes,
                    source: 'dynamicItem',
                  });
                }
              }
            }
          }
        }
      }

      // Items del dynamic item (climatization)
      if (dynamicItem.climatizationItems) {
        for (const item of dynamicItem.climatizationItems) {
          if (!item.cantidad || item.cantidad === 0) continue;
          
          const itemLabel = getTranslatedLabel(translations, sectionId, 'climatizacion', item.id);
          
          // Si tiene unidades, recolectar fotos de cada unidad
          if (item.units && Array.isArray(item.units)) {
            for (const unit of item.units) {
              if (unit.photos && unit.photos.length > 0) {
                for (const photo of unit.photos) {
                  if (photo.data) {
                    images.push({
                      url: photo.data,
                      label: `${dynamicItem.id} - ${itemLabel} ${unit.id || ''}`,
                      notes: unit.notes || item.notes,
                      source: 'dynamicItem',
                    });
                  }
                }
              }
            }
          } else {
            // Si no tiene unidades, usar fotos del item directamente
            if (item.photos && item.photos.length > 0) {
              for (const photo of item.photos) {
                if (photo.data) {
                  images.push({
                    url: photo.data,
                    label: `${dynamicItem.id} - ${itemLabel}`,
                    notes: item.notes,
                    source: 'dynamicItem',
                  });
                }
              }
            }
          }
        }
      }

      // Mobiliario del dynamic item
      if (dynamicItem.mobiliario?.existeMobiliario && dynamicItem.mobiliario.question) {
        if (dynamicItem.mobiliario.question.photos && dynamicItem.mobiliario.question.photos.length > 0) {
          for (const photo of dynamicItem.mobiliario.question.photos) {
            if (photo.data) {
              images.push({
                url: photo.data,
                label: `${dynamicItem.id} - Mobiliario`,
                notes: dynamicItem.mobiliario.question.notes,
                source: 'dynamicItem',
              });
            }
          }
        }
      }
    }
  }

  // Mobiliario de la sección (no dinámico)
  if (section.mobiliario?.existeMobiliario && section.mobiliario.question) {
    if (section.mobiliario.question.photos && section.mobiliario.question.photos.length > 0) {
      const mobiliarioLabel = translations.checklist?.sections?.[sectionId]?.mobiliario?.existeMobiliario || 'Mobiliario';
      for (const photo of section.mobiliario.question.photos) {
        if (photo.data) {
          images.push({
            url: photo.data,
            label: mobiliarioLabel,
            notes: section.mobiliario.question.notes,
            source: 'question',
          });
        }
      }
    }
  }

  return images;
}

/**
 * Interfaz para elementos agrupados por categoría
 */
interface CategorizedElement {
  id: string;
  label: string;
  status?: ChecklistStatus;
  notes?: string;
  category: string;
  type: 'question' | 'item' | 'uploadZone';
}

/**
 * Agrupa elementos de una sección por categoría
 */
function groupElementsByCategory(
  section: ChecklistSection,
  sectionId: string,
  translations: any
): Record<string, CategorizedElement[]> {
  const categorized: Record<string, CategorizedElement[]> = {};

  // Helper para agregar elemento a categoría
  const addToCategory = (category: string, element: CategorizedElement) => {
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(element);
  };

  // Questions - mapear a categorías según su ID
  if (section.questions) {
    for (const question of section.questions) {
      const questionLabel = getQuestionLabel(translations, sectionId, question.id);
      const questionId = question.id.toLowerCase();

      let category = 'Otros';
      if (questionId.includes('acabados') || questionId.includes('finishes')) {
        category = 'Acabados';
      } else if (questionId.includes('comunicaciones') || questionId.includes('communications')) {
        category = 'Comunicaciones';
      } else if (questionId.includes('electricidad') || questionId.includes('electricity')) {
        category = 'Electricidad';
      }

      addToCategory(category, {
        id: question.id,
        label: questionLabel,
        status: question.status,
        notes: question.notes,
        category,
        type: 'question',
      });
    }
  }

  // Carpentry items
  if (section.carpentryItems) {
    for (const item of section.carpentryItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'carpinteria', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        // Si tiene unidades, crear un elemento por unidad
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Carpintería', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Carpintería',
            type: 'item',
          });
        }
      } else {
        addToCategory('Carpintería', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Carpintería',
          type: 'item',
        });
      }
    }
  }

  // Climatization items
  if (section.climatizationItems) {
    for (const item of section.climatizationItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'climatizacion', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Climatización', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Climatización',
            type: 'item',
          });
        }
      } else {
        addToCategory('Climatización', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Climatización',
          type: 'item',
        });
      }
    }
  }

  // Storage items
  if (section.storageItems) {
    for (const item of section.storageItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'almacenamiento', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Almacenamiento', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Almacenamiento',
            type: 'item',
          });
        }
      } else {
        addToCategory('Almacenamiento', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Almacenamiento',
          type: 'item',
        });
      }
    }
  }

  // Appliances items
  if (section.appliancesItems) {
    for (const item of section.appliancesItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'electrodomesticos', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Electrodomésticos', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Electrodomésticos',
            type: 'item',
          });
        }
      } else {
        addToCategory('Electrodomésticos', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Electrodomésticos',
          type: 'item',
        });
      }
    }
  }

  // Security items
  if (section.securityItems) {
    for (const item of section.securityItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'seguridad', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Seguridad', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Seguridad',
            type: 'item',
          });
        }
      } else {
        addToCategory('Seguridad', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Seguridad',
          type: 'item',
        });
      }
    }
  }

  // Systems items
  if (section.systemsItems) {
    for (const item of section.systemsItems) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(translations, sectionId, 'sistemas', item.id);
      const status = item.estado || (item.units && item.units[0]?.estado);

      if (item.units && item.units.length > 0) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          addToCategory('Sistemas', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Sistemas',
            type: 'item',
          });
        }
      } else {
        addToCategory('Sistemas', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Sistemas',
          type: 'item',
        });
      }
    }
  }

  // Mobiliario de la sección (no dinámico)
  if (section.mobiliario?.existeMobiliario && section.mobiliario.question) {
    const mobiliarioLabel = translations.checklist?.sections?.[sectionId]?.mobiliario?.existeMobiliario || 'Mobiliario';
    addToCategory('Mobiliario', {
      id: 'mobiliario',
      label: mobiliarioLabel,
      status: section.mobiliario.question.status,
      notes: section.mobiliario.question.notes,
      category: 'Mobiliario',
      type: 'question',
    });
  }

  return categorized;
}

/**
 * Recolecta todas las notas de una sección para el modal
 */
function collectSectionNotes(
  section: ChecklistSection,
  sectionId: string,
  translations: any
): string[] {
  const notes: string[] = [];

  // Notes de questions
  if (section.questions) {
    for (const question of section.questions) {
      if (question.notes && question.notes.trim()) {
        const questionLabel = getQuestionLabel(translations, sectionId, question.id);
        notes.push(`${questionLabel}: ${question.notes}`);
      }
    }
  }

  // Notes de items
  const itemCategories = [
    'carpentryItems',
    'climatizationItems',
    'storageItems',
    'appliancesItems',
    'securityItems',
    'systemsItems',
  ];

  for (const categoryKey of itemCategories) {
    const items = (section as any)[categoryKey];
    if (!items || !Array.isArray(items)) continue;

    for (const item of items) {
      if (!item.cantidad || item.cantidad === 0) continue;

      const itemLabel = getTranslatedLabel(
        translations,
        sectionId,
        categoryKey.replace('Items', ''),
        item.id
      );

      if (item.units && Array.isArray(item.units)) {
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          if (unit.notes && unit.notes.trim()) {
            notes.push(`${itemLabel} ${i + 1}: ${unit.notes}`);
          }
        }
      } else if (item.notes && item.notes.trim()) {
        notes.push(`${itemLabel}: ${item.notes}`);
      }
    }
  }

  // Notes de dynamic items
  if (section.dynamicItems) {
    for (const dynamicItem of section.dynamicItems) {
      if (dynamicItem.questions) {
        for (const question of dynamicItem.questions) {
          if (question.notes && question.notes.trim()) {
            notes.push(`${dynamicItem.id} - ${question.id}: ${question.notes}`);
          }
        }
      }

      // Notes de items de dynamic items (carpentry, climatization)
      if (dynamicItem.carpentryItems) {
        for (const item of dynamicItem.carpentryItems) {
          if (!item.cantidad || item.cantidad === 0) continue;
          
          if (item.units && Array.isArray(item.units)) {
            for (let i = 0; i < item.units.length; i++) {
              const unit = item.units[i];
              if (unit.notes && unit.notes.trim()) {
                notes.push(`${dynamicItem.id} - ${item.id} ${i + 1}: ${unit.notes}`);
              }
            }
          } else if (item.notes && item.notes.trim()) {
            notes.push(`${dynamicItem.id} - ${item.id}: ${item.notes}`);
          }
        }
      }

      if (dynamicItem.climatizationItems) {
        for (const item of dynamicItem.climatizationItems) {
          if (!item.cantidad || item.cantidad === 0) continue;
          
          if (item.units && Array.isArray(item.units)) {
            for (let i = 0; i < item.units.length; i++) {
              const unit = item.units[i];
              if (unit.notes && unit.notes.trim()) {
                notes.push(`${dynamicItem.id} - ${item.id} ${i + 1}: ${unit.notes}`);
              }
            }
          } else if (item.notes && item.notes.trim()) {
            notes.push(`${dynamicItem.id} - ${item.id}: ${item.notes}`);
          }
        }
      }

      // Notes de mobiliario en dynamic items
      if (dynamicItem.mobiliario?.existeMobiliario && dynamicItem.mobiliario.question) {
        if (dynamicItem.mobiliario.question.notes && dynamicItem.mobiliario.question.notes.trim()) {
          notes.push(`${dynamicItem.id} - Mobiliario: ${dynamicItem.mobiliario.question.notes}`);
        }
      }
    }
  }

  // Notes de mobiliario de la sección (no dinámico)
  if (section.mobiliario?.existeMobiliario && section.mobiliario.question) {
    if (section.mobiliario.question.notes && section.mobiliario.question.notes.trim()) {
      notes.push(`Mobiliario: ${section.mobiliario.question.notes}`);
    }
  }

  return notes;
}

/**
 * Genera HTML estático del checklist completo con nuevo diseño Figma
 */
export async function generateChecklistHTML(
  checklist: ChecklistData,
  propertyInfo: {
    address: string;
    propertyId: string;
    renovatorName?: string;
    driveFolderUrl?: string;
  },
  translations: any,
  checklistType?: 'initial' | 'final'
): Promise<string> {
  console.log('[generateChecklistHTML] 📋 Generating HTML with:', {
    propertyId: propertyInfo.propertyId,
    hasDriveFolderUrl: !!propertyInfo.driveFolderUrl,
    sectionsCount: Object.keys(checklist.sections || {}).length,
  });

  const completedDate = checklist.completedAt
    ? new Date(checklist.completedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  // Mapeo de títulos de sección
  const sectionTitleMap: Record<string, string> = {
    'entorno-zonas-comunes': 'Entorno y Zonas Comunes',
    'estado-general': 'Estado General',
    'entrada-pasillos': 'Entrada y Pasillos de la Vivienda',
    'habitaciones': 'Habitaciones',
    'salon': 'Salón',
    'banos': 'Baños',
    'cocina': 'Cocina',
    'exteriores': 'Exteriores de la Vivienda',
  };

  const sectionOrder = [
    'entorno-zonas-comunes',
    'estado-general',
    'entrada-pasillos',
    'habitaciones',
    'salon',
    'banos',
    'cocina',
    'exteriores',
  ];

  // Determinar el tipo de checklist (inicial o final)
  // Prioridad: parámetro explícito > checklist.checklistType > inferir desde checklistType
  let checklistTypeLabel: 'initial' | 'final';
  if (checklistType) {
    checklistTypeLabel = checklistType;
  } else if (checklist.checklistType === 'reno_initial') {
    checklistTypeLabel = 'initial';
  } else if (checklist.checklistType === 'reno_final') {
    checklistTypeLabel = 'final';
  } else {
    // Fallback: intentar inferir desde el nombre del tipo
    const typeStr = String(checklist.checklistType || '').toLowerCase();
    checklistTypeLabel = typeStr.includes('initial') || typeStr.includes('inicial') ? 'initial' : 'final';
  }

  // Generar HTML base
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Informe de Propiedad - Checklist ${checklistTypeLabel === 'initial' ? 'Inicial' : 'Final'}</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: #F8FAFC;
  color: #1E293B;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background: #141D57;
  color: white;
  padding: 30px 20px;
  margin-bottom: 30px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
}

.header p {
  font-size: 14px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.property-info {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.property-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.property-info-item {
  display: flex;
  flex-direction: column;
}

.property-info-label {
  font-size: 12px;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.property-info-value {
  font-size: 16px;
  font-weight: 500;
  color: #1E293B;
}

.section-container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #E2E8F0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #1E293B;
}

.see-all-images-link {
  color: #3B82F6;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.see-all-images-link:hover {
  color: #2563EB;
}

.section-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

@media (max-width: 768px) {
  .section-content {
    grid-template-columns: 1fr;
  }
}

/* Image Carousel */
.image-carousel {
  position: relative;
  width: 100%;
}

.carousel-container {
  position: relative;
  width: 100%;
  min-height: 400px;
  overflow: hidden;
  border-radius: 8px;
  background: #F1F5F9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.carousel-images-group {
  display: none;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.carousel-images-group.active {
  display: flex;
}

.carousel-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.carousel-image.single {
  height: 400px;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #1E293B;
  transition: background 0.2s;
  z-index: 10;
}

.carousel-nav:hover {
  background: white;
}

.carousel-nav.prev {
  left: 10px;
}

.carousel-nav.next {
  right: 10px;
}

.carousel-counter {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
}

/* Conditions List */
.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-group {
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 15px;
}

.category-group:last-child {
  border-bottom: none;
}

.category-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  gap: 15px;
}

.condition-label {
  flex: 1;
  font-size: 14px;
  color: #1E293B;
  font-weight: 500;
}

.condition-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}

.condition-notes {
  margin-top: 8px;
  font-size: 13px;
  color: #64748B;
  line-height: 1.5;
}

.condition-item-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Modal */
.modal-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  overflow-y: auto;
  padding: 20px;
}

.modal-overlay.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 30px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #E2E8F0;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748B;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #F1F5F9;
}

.modal-main-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 20px;
  background: #F1F5F9;
}

.modal-observations {
  margin-bottom: 20px;
}

.modal-observations-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 10px;
}

.modal-observations-text {
  font-size: 14px;
  color: #64748B;
  line-height: 1.6;
}

.modal-thumbnails {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px 0;
}

.modal-thumbnail {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
  flex-shrink: 0;
}

.modal-thumbnail:hover {
  border-color: #3B82F6;
}

.modal-thumbnail.active {
  border-color: #3B82F6;
}

.modal-done-button {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-done-button:hover {
  background: #2563EB;
}

/* Dynamic sections (Habitaciones, Baños) */
.dynamic-section {
  margin-bottom: 30px;
}

.dynamic-section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 20px;
}
</style>
</head>
<body>
<div class="container">
<header class="header">
<div class="header-content">
<h1>Informe de Propiedad</h1>
<p>Checklist ${checklistTypeLabel === 'initial' ? 'Inicial' : 'Final'}</p>
</div>
</header>

<div class="property-info">
<div class="property-info-grid">
<div class="property-info-item">
<div class="property-info-label">Dirección</div>
<div class="property-info-value">${escapeHtml(propertyInfo.address)}</div>
</div>
<div class="property-info-item">
<div class="property-info-label">ID Propiedad</div>
<div class="property-info-value">${escapeHtml(propertyInfo.propertyId)}</div>
</div>
<div class="property-info-item">
<div class="property-info-label">Fecha de Inspección</div>
<div class="property-info-value">${escapeHtml(completedDate)}</div>
</div>`;

  if (propertyInfo.driveFolderUrl && propertyInfo.driveFolderUrl.trim().length > 0) {
    html += `
<div class="property-info-item">
<div class="property-info-label">Carpeta de Drive</div>
<div class="property-info-value">
<a href="${escapeHtml(propertyInfo.driveFolderUrl)}" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; text-decoration: none;">
Abrir carpeta en Google Drive →
</a>
</div>
</div>`;
  }

  html += `</div>
</div>`;

  // Generar secciones
  for (const sectionId of sectionOrder) {
    const section = checklist.sections[sectionId];
    if (!section) continue;

    const sectionTitle = sectionTitleMap[sectionId] || sectionId;

    // Para secciones dinámicas (habitaciones, baños), crear una sección por cada item
    if (section.dynamicItems && section.dynamicItems.length > 0) {
      for (const dynamicItem of section.dynamicItems) {
        const itemNumber = dynamicItem.id.match(/\d+/)?.[0] || '';
        const itemLabel = sectionId === 'habitaciones'
          ? `Habitación ${itemNumber}`
          : sectionId === 'banos'
          ? `Baño ${itemNumber}`
          : dynamicItem.id;

        // Crear sección para este dynamic item
        const dynamicSection: ChecklistSection = {
          id: dynamicItem.id,
          uploadZones: dynamicItem.uploadZone ? [dynamicItem.uploadZone] : undefined,
          questions: dynamicItem.questions,
          carpentryItems: dynamicItem.carpentryItems,
          climatizationItems: dynamicItem.climatizationItems,
          mobiliario: dynamicItem.mobiliario,
        };

        html += generateSectionHTML(
          dynamicSection,
          itemLabel,
          `dynamic-${dynamicItem.id}`,
          translations
        );
      }
    } else {
      // Sección normal
      html += generateSectionHTML(section, sectionTitle, sectionId, translations);
    }
  }

  // JavaScript para carrusel y modal
        html += `
<script>
// Carrusel functionality
function initCarousel(sectionId) {
  const carousel = document.querySelector(\`#carousel-\${sectionId}\`);
  if (!carousel) return;

  const imageGroups = carousel.querySelectorAll('.carousel-images-group');
  const prevBtn = carousel.querySelector('.carousel-nav.prev');
  const nextBtn = carousel.querySelector('.carousel-nav.next');
  const counter = carousel.querySelector('.carousel-counter');

  if (imageGroups.length === 0) return;

  let currentGroupIndex = 0;
  const imagesPerGroup = 2;
  const totalImages = parseInt(carousel.getAttribute('data-total-images') || '0');

  function showGroup(groupIndex) {
    imageGroups.forEach((group, i) => {
      group.classList.toggle('active', i === groupIndex);
    });
    if (counter && totalImages > 0) {
      const startImage = groupIndex * imagesPerGroup + 1;
      const endImage = Math.min((groupIndex + 1) * imagesPerGroup, totalImages);
      if (startImage === endImage) {
        counter.textContent = \`\${startImage} de \${totalImages}\`;
      } else {
        counter.textContent = \`\${endImage} de \${totalImages}\`;
      }
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentGroupIndex = (currentGroupIndex - 1 + imageGroups.length) % imageGroups.length;
      showGroup(currentGroupIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentGroupIndex = (currentGroupIndex + 1) % imageGroups.length;
      showGroup(currentGroupIndex);
    });
  }

  showGroup(0);
}

// Modal functionality
function openModal(sectionId) {
  const modal = document.getElementById(\`modal-\${sectionId}\`);
  if (!modal) return;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Initialize modal carousel
  const thumbnails = modal.querySelectorAll('.modal-thumbnail');
  const mainImage = modal.querySelector('.modal-main-image');
  if (thumbnails.length > 0 && mainImage) {
    thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => {
        thumbnails.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        mainImage.src = thumb.src;
      });
    });
    // Set first thumbnail as active
    if (thumbnails[0]) {
      thumbnails[0].classList.add('active');
      mainImage.src = thumbnails[0].src;
    }
  }
}

function closeModal(sectionId) {
  const modal = document.getElementById(\`modal-\${sectionId}\`);
  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    const modal = e.target;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Initialize all carousels
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section-container');
  sections.forEach(section => {
    const sectionId = section.getAttribute('data-section-id');
    if (sectionId) {
      initCarousel(sectionId);
    }
  });
});
</script>
</div>
</body>
</html>`;

  return html;
}

/**
 * Genera el HTML de una sección individual
 */
function generateSectionHTML(
  section: ChecklistSection,
  sectionTitle: string,
  sectionId: string,
  translations: any
): string {
  // Recolectar imágenes y elementos
  const images = collectSectionImages(section, sectionId, translations);
  const categorized = groupElementsByCategory(section, sectionId, translations);
  const notes = collectSectionNotes(section, sectionId, translations);

  let html = `
<section class="section-container" data-section-id="${sectionId}">
<div class="section-header">
<h2 class="section-title">${escapeHtml(sectionTitle)}</h2>`;

  // Solo mostrar "Ver todas las imágenes" si hay imágenes
  if (images.length > 0) {
    html += `<a href="#" class="see-all-images-link" onclick="event.preventDefault(); openModal('${sectionId}'); return false;">Ver todas las imágenes</a>`;
  }

  html += `</div>
<div class="section-content">`;

  // Carrusel de imágenes (izquierda)
  html += `<div class="image-carousel">`;
  if (images.length > 0) {
    html += `<div class="carousel-container" id="carousel-${sectionId}" data-total-images="${images.length}">`;
    
    // Si hay más de 2 imágenes, agruparlas de 2 en 2
    if (images.length > 2) {
      const imagesPerGroup = 2;
      const totalGroups = Math.ceil(images.length / imagesPerGroup);
      
      for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
        const startIndex = groupIndex * imagesPerGroup;
        const endIndex = Math.min(startIndex + imagesPerGroup, images.length);
        
        html += `<div class="carousel-images-group ${groupIndex === 0 ? 'active' : ''}">`;
        for (let i = startIndex; i < endIndex; i++) {
          html += `<img src="${escapeHtml(images[i].url)}" alt="${escapeHtml(images[i].label || '')}" class="carousel-image" />`;
        }
        html += `</div>`;
      }
      
      html += `<button class="carousel-nav prev">‹</button>
<button class="carousel-nav next">›</button>
<div class="carousel-counter">${Math.min(2, images.length)} de ${images.length}</div>`;
    } else {
      // Si hay 1 o 2 imágenes, mostrarlas todas sin agrupar
      html += `<div class="carousel-images-group active">`;
      images.forEach((img) => {
        html += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label || '')}" class="carousel-image ${images.length === 1 ? 'single' : ''}" />`;
      });
      html += `</div>`;
      
      if (images.length > 1) {
        html += `<div class="carousel-counter">${images.length} de ${images.length}</div>`;
      }
    }
    
    html += `</div>`;
  } else {
    html += `<div class="carousel-container" style="display: flex; align-items: center; justify-content: center; color: #94A3B8;">
<p>No hay imágenes disponibles</p>
</div>`;
  }
  html += `</div>`;

  // Lista de condiciones (derecha)
  html += `<div class="conditions-list">`;

  const categoryOrder = ['Acabados', 'Comunicaciones', 'Electricidad', 'Carpintería', 'Climatización', 'Almacenamiento', 'Electrodomésticos', 'Seguridad', 'Sistemas', 'Mobiliario', 'Otros'];

  for (const category of categoryOrder) {
    const elements = categorized[category];
    if (!elements || elements.length === 0) continue;

    html += `<div class="category-group">
<h3 class="category-title">${escapeHtml(category)}</h3>`;

    for (const element of elements) {
      const statusLabel = getStatusLabel(element.status, translations);
      const statusClasses = getStatusBadgeClasses(element.status);

      html += `<div class="condition-item">
<div class="condition-item-wrapper">
<div class="condition-label">${escapeHtml(element.label)}</div>`;
      
      if (element.notes) {
        html += `<div class="condition-notes">${escapeHtml(element.notes)}</div>`;
      }

      html += `</div>
<span class="condition-badge ${statusClasses}">${escapeHtml(statusLabel)}</span>
</div>`;
          }

          html += `</div>`;
        }

    // Si no hay elementos categorizados, mostrar mensaje
    if (Object.keys(categorized).length === 0) {
      html += `<div class="category-group">
<p style="color: #94A3B8; font-size: 14px;">No se han reportado condiciones</p>
</div>`;
    }

        html += `</div>
</div>`;

  // Modal para esta sección
  if (images.length > 0) {
    html += generateModalHTML(sectionId, sectionTitle, images, notes);
  }

  html += `</section>`;

  return html;
}

/**
 * Genera el HTML del modal/lightbox
 */
function generateModalHTML(
  sectionId: string,
  sectionTitle: string,
  images: ImageWithMetadata[],
  notes: string[]
): string {
  const firstImage = images[0];

  let html = `
<div class="modal-overlay" id="modal-${sectionId}">
<div class="modal-content">
<div class="modal-header">
<h3 class="modal-title">${escapeHtml(sectionTitle)}</h3>
<button class="modal-close" onclick="closeModal('${sectionId}')">×</button>
</div>
<img src="${escapeHtml(firstImage.url)}" alt="${escapeHtml(firstImage.label || '')}" class="modal-main-image" />`;

  // Observations section
  if (notes.length > 0) {
    html += `<div class="modal-observations">
<h4 class="modal-observations-title">Observaciones</h4>
<div class="modal-observations-text">`;
    
    notes.forEach((note, index) => {
      html += `<p>${escapeHtml(note)}</p>`;
      if (index < notes.length - 1) {
        html += `<br />`;
      }
    });

    html += `</div>
</div>`;
  }

  // Thumbnails
  html += `<div class="modal-thumbnails">`;
  images.forEach((img, index) => {
    html += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label || '')}" class="modal-thumbnail ${index === 0 ? 'active' : ''}" />`;
  });
  html += `</div>`;

  // Done button
  html += `<button class="modal-done-button" onclick="closeModal('${sectionId}')">Hecho</button>
</div>
</div>`;

  return html;
}
