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
    // Crear elemento para fotos (siempre crear el elemento, incluso si está vacío)
    const allPhotos = uploadZone.photos || [];
    // IMPORTANTE: Solo guardar URLs HTTP (fotos ya subidas), NO base64
    // Las fotos en base64 se subirán primero y luego se guardarán con sus URLs
    const photosWithHttp = allPhotos.filter(photo => photo.data && photo.data.startsWith('http'));
    const imageUrls = photosWithHttp.length > 0 ? photosWithHttp.map(photo => photo.data) : null;
    
    console.log(`[convertUploadZonesToElements] Processing upload zone "${uploadZone.id}":`, {
      zoneId,
      uploadZoneId: uploadZone.id,
      totalPhotos: allPhotos.length,
      photosWithHttp: photosWithHttp.length,
      photosWithBase64: allPhotos.filter(p => p.data?.startsWith('data:')).length,
      photosWithoutData: allPhotos.filter(p => !p.data).length,
      imageUrls: imageUrls,
      imageUrlsCount: imageUrls?.length || 0,
      willCreateElement: true, // Siempre crear el elemento
    });

    // IMPORTANTE: Siempre crear el elemento, incluso si no hay fotos todavía
    // Esto asegura que la estructura se mantenga y que las fotos se puedan cargar después
    const photoElement = {
      zone_id: zoneId,
      element_name: `fotos-${uploadZone.id}`,
      condition: null,
      image_urls: imageUrls, // null si no hay URLs HTTP
      notes: null,
      quantity: null,
      exists: null,
    };
    
    console.log(`[convertUploadZonesToElements] ✅ Created photo element:`, {
      element_name: photoElement.element_name,
      zone_id: photoElement.zone_id,
      image_urls: photoElement.image_urls,
      image_urls_count: photoElement.image_urls?.length || 0,
      willBeSaved: true,
    });
    
    elements.push(photoElement);

    // Crear elemento para videos (siempre crear el elemento, incluso si está vacío)
    const videoUrls = uploadZone.videos
      ?.filter(video => video.data && video.data.startsWith('http')) // Solo URLs ya subidas (no base64)
      .map(video => video.data) || [];

    // Crear elemento siempre, incluso si no hay videos todavía (para mantener la estructura)
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

  // Log todos los elementos antes de procesar
  const allElementDetails = elements.map(e => ({
    id: e.id,
    element_name: e.element_name,
    zone_id: e.zone_id,
    has_image_urls: !!e.image_urls,
    image_urls_count: e.image_urls?.length || 0,
    image_urls: e.image_urls,
    video_urls_count: e.video_urls?.length || 0,
    video_urls: e.video_urls,
  }));
  
  console.log('[convertSupabaseToChecklist] 🔍 Starting conversion:', {
    zonesCount: zones.length,
    elementsCount: elements.length,
    allElementNames: allElementDetails,
  });
  
  // Log detallado de cada elemento individualmente para facilitar debugging
  allElementDetails.forEach((element, index) => {
    console.log(`[convertSupabaseToChecklist] Element ${index + 1}/${allElementDetails.length}:`, element);
  });

  // Log todas las zonas
  console.log('[convertSupabaseToChecklist] 📍 All zones:', zones.map(z => ({
    id: z.id,
    zone_type: z.zone_type,
    zone_name: z.zone_name,
    inspection_id: z.inspection_id,
  })));
  
  // Log zonas específicas que tienen elementos de fotos
  const photoElementZoneIds = elements
    .filter(e => e.element_name?.startsWith('fotos-'))
    .map(e => e.zone_id);
  const uniquePhotoZoneIds = [...new Set(photoElementZoneIds)];
  console.log('[convertSupabaseToChecklist] 🔍 Photo element zone IDs:', {
    photoElementZoneIds: uniquePhotoZoneIds,
    zonesForPhotoElements: uniquePhotoZoneIds.map(zoneId => {
      const zone = zones.find(z => z.id === zoneId);
      return {
        zoneId,
        zoneFound: !!zone,
        zoneType: zone?.zone_type,
        zoneName: zone?.zone_name,
        inspectionId: zone?.inspection_id,
      };
    }),
    allZonesWithIds: zones.map(z => ({ id: z.id, zone_type: z.zone_type, inspection_id: z.inspection_id })),
    missingZones: uniquePhotoZoneIds.filter(zoneId => !zones.find(z => z.id === zoneId)),
  });

  // Agrupar elementos por zona
  const elementsByZone = new Map<string, InspectionElement[]>();
  elements.forEach(element => {
    if (!elementsByZone.has(element.zone_id)) {
      elementsByZone.set(element.zone_id, []);
    }
    elementsByZone.get(element.zone_id)!.push(element);
    
    // Log detallado para elementos con fotos
    if (element.element_name.startsWith('fotos-')) {
      const zone = zones.find(z => z.id === element.zone_id);
      console.log(`[convertSupabaseToChecklist] 📸 Photo element found:`, {
        element_name: element.element_name,
        element_id: element.id,
        element_zone_id: element.zone_id,
        zone_found: zone ? { id: zone.id, zone_type: zone.zone_type, zone_name: zone.zone_name } : 'NOT FOUND',
        image_urls_count: element.image_urls?.length || 0,
        image_urls: element.image_urls,
      });
    }
  });

  // Log elementos agrupados por zona
  console.log('[convertSupabaseToChecklist] 🔗 Elements grouped by zone:', 
    Array.from(elementsByZone.entries()).map(([zoneId, zoneElements]) => ({
      zone_id: zoneId,
      elements_count: zoneElements.length,
      elements: zoneElements.map(e => ({
        id: e.id,
        element_name: e.element_name,
        has_image_urls: !!e.image_urls,
        image_urls_count: e.image_urls?.length || 0,
      })),
    }))
  );

  // Agrupar zonas por tipo para manejar dinámicas (habitaciones, banos)
  const zonesByType = new Map<string, InspectionZone[]>();
  zones.forEach(zone => {
    if (!zonesByType.has(zone.zone_type)) {
      zonesByType.set(zone.zone_type, []);
    }
    zonesByType.get(zone.zone_type)!.push(zone);
  });

  // Log zonas agrupadas por tipo
  console.log('[convertSupabaseToChecklist] 📂 Zones grouped by type:', 
    Array.from(zonesByType.entries()).map(([zoneType, zonesOfType]) => ({
      zone_type: zoneType,
      zones_count: zonesOfType.length,
      zones: zonesOfType.map(z => ({
        id: z.id,
        zone_name: z.zone_name,
        elements_count: elementsByZone.get(z.id)?.length || 0,
      })),
    }))
  );

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
              const photoUrls = element.image_urls || [];
              console.log(`[convertSupabaseToChecklist] Loading photos for dynamic item ${dynamicItem.id}:`, {
                dynamicItemId: dynamicItem.id,
                elementName: element.element_name,
                photoUrlsCount: photoUrls.length,
                photoUrls: photoUrls,
              });
              dynamicItem.uploadZone.photos = photoUrls.map(url => urlToFileUpload(url)) || [];
            }
          } else if (element.element_name.startsWith('videos-')) {
            const uploadZoneId = element.element_name.replace('videos-', '');
            if (dynamicItem.uploadZone && dynamicItem.uploadZone.id === uploadZoneId) {
              // Cargar videos desde video_urls
              dynamicItem.uploadZone.videos = element.video_urls?.map(url => urlToFileUpload(url, true)) || [];
            }
          }
          // Questions
          // Questions are elements that don't start with 'fotos-', 'videos-', or item type prefixes
          // and are not 'mobiliario'. Note: question IDs can contain hyphens (e.g., 'acceso-principal')
          else if (!element.element_name.startsWith('fotos-') &&
                   !element.element_name.startsWith('videos-') &&
                   element.element_name !== 'mobiliario' &&
                   element.element_name !== 'mobiliario-detalle' &&
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
      // Para secciones fijas, buscar elementos por zone_id directamente
      // Primero, obtener todos los IDs de zonas del tipo correcto
      const zoneIdsOfType = zones
        .filter(z => z.zone_type === zoneType)
        .map(z => z.id);
      
      console.log(`[convertSupabaseToChecklist] 🔍 Processing fixed section "${sectionId}":`, {
        zoneType,
        zoneIdsOfType,
        zoneIdsOfTypeCount: zoneIdsOfType.length,
        allZoneIds: zones.map(z => ({ id: z.id, zone_type: z.zone_type })),
        elementsByZoneKeys: Array.from(elementsByZone.keys()),
        elementsByZoneDetails: Array.from(elementsByZone.entries()).map(([zoneId, zoneElements]) => ({
          zoneId,
          zoneFound: zones.find(z => z.id === zoneId) ? 'YES' : 'NO',
          zoneType: zones.find(z => z.id === zoneId)?.zone_type,
          elementsCount: zoneElements.length,
          elementNames: zoneElements.map(e => e.element_name),
        })),
      });
      
      // Buscar elementos que pertenecen a zonas del tipo correcto
      // Primero, obtener todos los elementos de zonas que tienen el zone_type correcto
      const allZoneElements = Array.from(elementsByZone.entries())
        .filter(([zoneId, _]) => {
          const zone = zones.find(z => z.id === zoneId);
          const matches = zone && zone.zone_type === zoneType;
          console.log(`[convertSupabaseToChecklist] 🔍 Checking zone ${zoneId}:`, {
            zoneFound: !!zone,
            zoneType: zone?.zone_type,
            expectedZoneType: zoneType,
            matches,
          });
          return matches;
        })
        .flatMap(([_, elements]) => elements);
      
      // También buscar elementos directamente por zone_id si no se encontraron en el filtro anterior
      // Esto es necesario porque los elementos pueden tener zone_id que no está en zonesOfType
      const directElements = elements.filter(element => {
        const zone = zones.find(z => z.id === element.zone_id);
        const matches = zone && zone.zone_type === zoneType;
        if (element.element_name.startsWith('fotos-') || element.element_name.startsWith('videos-')) {
          console.log(`[convertSupabaseToChecklist] 🔍 Checking direct element ${element.element_name}:`, {
            elementZoneId: element.zone_id,
            zoneFound: !!zone,
            zoneType: zone?.zone_type,
            expectedZoneType: zoneType,
            matches,
          });
        }
        return matches;
      });
      
      // Combinar ambos conjuntos de elementos, evitando duplicados
      const combinedElements = [...allZoneElements];
      directElements.forEach(element => {
        if (!combinedElements.find(e => e.id === element.id)) {
          combinedElements.push(element);
        }
      });
      
      console.log(`[convertSupabaseToChecklist] 📦 Elements for section "${sectionId}":`, {
        allZoneElementsCount: allZoneElements.length,
        directElementsCount: directElements.length,
        combinedElementsCount: combinedElements.length,
        elementNames: combinedElements.map(e => e.element_name),
      });
      
      // Usar combinedElements en lugar de allZoneElements
      const finalElements = combinedElements;

      finalElements.forEach(element => {
        // Upload zones
        if (element.element_name.startsWith('fotos-')) {
          const uploadZoneId = element.element_name.replace('fotos-', '');
          // Asegurar que section.uploadZones existe
          if (!section.uploadZones) {
            section.uploadZones = [];
            console.log(`[convertSupabaseToChecklist] 🔧 Initialized uploadZones array for section "${sectionId}"`);
          }
          let uploadZone = section.uploadZones.find(uz => uz.id === uploadZoneId);
          if (!uploadZone) {
            uploadZone = { id: uploadZoneId, photos: [], videos: [] };
            section.uploadZones.push(uploadZone);
            console.log(`[convertSupabaseToChecklist] ➕ Created new uploadZone "${uploadZoneId}" in section "${sectionId}"`);
          }
          const photoUrls = element.image_urls || [];
          console.log(`[convertSupabaseToChecklist] Loading photos for upload zone "${uploadZoneId}" in section "${sectionId}":`, {
            elementName: element.element_name,
            elementId: element.id,
            elementZoneId: element.zone_id,
            photoUrlsCount: photoUrls.length,
            photoUrls: photoUrls,
            uploadZoneId: uploadZoneId,
            sectionId: sectionId,
            zoneFound: zones.find(z => z.id === element.zone_id) ? 'YES' : 'NO',
            sectionUploadZonesCount: section.uploadZones.length,
            uploadZoneExists: !!uploadZone,
          });
          uploadZone.photos = photoUrls.length > 0 ? photoUrls.map(url => urlToFileUpload(url)) : [];
          console.log(`[convertSupabaseToChecklist] ✅ Loaded ${uploadZone.photos.length} photos for zone ${uploadZoneId}`, {
            uploadZoneId,
            photosCount: uploadZone.photos.length,
            sectionUploadZonesCount: section.uploadZones.length,
            sectionUploadZones: section.uploadZones.map(z => ({ id: z.id, photosCount: z.photos.length })),
          });
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
        // Questions are elements that don't start with 'fotos-', 'videos-', or item type prefixes
        // and are not 'mobiliario'. Note: question IDs can contain hyphens (e.g., 'acceso-principal')
        else if (!element.element_name.startsWith('fotos-') &&
                 !element.element_name.startsWith('videos-') &&
                 element.element_name !== 'mobiliario' &&
                 element.element_name !== 'mobiliario-detalle' &&
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

  // Log final de secciones con fotos antes de retornar
  console.log('[convertSupabaseToChecklist] 📊 Final sections summary:', 
    Object.entries(sections).map(([sectionId, section]) => ({
      sectionId,
      uploadZonesCount: section.uploadZones?.length || 0,
      uploadZones: section.uploadZones?.map(z => ({
        id: z.id,
        photosCount: z.photos.length,
        videosCount: z.videos.length,
      })) || [],
      hasPhotos: section.uploadZones?.some(z => z.photos.length > 0) || false,
    }))
  );

  return { sections };
}

