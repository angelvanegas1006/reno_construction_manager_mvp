import type { ChecklistData, ChecklistSection, ChecklistQuestion, ChecklistUploadZone, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationItem, ChecklistStatus, FileUpload } from '@/lib/checklist-storage';
import type { Database } from '@/lib/supabase/types';
import type { InspectionType } from '@/hooks/useSupabaseInspection';

type InspectionZone = Database['public']['Tables']['inspection_zones']['Row'];
type InspectionElement = Database['public']['Tables']['inspection_elements']['Row'];
type ZoneInsert = Database['public']['Tables']['inspection_zones']['Insert'];
type ElementInsert = Database['public']['Tables']['inspection_elements']['Insert'];

// Mapeo de secciones a zone_type
const SECTION_TO_ZONE_TYPE: Record<string, string> = {
  'entorno-zonas-comunes': 'entorno',
  'estado-general': 'distribucion',
  'entrada-pasillos': 'entrada',
  'habitaciones': 'dormitorio',
  'salon': 'salon',
  'banos': 'bano',
  'cocina': 'cocina',
  'exteriores': 'exterior',
};

// Helper para extraer badElements de notes (formato: "notes\nBad elements: item1, item2")
function extractBadElementsFromNotes(notes: string | null): string[] | undefined {
  if (!notes) return undefined;
  const badElementsMatch = notes.match(/Bad elements:\s*(.+)/);
  if (badElementsMatch) {
    return badElementsMatch[1].split(',').map(item => item.trim()).filter(Boolean);
  }
  return undefined;
}

// Helper para limpiar notes removiendo la parte de badElements
function cleanNotesFromBadElements(notes: string | null): string | null {
  if (!notes) return null;
  return notes.replace(/\nBad elements:.*$/, '').trim() || null;
}

// Mapeo de zone_type a nombre de zona
const ZONE_TYPE_TO_NAME: Record<string, string> = {
  'entorno': 'Entorno y Zonas Comunes',
  'distribucion': 'Estado General',
  'entrada': 'Entrada y Pasillos',
  'dormitorio': 'Habitación',
  'salon': 'Salón',
  'bano': 'Baño',
  'cocina': 'Cocina',
  'exterior': 'Exteriores',
};

// Mapeo de ChecklistStatus a condition enum de Supabase
function mapStatusToCondition(status: ChecklistStatus | undefined): string | null {
  if (!status) return null;
  
  const mapping: Record<ChecklistStatus, string> = {
    'buen_estado': 'buen_estado',
    'necesita_reparacion': 'necesita_reparacion',
    'necesita_reemplazo': 'necesita_reemplazo',
    'no_aplica': 'no_aplica',
  };
  
  return mapping[status] || null;
}

// Mapeo inverso: condition de Supabase a ChecklistStatus
export function mapConditionToStatus(condition: string | null): ChecklistStatus | undefined {
  if (!condition) return undefined;
  
  const mapping: Record<string, ChecklistStatus> = {
    'buen_estado': 'buen_estado',
    'necesita_reparacion': 'necesita_reparacion',
    'necesita_reemplazo': 'necesita_reemplazo',
    'no_aplica': 'no_aplica',
  };
  
  return mapping[condition];
}

/**
 * Convierte una sección del checklist a zonas de inspección
 */
export function convertSectionToZones(
  sectionId: string,
  section: ChecklistSection,
  inspectionId: string
): ZoneInsert[] {
  const zoneType = SECTION_TO_ZONE_TYPE[sectionId];
  if (!zoneType) return [];

  const zones: ZoneInsert[] = [];

  // Secciones dinámicas (habitaciones, banos)
  if (section.dynamicItems && section.dynamicItems.length > 0) {
    section.dynamicItems.forEach((item, index) => {
      const zoneName = `${ZONE_TYPE_TO_NAME[zoneType]} ${index + 1}`;
      zones.push({
        inspection_id: inspectionId,
        zone_type: zoneType,
        zone_name: zoneName,
      });
    });
  } else {
    // Secciones fijas
    const zoneName = ZONE_TYPE_TO_NAME[zoneType];
    zones.push({
      inspection_id: inspectionId,
      zone_type: zoneType,
      zone_name: zoneName,
    });
  }

  return zones;
}

/**
 * Convierte upload zones a elementos de inspección
 */
export function convertUploadZonesToElements(
  uploadZones: ChecklistUploadZone[],
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  uploadZones.forEach((uploadZone) => {
    // Crear elemento para fotos
    if (uploadZone.photos && uploadZone.photos.length > 0) {
      const imageUrls = uploadZone.photos
        .filter(photo => photo.data) // Solo fotos con data (ya subidas)
        .map(photo => photo.data); // URLs de Supabase Storage

      elements.push({
        zone_id: zoneId,
        element_name: `fotos-${uploadZone.id}`,
        condition: null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        notes: null,
        quantity: null,
        exists: null,
      });
    }

    // Crear elemento para videos
    if (uploadZone.videos && uploadZone.videos.length > 0) {
      const videoUrls = uploadZone.videos
        .filter(video => video.data) // Solo videos con data (ya subidos)
        .map(video => video.data); // URLs de Supabase Storage

      elements.push({
        zone_id: zoneId,
        element_name: `videos-${uploadZone.id}`,
        condition: null,
        image_urls: null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        notes: null,
        quantity: null,
        exists: null,
      });
    }
  });

  return elements;
}

/**
 * Convierte questions a elementos de inspección
 */
export function convertQuestionsToElements(
  questions: ChecklistQuestion[],
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  questions.forEach((question) => {
    const imageUrls = question.photos
      ?.filter(photo => photo.data)
      .map(photo => photo.data) || null;

    // Nota: badElements se puede incluir en notes si es necesario
    const notesWithBadElements = question.badElements && question.badElements.length > 0
      ? `${question.notes || ''}\nBad elements: ${question.badElements.join(', ')}`.trim()
      : question.notes || null;

    elements.push({
      zone_id: zoneId,
      element_name: question.id,
      condition: mapStatusToCondition(question.status),
      notes: notesWithBadElements,
      image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      quantity: null,
      exists: null,
    });
  });

  return elements;
}

/**
 * Convierte items con cantidad a elementos de inspección
 */
export function convertItemsToElements(
  items: (ChecklistCarpentryItem | ChecklistClimatizationItem)[],
  zoneId: string,
  itemType: 'carpentry' | 'climatization' | 'storage' | 'appliance' | 'security' | 'system'
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  items.forEach((item) => {
    if (item.cantidad === 0) return; // Saltar items con cantidad 0

    if (item.cantidad === 1) {
      // Un solo elemento
      const imageUrls = item.photos
        ?.filter(photo => photo.data)
        .map(photo => photo.data) || null;

      // Nota: badElements se puede incluir en notes si es necesario
      const badElements = 'badElements' in item ? item.badElements : undefined;
      const notesWithBadElements = badElements && badElements.length > 0
        ? `${item.notes || ''}\nBad elements: ${badElements.join(', ')}`.trim()
        : item.notes || null;

      elements.push({
        zone_id: zoneId,
        element_name: `${itemType}-${item.id}`,
        condition: mapStatusToCondition(item.estado),
        notes: notesWithBadElements,
        image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
        quantity: 1,
        exists: null,
      });
    } else if (item.units && item.units.length > 0) {
      // Múltiples unidades - crear un elemento por unidad
      item.units.forEach((unit, index) => {
        const imageUrls = unit.photos
          ?.filter(photo => photo.data)
          .map(photo => photo.data) || null;

        // Nota: badElements se puede incluir en notes si es necesario
        const badElements = 'badElements' in unit ? unit.badElements : undefined;
        const notesWithBadElements = badElements && badElements.length > 0
          ? `${unit.notes || ''}\nBad elements: ${badElements.join(', ')}`.trim()
          : unit.notes || null;

        elements.push({
          zone_id: zoneId,
          element_name: `${itemType}-${item.id}-${index + 1}`,
          condition: mapStatusToCondition(unit.estado),
          notes: notesWithBadElements,
          image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
          quantity: 1,
          exists: null,
        });
      });
    }
  });

  return elements;
}

/**
 * Convierte mobiliario a elementos de inspección
 */
export function convertMobiliarioToElements(
  mobiliario: { existeMobiliario?: boolean; question?: ChecklistQuestion },
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  // Elemento principal de mobiliario
  elements.push({
    zone_id: zoneId,
    element_name: 'mobiliario',
    condition: null,
    notes: null,
    image_urls: null,
    quantity: null,
    exists: mobiliario.existeMobiliario ?? null,
  });

  // Si existe mobiliario y hay question, crear elemento adicional
  if (mobiliario.existeMobiliario && mobiliario.question) {
    const imageUrls = mobiliario.question.photos
      ?.filter(photo => photo.data)
      .map(photo => photo.data) || null;

    // Nota: badElements se puede incluir en notes si es necesario
    const notesWithBadElements = mobiliario.question.badElements && mobiliario.question.badElements.length > 0
      ? `${mobiliario.question.notes || ''}\nBad elements: ${mobiliario.question.badElements.join(', ')}`.trim()
      : mobiliario.question.notes || null;

    elements.push({
      zone_id: zoneId,
      element_name: 'mobiliario-detalle',
      condition: mapStatusToCondition(mobiliario.question.status),
      notes: notesWithBadElements,
      image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      quantity: null,
      exists: null,
    });
  }

  return elements;
}

/**
 * Convierte una sección completa del checklist a elementos de Supabase
 */
export function convertSectionToElements(
  sectionId: string,
  section: ChecklistSection,
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  // Upload zones
  if (section.uploadZones && section.uploadZones.length > 0) {
    elements.push(...convertUploadZonesToElements(section.uploadZones, zoneId));
  }

  // Questions
  if (section.questions && section.questions.length > 0) {
    elements.push(...convertQuestionsToElements(section.questions, zoneId));
  }

  // Carpentry items
  if (section.carpentryItems && section.carpentryItems.length > 0) {
    elements.push(...convertItemsToElements(section.carpentryItems, zoneId, 'carpentry'));
  }

  // Climatization items
  if (section.climatizationItems && section.climatizationItems.length > 0) {
    elements.push(...convertItemsToElements(section.climatizationItems, zoneId, 'climatization'));
  }

  // Storage items
  if (section.storageItems && section.storageItems.length > 0) {
    elements.push(...convertItemsToElements(section.storageItems, zoneId, 'storage'));
  }

  // Appliances items
  if (section.appliancesItems && section.appliancesItems.length > 0) {
    elements.push(...convertItemsToElements(section.appliancesItems, zoneId, 'appliance'));
  }

  // Security items
  if (section.securityItems && section.securityItems.length > 0) {
    elements.push(...convertItemsToElements(section.securityItems, zoneId, 'security'));
  }

  // Systems items
  if (section.systemsItems && section.systemsItems.length > 0) {
    elements.push(...convertItemsToElements(section.systemsItems, zoneId, 'system'));
  }

  // Mobiliario
  if (section.mobiliario) {
    elements.push(...convertMobiliarioToElements(section.mobiliario, zoneId));
  }

  // Dynamic items (habitaciones, banos)
  if (section.dynamicItems && section.dynamicItems.length > 0) {
    // Los dynamic items se procesan por zona individual
    // Esta función se llama por cada dynamic item
  }

  return elements;
}

/**
 * Convierte un dynamic item (habitación, baño) a elementos
 */
export function convertDynamicItemToElements(
  dynamicItem: ChecklistDynamicItem,
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  // Upload zone del dynamic item
  if (dynamicItem.uploadZone) {
    elements.push(...convertUploadZonesToElements([dynamicItem.uploadZone], zoneId));
  }

  // Questions del dynamic item
  if (dynamicItem.questions && dynamicItem.questions.length > 0) {
    elements.push(...convertQuestionsToElements(dynamicItem.questions, zoneId));
  }

  // Carpentry items
  if (dynamicItem.carpentryItems && dynamicItem.carpentryItems.length > 0) {
    elements.push(...convertItemsToElements(dynamicItem.carpentryItems, zoneId, 'carpentry'));
  }

  // Climatization items
  if (dynamicItem.climatizationItems && dynamicItem.climatizationItems.length > 0) {
    elements.push(...convertItemsToElements(dynamicItem.climatizationItems, zoneId, 'climatization'));
  }

  // Mobiliario
  if (dynamicItem.mobiliario) {
    elements.push(...convertMobiliarioToElements(dynamicItem.mobiliario, zoneId));
  }

  return elements;
}

/**
 * Convierte URLs a FileUpload
 */
function urlToFileUpload(url: string, isVideo: boolean = false): FileUpload {
  const fileName = url.split('/').pop() || '';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Detectar tipo MIME basado en extensión
  let mimeType = 'image/jpeg'; // default
  if (isVideo) {
    switch (extension) {
      case 'mp4':
        mimeType = 'video/mp4';
        break;
      case 'webm':
        mimeType = 'video/webm';
        break;
      case 'mov':
      case 'quicktime':
        mimeType = 'video/quicktime';
        break;
      default:
        mimeType = 'video/mp4';
    }
  } else {
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      default:
        mimeType = 'image/jpeg';
    }
  }
  
  return {
    id: crypto.randomUUID(),
    name: fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
    size: 0, // No tenemos el tamaño desde la URL
    type: mimeType,
    data: url, // Guardamos la URL directamente
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Convierte elementos de Supabase de vuelta al formato del checklist
 */
export function convertSupabaseToChecklist(
  zones: InspectionZone[],
  elements: InspectionElement[],
  propertyBedrooms: number | null,
  propertyBathrooms: number | null
): Partial<ChecklistData> {
  const sections: Record<string, ChecklistSection> = {};

  // Agrupar elementos por zona
  const elementsByZone = new Map<string, InspectionElement[]>();
  elements.forEach(element => {
    if (!elementsByZone.has(element.zone_id)) {
      elementsByZone.set(element.zone_id, []);
    }
    elementsByZone.get(element.zone_id)!.push(element);
  });

  // Agrupar zonas por tipo para manejar dinámicas (habitaciones, banos)
  const zonesByType = new Map<string, InspectionZone[]>();
  zones.forEach(zone => {
    if (!zonesByType.has(zone.zone_type)) {
      zonesByType.set(zone.zone_type, []);
    }
    zonesByType.get(zone.zone_type)!.push(zone);
  });

  // Procesar cada tipo de zona
  zonesByType.forEach((zonesOfType, zoneType) => {
    // Determinar sectionId
    let sectionId: string | null = null;
    for (const [secId, zType] of Object.entries(SECTION_TO_ZONE_TYPE)) {
      if (zType === zoneType) {
        sectionId = secId;
        break;
      }
    }

    if (!sectionId) return;

    // Inicializar sección
    if (!sections[sectionId]) {
      sections[sectionId] = {
        id: sectionId,
        uploadZones: [],
        questions: [],
        dynamicItems: [],
        dynamicCount: sectionId === 'habitaciones' ? propertyBedrooms || 0 :
                     sectionId === 'banos' ? propertyBathrooms || 0 : 0,
      };
    }

    const section = sections[sectionId];

    // Si es sección dinámica (habitaciones, banos)
    if (sectionId === 'habitaciones' || sectionId === 'banos') {
      zonesOfType.forEach((zone, index) => {
        const zoneElements = elementsByZone.get(zone.id) || [];
        const dynamicItem: ChecklistDynamicItem = {
          id: `${sectionId}-${index + 1}`,
          questions: [],
          uploadZone: { id: `fotos-video-${sectionId}-${index + 1}`, photos: [], videos: [] },
        };

        // Procesar elementos de esta zona
        zoneElements.forEach(element => {
          // Upload zones
          if (element.element_name.startsWith('fotos-')) {
            const uploadZoneId = element.element_name.replace('fotos-', '');
            if (dynamicItem.uploadZone && dynamicItem.uploadZone.id === uploadZoneId) {
              dynamicItem.uploadZone.photos = element.image_urls?.map(url => urlToFileUpload(url)) || [];
            }
          } else if (element.element_name.startsWith('videos-')) {
            const uploadZoneId = element.element_name.replace('videos-', '');
            if (dynamicItem.uploadZone && dynamicItem.uploadZone.id === uploadZoneId) {
              // Cargar videos desde video_urls
              dynamicItem.uploadZone.videos = element.video_urls?.map(url => urlToFileUpload(url, true)) || [];
            }
          }
          // Questions
          else if (!element.element_name.includes('-') &&
                   !element.element_name.startsWith('fotos-') &&
                   !element.element_name.startsWith('videos-') &&
                   element.element_name !== 'mobiliario' &&
                   !element.element_name.startsWith('carpentry-') &&
                   !element.element_name.startsWith('climatization-')) {
            const question: ChecklistQuestion = {
              id: element.element_name,
              status: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
              // badElements se extraen de notes si están presentes
              badElements: extractBadElementsFromNotes(element.notes),
            };
            if (!dynamicItem.questions) dynamicItem.questions = [];
            dynamicItem.questions.push(question);
          }
          // Mobiliario
          else if (element.element_name === 'mobiliario') {
            dynamicItem.mobiliario = {
              existeMobiliario: element.exists ?? false,
            };
          } else if (element.element_name === 'mobiliario-detalle') {
            if (dynamicItem.mobiliario) {
              dynamicItem.mobiliario.question = {
                id: 'mobiliario',
                status: mapConditionToStatus(element.condition),
                notes: element.notes || undefined,
                photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
                // badElements se extraen de notes si están presentes
              badElements: extractBadElementsFromNotes(element.notes),
              };
            }
          }
        });

        if (!section.dynamicItems) section.dynamicItems = [];
        section.dynamicItems.push(dynamicItem);
      });
    } else {
      // Sección fija (no dinámica)
      const zone = zonesOfType[0]; // Solo debería haber una zona por tipo
      const zoneElements = elementsByZone.get(zone.id) || [];

      zoneElements.forEach(element => {
        // Upload zones
        if (element.element_name.startsWith('fotos-')) {
          const uploadZoneId = element.element_name.replace('fotos-', '');
          let uploadZone = section.uploadZones?.find(uz => uz.id === uploadZoneId);
          if (!uploadZone) {
            uploadZone = { id: uploadZoneId, photos: [], videos: [] };
            if (!section.uploadZones) section.uploadZones = [];
            section.uploadZones.push(uploadZone);
          }
          uploadZone.photos = element.image_urls?.map(url => urlToFileUpload(url)) || [];
        } else if (element.element_name.startsWith('videos-')) {
          const uploadZoneId = element.element_name.replace('videos-', '');
          let uploadZone = section.uploadZones?.find(uz => uz.id === uploadZoneId);
          if (!uploadZone) {
            uploadZone = { id: uploadZoneId, photos: [], videos: [] };
            if (!section.uploadZones) section.uploadZones = [];
            section.uploadZones.push(uploadZone);
          }
          // Cargar videos desde video_urls
          uploadZone.videos = element.video_urls?.map(url => urlToFileUpload(url, true)) || [];
        }
        // Questions
        else if (!element.element_name.includes('-') &&
                 !element.element_name.startsWith('fotos-') &&
                 !element.element_name.startsWith('videos-') &&
                 element.element_name !== 'mobiliario' &&
                 !element.element_name.startsWith('carpentry-') &&
                 !element.element_name.startsWith('climatization-') &&
                 !element.element_name.startsWith('storage-') &&
                 !element.element_name.startsWith('appliance-') &&
                 !element.element_name.startsWith('security-') &&
                 !element.element_name.startsWith('system-')) {
          const question: ChecklistQuestion = {
            id: element.element_name,
            status: mapConditionToStatus(element.condition),
            notes: cleanNotesFromBadElements(element.notes) || undefined,
            photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            badElements: extractBadElementsFromNotes(element.notes),
          };
          if (!section.questions) section.questions = [];
          section.questions.push(question);
        }
        // Mobiliario
        if (element.element_name === 'mobiliario') {
          section.mobiliario = {
            existeMobiliario: element.exists ?? false,
          };
        } else if (element.element_name === 'mobiliario-detalle') {
          if (section.mobiliario) {
            section.mobiliario.question = {
              id: 'mobiliario',
              status: mapConditionToStatus(element.condition),
              notes: element.notes || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
              // badElements se extraen de notes si están presentes
              badElements: extractBadElementsFromNotes(element.notes),
            };
          }
        }
      });
    }
  });

  return { sections };
}

