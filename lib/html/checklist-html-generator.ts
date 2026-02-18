import { ChecklistData, ChecklistStatus, ChecklistSection, FileUpload } from '@/lib/checklist-storage';
import { PROPHERO_LOGO_DATA_URL } from '@/lib/assets/prophero-logo-base64';

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
  /** Cuando status es necesita_reparacion/necesita_reemplazo: labels de los elementos marcados en mal estado */
  badElementsLabels?: string[];
  /** URLs de fotos asociadas a este elemento (p. ej. fotos de la pregunta cuando necesita reparación) */
  photoUrls?: string[];
}

/**
 * Resuelve IDs de badElements a labels usando translations
 */
function getBadElementLabels(
  translations: any,
  sectionId: string,
  questionId: string,
  badElementIds: string[] | undefined
): string[] {
  if (!badElementIds || badElementIds.length === 0) return [];
  let normalizedId = sectionId.replace(/^dynamic-/, '');
  const sectionKey = normalizedId.replace(/-(\d+)$/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const sectionKeyMap: Record<string, string> = {
    'entornoZonasComunes': 'entornoZonasComunes',
    'estadoGeneral': 'estadoGeneral',
    'entradaPasillos': 'entradaPasillos',
    'habitaciones': 'habitaciones',
    'habitacion': 'habitaciones',
    'salon': 'salon',
    'banos': 'banos',
    'cocina': 'cocina',
    'exteriores': 'exteriores',
  };
  const key = sectionKeyMap[sectionKey] || sectionKey;
  const section = translations?.checklist?.sections?.[key];
  if (!section) return badElementIds.map(id => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '));

  const qLower = questionId.toLowerCase();
  let itemsMap: Record<string, string> | undefined;
  if (qLower.includes('acabados')) itemsMap = section.acabados?.elements;
  else if (qLower.includes('comunicaciones')) itemsMap = section.comunicaciones?.elements;
  else if (qLower.includes('electricidad')) itemsMap = section.electricidad?.elements;
  else if (qLower.includes('carpinteria')) itemsMap = section.carpinteria?.items;
  else if (qLower.includes('climatizacion')) itemsMap = section.climatizacion?.items;
  else if (qLower.includes('almacenamiento')) itemsMap = section.almacenamiento?.items;
  else if (qLower.includes('electrodomesticos')) itemsMap = section.electrodomesticos?.items;

  if (!itemsMap) return badElementIds.map(id => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '));
  return badElementIds.map(id => itemsMap![id] || itemsMap![id.replace(/-/g, '')] || (id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')));
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
      } else if (questionId.includes('ascensor')) {
        category = 'Ascensor';
      }

      const badElementsLabels = getBadElementLabels(translations, sectionId, question.id, question.badElements);
      const photoUrls = question.photos?.map(p => p.data).filter(Boolean) || [];

      addToCategory(category, {
        id: question.id,
        label: questionLabel,
        status: question.status,
        notes: question.notes,
        category,
        type: 'question',
        badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
        for (let i = 0; i < item.units.length; i++) {
          const unit = item.units[i];
          const badIds = unit.badElements ?? item.badElements;
          const badElementsLabels = getBadElementLabels(translations, sectionId, 'carpinteria', badIds);
          const photoUrls = (unit.photos ?? item.photos)?.map((p: { data: string }) => p.data).filter(Boolean) || [];
          addToCategory('Carpintería', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Carpintería',
            type: 'item',
            badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          });
        }
      } else {
        const badElementsLabels = getBadElementLabels(translations, sectionId, 'carpinteria', item.badElements);
        const photoUrls = item.photos?.map((p: { data: string }) => p.data).filter(Boolean) || [];
        addToCategory('Carpintería', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Carpintería',
          type: 'item',
          badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
          const badElementsLabels = getBadElementLabels(translations, sectionId, 'climatizacion', unit.badElements);
          const photoUrls = (unit.photos ?? item.photos)?.map((p: { data: string }) => p.data).filter(Boolean) || [];
          addToCategory('Climatización', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Climatización',
            type: 'item',
            badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          });
        }
      } else {
        const badElementsLabels = getBadElementLabels(translations, sectionId, 'climatizacion', (item as any).badElements);
        const photoUrls = item.photos?.map((p: { data: string }) => p.data).filter(Boolean) || [];
        addToCategory('Climatización', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Climatización',
          type: 'item',
          badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
      const itemWithUnits = item as { units?: { estado?: ChecklistStatus; notes?: string; badElements?: string[]; photos?: FileUpload[] }[]; badElements?: string[]; photos?: FileUpload[] };

      if (itemWithUnits.units && itemWithUnits.units.length > 0) {
        for (let i = 0; i < itemWithUnits.units.length; i++) {
          const unit = itemWithUnits.units[i];
          const badIds = unit.badElements ?? itemWithUnits.badElements;
          const badElementsLabels = getBadElementLabels(translations, sectionId, 'almacenamiento', badIds);
          const photoUrls = (unit.photos ?? itemWithUnits.photos)?.map((p: { data: string }) => p.data).filter(Boolean) || [];
          addToCategory('Almacenamiento', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Almacenamiento',
            type: 'item',
            badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          });
        }
      } else {
        const badElementsLabels = getBadElementLabels(translations, sectionId, 'almacenamiento', itemWithUnits.badElements);
        const photoUrls = itemWithUnits.photos?.map((p: { data: string }) => p.data).filter(Boolean) || [];
        addToCategory('Almacenamiento', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Almacenamiento',
          type: 'item',
          badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
      const itemWithUnits = item as { units?: { estado?: ChecklistStatus; notes?: string; badElements?: string[]; photos?: FileUpload[] }[]; badElements?: string[]; photos?: FileUpload[] };

      if (itemWithUnits.units && itemWithUnits.units.length > 0) {
        for (let i = 0; i < itemWithUnits.units.length; i++) {
          const unit = itemWithUnits.units[i];
          const badIds = unit.badElements ?? itemWithUnits.badElements;
          const badElementsLabels = getBadElementLabels(translations, sectionId, 'electrodomesticos', badIds);
          const photoUrls = (unit.photos ?? itemWithUnits.photos)?.map((p: { data: string }) => p.data).filter(Boolean) || [];
          addToCategory('Electrodomésticos', {
            id: `${item.id}-${i + 1}`,
            label: `${itemLabel} ${i + 1}`,
            status: unit.estado || status,
            notes: unit.notes || item.notes,
            category: 'Electrodomésticos',
            type: 'item',
            badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          });
        }
      } else {
        const badElementsLabels = getBadElementLabels(translations, sectionId, 'electrodomesticos', itemWithUnits.badElements);
        const photoUrls = itemWithUnits.photos?.map((p: { data: string }) => p.data).filter(Boolean) || [];
        addToCategory('Electrodomésticos', {
          id: item.id,
          label: itemLabel,
          status,
          notes: item.notes,
          category: 'Electrodomésticos',
          type: 'item',
          badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
    const q = section.mobiliario.question;
    const mobiliarioLabel = translations.checklist?.sections?.[sectionId]?.mobiliario?.existeMobiliario || 'Mobiliario';
    const badElementsLabels = getBadElementLabels(translations, sectionId, 'mobiliario', q.badElements);
    const photoUrls = q.photos?.map((p: { data: string }) => p.data).filter(Boolean) || [];
    addToCategory('Mobiliario', {
      id: 'mobiliario',
      label: mobiliarioLabel,
      status: q.status,
      notes: q.notes,
      category: 'Mobiliario',
      type: 'question',
      badElementsLabels: badElementsLabels.length > 0 ? badElementsLabels : undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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

  // Initial check: Entorno y zonas comunes debajo de Exteriores. Final check: Entorno primero.
  const sectionOrder = checklistTypeLabel === 'initial'
    ? ['estado-general', 'entrada-pasillos', 'habitaciones', 'salon', 'banos', 'cocina', 'exteriores', 'entorno-zonas-comunes']
    : ['entorno-zonas-comunes', 'estado-general', 'entrada-pasillos', 'habitaciones', 'salon', 'banos', 'cocina', 'exteriores'];

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
  font-size: 14px;
  background-color: #F8FAFC;
  color: #1E293B;
  line-height: 1.5;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  overflow-x: hidden;
}

/* Header: fondo blanco full width (Rectangle 1 - Figma) */
.report-header-wrapper {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  background: #FFFFFF;
  overflow-x: hidden;
}

.report-header {
  position: relative;
  width: 100%;
  min-width: 100%;
  height: 123px;
  min-height: 123px;
  background: #FFFFFF;
  padding: 26px 64px;
}

.logo-prophero {
  position: absolute;
  width: 322px;
  height: 70px;
  left: 64px;
  top: 26px;
  object-fit: contain;
}

/* Separador debajo del header */
.header-divider {
  height: 1px;
  background: #E2E8F0;
  width: 100%;
}

/* Bloque: titulo, direccion, fecha - Figma */
.report-intro {
  position: relative;
  background: #F8FAFC;
  padding: 24px 64px 32px;
  margin-bottom: 20px;
  min-height: 130px;
  overflow-x: hidden;
}

/* INFORME DE LA PROPIEDAD */
.report-intro-title {
  font-family: 'Inter', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 28px;
  line-height: 34px;
  letter-spacing: -1.5px;
  color: rgba(0, 0, 0, 0.87);
  text-transform: uppercase;
  margin-bottom: 12px;
}

/* Dirección */
.report-intro-address {
  font-family: 'Inter', sans-serif;
  font-style: normal;
  font-weight: 500;
  font-size: 24px;
  line-height: 30px;
  letter-spacing: -1.5px;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 8px;
}

/* Fecha de inspección */
.report-intro-date {
  font-family: 'Inter', sans-serif;
  font-style: normal;
  font-weight: 500;
  font-size: 18px;
  line-height: 24px;
  letter-spacing: -1px;
  color: #71717A;
}

.property-info {
  display: none;
}

.section-container {
  background: #FFFFFF;
  border: 1px solid #FAFAFA;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #E2E8F0;
}

.section-title {
  font-size: 24px;
  font-weight: 500;
  line-height: 32px;
  letter-spacing: -1.5px;
  color: #212121;
}

.see-all-images-link {
  color: #162EB7;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.7px;
  cursor: pointer;
  transition: color 0.2s;
}

.see-all-images-link:hover {
  color: #0F1E8C;
}

.section-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: stretch;
}

@media (max-width: 768px) {
  .section-content {
    grid-template-columns: 1fr;
  }
}

/* Mobile-first: pantallas pequeñas (teléfonos) */
@media (max-width: 640px) {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-size: 13px;
  }

  .container {
    padding: 12px;
    max-width: 100%;
  }

  .report-header {
    height: auto;
    min-height: 80px;
    padding: 16px 16px;
  }

  .logo-prophero {
    position: relative;
    left: 0;
    width: 180px;
    height: auto;
    max-height: 44px;
    object-fit: contain;
  }

  .report-intro {
    padding: 16px 16px 20px;
    min-height: auto;
  }

  .report-intro-title {
    font-size: 20px;
    line-height: 26px;
  }

  .report-intro-address {
    font-size: 16px;
    line-height: 22px;
    word-break: break-word;
  }

  .report-intro-date {
    font-size: 14px;
  }

  .section-container {
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .section-title {
    font-size: 18px;
    line-height: 24px;
  }

  .see-all-images-link {
    font-size: 14px;
  }

  .carousel-container {
    min-height: 180px;
  }

  .carousel-nav {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .carousel-nav.prev {
    left: 4px;
  }

  .carousel-nav.next {
    right: 4px;
  }

  .condition-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .condition-label {
    font-size: 13px;
    word-break: break-word;
  }

  .condition-badge {
    font-size: 10px;
    padding: 2px 8px;
  }

  .condition-notes {
    font-size: 12px;
  }

  .modal-overlay {
    padding: 12px;
    align-items: flex-start;
  }

  .modal-overlay.active {
    align-items: flex-start;
    padding-top: 24px;
  }

  .modal-content {
    padding: 16px;
    max-height: 85vh;
  }

  .modal-title {
    font-size: 14px;
  }

  .modal-main-image {
    height: 200px;
  }

  .modal-thumbnail {
    width: 56px;
    height: 56px;
  }

  .dynamic-section-title {
    font-size: 14px;
  }
}

/* Image Carousel - rellena toda la altura de la estancia (grid stretch) */
.image-carousel {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.carousel-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 200px;
  overflow: hidden;
  border: 1px solid #D4D4D8;
  border-radius: 8px;
  background: #F1F5F9;
  box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.carousel-images-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.carousel-images-group {
  display: none;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.carousel-images-group.active {
  display: flex;
}

/* Layout compacto: pocas imágenes (1-3) - no dividir en partes iguales */
.carousel-images-group--few {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.carousel-images-group--few .carousel-image {
  flex: none;
  width: auto;
  max-width: calc(100% / var(--img-count, 1) - 6px);
  height: auto;
  max-height: 100%;
  min-height: 80px;
  object-fit: contain;
}

.carousel-image {
  width: 100%;
  flex: 1;
  min-height: 1px;
  object-fit: cover;
  border-radius: 4px;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: #D9E7FF;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #162EB7;
  transition: background 0.2s;
  z-index: 10;
}

.carousel-nav:hover {
  background: #C5DBFF;
}

.carousel-nav.prev {
  left: 8px;
}

.carousel-nav.next {
  right: 8px;
}

.carousel-counter {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.5px;
  color: #71717A;
  padding: 8px 0;
}

/* Conditions List */
.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.category-group {
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 10px;
}

.category-group:last-child {
  border-bottom: none;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  gap: 12px;
}

.condition-label {
  flex: 1;
  font-size: 13px;
  color: #1E293B;
  font-weight: 500;
}

.condition-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}

.condition-notes {
  margin-top: 6px;
  font-size: 12px;
  color: #64748B;
  line-height: 1.45;
}

.condition-bad-elements {
  margin-top: 4px;
  font-size: 11px;
  color: #B45309;
  font-weight: 500;
  line-height: 1.35;
}

/* Mini imágenes ocultas: se ven en el carrusel de la izquierda */
.condition-photos {
  display: none !important;
}

.condition-thumbnail {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #E2E8F0;
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
  padding: 16px;
}

.modal-overlay.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 720px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #E2E8F0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #64748B;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
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
  height: 280px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 14px;
  background: #F1F5F9;
}

.modal-observations {
  margin-bottom: 14px;
}

.modal-observations-title {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 8px;
}

.modal-observations-text {
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
}

.modal-thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
}

.modal-thumbnail {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 4px;
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
  margin-top: 14px;
  width: 100%;
  padding: 10px;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-done-button:hover {
  background: #2563EB;
}

/* Dynamic sections (Habitaciones, Baños) */
.dynamic-section {
  margin-bottom: 20px;
}

.dynamic-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 14px;
}
</style>
</head>
<body>
<div class="report-header-wrapper">
<header class="report-header">
<img class="logo-prophero" src="${PROPHERO_LOGO_DATA_URL}" alt="PropHero" />
</header>
</div>
<div class="header-divider"></div>
<div class="report-intro">
<div class="report-intro-title">Informe de la Propiedad</div>
<div class="report-intro-address">${escapeHtml(propertyInfo.address)}</div>
<div class="report-intro-date">Fecha de inspección: ${escapeHtml(completedDate)}</div>
</div>
<div class="container">`;

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
  const imagesPerGroup = parseInt(carousel.getAttribute('data-images-per-group') || '4');
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
        counter.textContent = \`\${startImage}-\${endImage} de \${totalImages}\`;
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
    // Pocas imágenes (1-3): layout compacto sin dividir. Muchas (4+): carrusel con grupos
    const useCompactLayout = images.length <= 3;
    const imagesPerGroup = images.length >= 4 ? 1 : images.length;
    html += `<div class="carousel-container" id="carousel-${sectionId}" data-total-images="${images.length}" data-images-per-group="${imagesPerGroup}">`;
    const totalGroups = Math.ceil(images.length / imagesPerGroup);

    html += `<div class="carousel-images-wrapper">`;
    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
      const startIndex = groupIndex * imagesPerGroup;
      const endIndex = Math.min(startIndex + imagesPerGroup, images.length);
      const fewClass = useCompactLayout ? ' carousel-images-group--few' : '';
      const activeClass = groupIndex === 0 ? ' active' : '';
      const imgCountStyle = useCompactLayout ? ` style="--img-count: ${endIndex - startIndex}"` : '';

      html += `<div class="carousel-images-group${fewClass}${activeClass}"${imgCountStyle}>`;
      for (let i = startIndex; i < endIndex; i++) {
        html += `<img src="${escapeHtml(images[i].url)}" alt="${escapeHtml(images[i].label || '')}" class="carousel-image" />`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    if (totalGroups > 1) {
      html += `<button class="carousel-nav prev">‹</button>
<button class="carousel-nav next">›</button>`;
    }
    const counterText = totalGroups > 1
      ? (imagesPerGroup === 1 ? `1 de ${images.length}` : `1-${Math.min(imagesPerGroup, images.length)} de ${images.length}`)
      : `${images.length} de ${images.length}`;
    html += `<div class="carousel-counter">${counterText}</div>`;
    html += `</div>`;
  } else {
    html += `<div class="carousel-container" style="display: flex; align-items: center; justify-content: center; color: #94A3B8;">
<p>No hay imágenes disponibles</p>
</div>`;
  }
  html += `</div>`;

  // Lista de condiciones (derecha)
  html += `<div class="conditions-list">`;

  const categoryOrder = ['Acabados', 'Comunicaciones', 'Electricidad', 'Carpintería', 'Ascensor', 'Climatización', 'Almacenamiento', 'Electrodomésticos', 'Seguridad', 'Sistemas', 'Mobiliario', 'Otros'];

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

      if (element.badElementsLabels && element.badElementsLabels.length > 0) {
        html += `<div class="condition-bad-elements">Elementos en mal estado: ${escapeHtml(element.badElementsLabels.join(', '))}</div>`;
      }

      if (element.photoUrls && element.photoUrls.length > 0) {
        html += `<div class="condition-photos">`;
        for (const url of element.photoUrls) {
          html += `<img src="${escapeHtml(url)}" alt="" class="condition-thumbnail" loading="lazy" />`;
        }
        html += `</div>`;
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
