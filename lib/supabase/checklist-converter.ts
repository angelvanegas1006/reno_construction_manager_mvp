import type { ChecklistData, ChecklistSection, ChecklistQuestion, ChecklistUploadZone, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationItem, ChecklistStatus, FileUpload } from '@/lib/checklist-storage';
import type { Database } from '@/lib/supabase/types';
import type { InspectionType } from '@/hooks/useSupabaseInspection';

type InspectionZone = Database['public']['Tables']['inspection_zones']['Row'];
type InspectionElement = Database['public']['Tables']['inspection_elements']['Row'];
type ZoneInsert = Database['public']['Tables']['inspection_zones']['Insert'];
type ElementInsert = Database['public']['Tables']['inspection_elements']['Insert'];

/**
 * Fuente de verdad: mapeo sectionId -> zone_type y nombres de zona.
 * El hook useSupabaseChecklistBase no debe duplicar este mapeo.
 */
export const SECTION_TO_ZONE_TYPE: Record<string, string> = {
  'entorno-zonas-comunes': 'entorno',
  'estado-general': 'distribucion',
  'entrada-pasillos': 'entrada',
  'habitaciones': 'dormitorio',
  'salon': 'salon',
  'banos': 'bano',
  'cocina': 'cocina',
  'exteriores': 'exterior',
};

/** zone_type que corresponden a secciones fijas (una sola zona por sección). Usado para reparación. */
export const FIXED_ZONE_TYPES = ['entorno', 'distribucion', 'entrada', 'salon', 'cocina', 'exterior'] as const;

/** Orden de secciones para check final (entorno primero). Usado en createInitialZones y saveAllSections. */
export const SECTION_ORDER_FINAL: readonly string[] = [
  'entorno-zonas-comunes',
  'estado-general',
  'entrada-pasillos',
  'habitaciones',
  'salon',
  'banos',
  'cocina',
  'exteriores',
];

/** Orden de secciones para check initial (entorno al final). */
export const SECTION_ORDER_INITIAL: readonly string[] = [
  'estado-general',
  'entrada-pasillos',
  'habitaciones',
  'salon',
  'banos',
  'cocina',
  'exteriores',
  'entorno-zonas-comunes',
];

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

// Estructura por defecto para habitaciones (carpintería y climatización)
const HABITACIONES_CARPENTRY_IDS = ['ventanas', 'persianas', 'armarios'] as const;
const HABITACIONES_CLIMATIZATION_IDS = ['radiadores', 'split-ac'] as const;
const BANOS_CARPENTRY_IDS = ['ventanas', 'persianas'] as const;

// Normaliza un dynamicItem para que tenga estructura completa (carpentryItems, climatizationItems, uploadZone)
function normalizeDynamicItemStructure(
  dynamicItem: ChecklistDynamicItem,
  sectionId: string,
  index: number
): void {
  const baseId = `fotos-video-${sectionId}-${index + 1}`;
  if (!dynamicItem.uploadZone) {
    dynamicItem.uploadZone = { id: baseId, photos: [], videos: [] };
  }
  if (sectionId === 'habitaciones') {
    // Mobiliario: asegurar estructura para que el reporte y multimedia se guarden correctamente
    if (!dynamicItem.mobiliario) {
      dynamicItem.mobiliario = { existeMobiliario: true, question: { id: 'mobiliario' } };
    } else if (!dynamicItem.mobiliario.question) {
      dynamicItem.mobiliario.question = { id: 'mobiliario' };
    }
    if (!dynamicItem.carpentryItems || dynamicItem.carpentryItems.length === 0) {
      dynamicItem.carpentryItems = HABITACIONES_CARPENTRY_IDS.map(id => ({ id, cantidad: 0 }));
    } else {
      // Asegurar que todos los items por defecto existan
      HABITACIONES_CARPENTRY_IDS.forEach(id => {
        if (!dynamicItem.carpentryItems!.find(item => item.id === id)) {
          dynamicItem.carpentryItems!.push({ id, cantidad: 0 });
        }
      });
    }
    if (!dynamicItem.climatizationItems || dynamicItem.climatizationItems.length === 0) {
      dynamicItem.climatizationItems = HABITACIONES_CLIMATIZATION_IDS.map(id => ({ id, cantidad: 0 }));
    } else {
      HABITACIONES_CLIMATIZATION_IDS.forEach(id => {
        if (!dynamicItem.climatizationItems!.find(item => item.id === id)) {
          dynamicItem.climatizationItems!.push({ id, cantidad: 0 });
        }
      });
    }
  } else if (sectionId === 'banos') {
    if (!dynamicItem.carpentryItems || dynamicItem.carpentryItems.length === 0) {
      dynamicItem.carpentryItems = BANOS_CARPENTRY_IDS.map(id => ({ id, cantidad: 0 }));
    } else {
      BANOS_CARPENTRY_IDS.forEach(id => {
        if (!dynamicItem.carpentryItems!.find(item => item.id === id)) {
          dynamicItem.carpentryItems!.push({ id, cantidad: 0 });
        }
      });
    }
  }
}

/** Mapeo de zone_type a nombre de zona para mostrar. Fuente de verdad. */
export const ZONE_TYPE_TO_NAME: Record<string, string> = {
  'entorno': 'Entorno y Zonas Comunes',
  'distribucion': 'Estado General',
  'entrada': 'Entrada y Pasillos',
  'dormitorio': 'Habitación',
  'salon': 'Salón',
  'bano': 'Baño',
  'cocina': 'Cocina',
  'exterior': 'Exteriores',
};

/**
 * Devuelve zone_type y nombre de zona para un sectionId. Fuente única de verdad para el hook.
 * Para secciones fijas devuelve el nombre de la única zona; para dinámicas el nombre base (ej. "Habitación").
 */
export function getZoneConfig(sectionId: string): { zoneType: string; zoneName: string } | null {
  const zoneType = SECTION_TO_ZONE_TYPE[sectionId];
  if (!zoneType) return null;
  const zoneName = ZONE_TYPE_TO_NAME[zoneType];
  if (!zoneName) return null;
  return { zoneType, zoneName };
}

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

  // Secciones dinámicas (habitaciones, banos): crear una zona por habitación/baño
  // Si dynamicItems está vacío (p. ej. al crear inspección) usar dynamicCount para crear las zonas
  if (sectionId === 'habitaciones' || sectionId === 'banos') {
    const count = Math.max(
      section.dynamicItems?.length ?? 0,
      section.dynamicCount ?? 1,
      1
    );
    for (let i = 0; i < count; i++) {
      zones.push({
        inspection_id: inspectionId,
        zone_type: zoneType,
        zone_name: `${ZONE_TYPE_TO_NAME[zoneType]} ${i + 1}`,
      });
    }
  } else if (section.dynamicItems && section.dynamicItems.length > 0) {
    section.dynamicItems.forEach((item, index) => {
      const zoneName = `${ZONE_TYPE_TO_NAME[zoneType]} ${index + 1}`;
      zones.push({
        inspection_id: inspectionId,
        zone_type: zoneType,
        zone_name: zoneName,
      });
    });
  } else {
    // Secciones fijas (salon, cocina, etc.)
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
    // IMPORTANTE: Solo guardar URLs HTTP (fotos ya subidas), NO base64
    // Las fotos en base64 se subirán primero y luego se guardarán con sus URLs
    const photosWithHttp = question.photos?.filter(photo => photo.data && photo.data.startsWith('http')) || [];
    const imageUrls = photosWithHttp.length > 0 ? photosWithHttp.map(photo => photo.data) : null;

    // Nota: badElements se puede incluir en notes si es necesario
    const notesWithBadElements = question.badElements && question.badElements.length > 0
      ? `${question.notes || ''}\nBad elements: ${question.badElements.join(', ')}`.trim()
      : question.notes || null;

    const condition = mapStatusToCondition(question.status);
    
    console.log(`[convertQuestionsToElements] Processing question "${question.id}":`, {
      zoneId,
      questionId: question.id,
      status: question.status,
      condition,
      hasNotes: !!notesWithBadElements,
      notesPreview: notesWithBadElements?.substring(0, 50),
      totalPhotos: question.photos?.length || 0,
      photosWithHttp: photosWithHttp.length,
      photosWithBase64: question.photos?.filter(p => p.data?.startsWith('data:')).length || 0,
      imageUrlsCount: imageUrls?.length || 0,
      willCreateElement: true, // Siempre crear el elemento, incluso si no tiene estado o fotos
    });

    // IMPORTANTE: Siempre crear el elemento para cada pregunta, incluso si no tiene estado, notas o fotos
    // Esto asegura que todas las preguntas se guarden y puedan cargarse después
    elements.push({
      zone_id: zoneId,
      element_name: question.id,
      condition: condition, // Puede ser null si no hay estado seleccionado
      notes: notesWithBadElements, // Puede ser null si no hay notas
      image_urls: imageUrls, // Puede ser null si no hay fotos con URLs HTTP
      quantity: null,
      exists: null,
    });
    
    console.log(`[convertQuestionsToElements] ✅ Created element for question "${question.id}":`, {
      element_name: question.id,
      zone_id: zoneId,
      condition,
      hasNotes: !!notesWithBadElements,
      imageUrlsCount: imageUrls?.length || 0,
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

    console.log(`[convertItemsToElements] Processing ${itemType} item "${item.id}":`, {
      zoneId,
      itemId: item.id,
      cantidad: item.cantidad,
      estado: item.estado,
      hasNotes: !!item.notes,
      notesPreview: item.notes?.substring(0, 50),
      totalPhotos: item.photos?.length || 0,
      unitsCount: item.units?.length || 0,
    });

    if (item.cantidad === 1) {
      // Un solo elemento
      // IMPORTANTE: Solo guardar URLs HTTP (fotos ya subidas), NO base64
      const photosWithHttp = item.photos?.filter(photo => photo.data && photo.data.startsWith('http')) || [];
      const imageUrls = photosWithHttp.length > 0 ? photosWithHttp.map(photo => photo.data) : null;

      // Nota: badElements se puede incluir en notes si es necesario
      const badElements = 'badElements' in item ? item.badElements : undefined;
      const notesWithBadElements = badElements && badElements.length > 0
        ? `${item.notes || ''}\nBad elements: ${badElements.join(', ')}`.trim()
        : item.notes || null;

      const condition = mapStatusToCondition(item.estado);

      console.log(`[convertItemsToElements] Creating element for ${itemType}-${item.id}:`, {
        zoneId,
        elementName: `${itemType}-${item.id}`,
        condition,
        estado: item.estado,
        hasNotes: !!notesWithBadElements,
        notesPreview: notesWithBadElements?.substring(0, 50),
        photosWithHttp: photosWithHttp.length,
        photosWithBase64: item.photos?.filter(p => p.data?.startsWith('data:')).length || 0,
        imageUrlsCount: imageUrls?.length || 0,
        quantity: 1,
      });

      // IMPORTANTE: Siempre crear el elemento si cantidad > 0, incluso si no tiene estado
      elements.push({
        zone_id: zoneId,
        element_name: `${itemType}-${item.id}`,
        condition: condition, // Puede ser null si no hay estado seleccionado
        notes: notesWithBadElements,
        image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
        quantity: 1,
        exists: null,
      });
    } else if (item.units && item.units.length > 0) {
      // Múltiples unidades - crear un elemento por unidad
      item.units.forEach((unit, index) => {
        // IMPORTANTE: Solo guardar URLs HTTP (fotos ya subidas), NO base64
        const photosWithHttp = unit.photos?.filter(photo => photo.data && photo.data.startsWith('http')) || [];
        const imageUrls = photosWithHttp.length > 0 ? photosWithHttp.map(photo => photo.data) : null;

        // Nota: badElements se puede incluir en notes si es necesario
        const badElements = 'badElements' in unit ? unit.badElements : undefined;
        const notesWithBadElements = badElements && badElements.length > 0
          ? `${unit.notes || ''}\nBad elements: ${badElements.join(', ')}`.trim()
          : unit.notes || null;

        const condition = mapStatusToCondition(unit.estado);

        console.log(`[convertItemsToElements] Creating element for ${itemType}-${item.id}-${index + 1}:`, {
          zoneId,
          elementName: `${itemType}-${item.id}-${index + 1}`,
          condition,
          estado: unit.estado,
          hasNotes: !!notesWithBadElements,
          notesPreview: notesWithBadElements?.substring(0, 50),
          photosWithHttp: photosWithHttp.length,
          photosWithBase64: unit.photos?.filter(p => p.data?.startsWith('data:')).length || 0,
          imageUrlsCount: imageUrls?.length || 0,
          quantity: 1,
        });

        // IMPORTANTE: Siempre crear el elemento para cada unidad si cantidad > 0, incluso si no tiene estado
        elements.push({
          zone_id: zoneId,
          element_name: `${itemType}-${item.id}-${index + 1}`,
          condition: condition, // Puede ser null si no hay estado seleccionado
          notes: notesWithBadElements,
          image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
          quantity: 1,
          exists: null,
        });
      });
    }
  });

  console.log(`[convertItemsToElements] Converted ${items.length} items to ${elements.length} elements for zone ${zoneId}`);
  return elements;
}

/**
 * Convierte mobiliario a elementos de inspección.
 * Siempre crea "mobiliario-detalle" cuando hay question (estado + fotos), sin depender del toggle existeMobiliario.
 */
export function convertMobiliarioToElements(
  mobiliario: { existeMobiliario?: boolean; question?: ChecklistQuestion },
  zoneId: string
): ElementInsert[] {
  const elements: ElementInsert[] = [];

  // Elemento principal de mobiliario (exists = true cuando hay question para reportar)
  const hasQuestion = !!mobiliario.question;
  elements.push({
    zone_id: zoneId,
    element_name: 'mobiliario',
    condition: null,
    notes: null,
    image_urls: null,
    quantity: null,
    exists: hasQuestion ? true : (mobiliario.existeMobiliario ?? null),
  });

  // Crear mobiliario-detalle cuando hay question (estado + fotos/notas), para que siempre se guarde el contenido multimedia
  if (mobiliario.question) {
    const photosWithHttp = mobiliario.question.photos?.filter(photo => photo.data && photo.data.startsWith('http')) || [];
    const imageUrls = photosWithHttp.length > 0 ? photosWithHttp.map(photo => photo.data) : null;
    if (process.env.NODE_ENV === 'development') {
      console.log('[convertMobiliarioToElements] mobiliario.question:', {
        zoneId,
        status: mobiliario.question.status,
        photosCount: mobiliario.question.photos?.length ?? 0,
        photosWithHttpCount: photosWithHttp.length,
        imageUrls: imageUrls ?? [],
      });
    }
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

  // Questions (excluir "mobiliario": se persiste vía section.mobiliario → convertMobiliarioToElements)
  if (section.questions && section.questions.length > 0) {
    const questionsWithoutMobiliario = section.questions.filter(q => q.id !== 'mobiliario');
    if (questionsWithoutMobiliario.length > 0) {
      elements.push(...convertQuestionsToElements(questionsWithoutMobiliario, zoneId));
    }
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

/** Inspección con has_elevator para inicializar pregunta ascensor en entorno-zonas-comunes */
export type InspectionForChecklist = { has_elevator?: boolean } | null;

/**
 * Convierte elementos de Supabase de vuelta al formato del checklist
 * @param inspection Opcional: si se pasa y la sección entorno-zonas-comunes no tiene pregunta "ascensor", se añade desde has_elevator (true → buen_estado, false → no_aplica)
 */
export function convertSupabaseToChecklist(
  zones: InspectionZone[],
  elements: InspectionElement[],
  propertyBedrooms: number | null,
  propertyBathrooms: number | null,
  inspection?: InspectionForChecklist
): Partial<ChecklistData> {
  const sections: Record<string, ChecklistSection> = {};

  // Helper para condicionar logs solo en desarrollo
  const DEBUG = process.env.NODE_ENV === 'development';
  const debugLog = (...args: any[]) => {
    if (DEBUG) console.log(...args);
  };
  
  // Log todos los elementos antes de procesar (solo en desarrollo)
  if (DEBUG) {
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
    
    debugLog('[convertSupabaseToChecklist] 🔍 Starting conversion:', {
      zonesCount: zones.length,
      elementsCount: elements.length,
    });
    
    // Log detallado de cada elemento individualmente para facilitar debugging (solo primeros 5 en dev)
    allElementDetails.slice(0, 5).forEach((element, index) => {
      debugLog(`[convertSupabaseToChecklist] Element ${index + 1}:`, element);
    });
    
    if (allElementDetails.length > 5) {
      debugLog(`[convertSupabaseToChecklist] ... and ${allElementDetails.length - 5} more elements`);
    }

    // Log todas las zonas (solo en desarrollo)
    debugLog('[convertSupabaseToChecklist] 📍 All zones:', zones.map(z => ({
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
    debugLog('[convertSupabaseToChecklist] 🔍 Photo element zone IDs:', {
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
  }

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
      debugLog(`[convertSupabaseToChecklist] 📸 Photo element found:`, {
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
  debugLog('[convertSupabaseToChecklist] 🔗 Elements grouped by zone:', 
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
          // Also exclude 'observaciones' from exteriores section (removed per user request)
          else if (!element.element_name.startsWith('fotos-') &&
                   !element.element_name.startsWith('videos-') &&
                   element.element_name !== 'mobiliario' &&
                   element.element_name !== 'mobiliario-detalle' &&
                   element.element_name !== 'observaciones' &&
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
          // Carpentry items dentro de dynamic items
          else if (element.element_name.startsWith('carpentry-')) {
            const itemId = element.element_name.replace(/^carpentry-/, '').replace(/-\d+$/, '');
            const unitMatch = element.element_name.match(/^carpentry-.*-(\d+)$/);
            const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
            
            if (!dynamicItem.carpentryItems) dynamicItem.carpentryItems = [];
            
            let carpentryItem = dynamicItem.carpentryItems.find(item => item.id === itemId);
            if (!carpentryItem) {
              carpentryItem = {
                id: itemId,
                cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
              };
              dynamicItem.carpentryItems.push(carpentryItem);
            }
            
            if (unitIndex !== null) {
              if (!carpentryItem.units) carpentryItem.units = [];
              while (carpentryItem.units.length <= unitIndex) {
                carpentryItem.units.push({ id: `${itemId}-${carpentryItem.units.length + 1}` });
              }
              carpentryItem.units[unitIndex] = {
                id: `${itemId}-${unitIndex + 1}`,
                estado: mapConditionToStatus(element.condition),
                notes: cleanNotesFromBadElements(element.notes) || undefined,
                photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
              };
              carpentryItem.cantidad = Math.max(carpentryItem.cantidad, unitIndex + 1);
            } else {
              carpentryItem.estado = mapConditionToStatus(element.condition);
              carpentryItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
              carpentryItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
              carpentryItem.cantidad = 1;
            }
          }
          // Climatization items dentro de dynamic items
          else if (element.element_name.startsWith('climatization-')) {
            const itemId = element.element_name.replace(/^climatization-/, '').replace(/-\d+$/, '');
            const unitMatch = element.element_name.match(/^climatization-.*-(\d+)$/);
            const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
            
            if (!dynamicItem.climatizationItems) dynamicItem.climatizationItems = [];
            
            let climatizationItem = dynamicItem.climatizationItems.find(item => item.id === itemId);
            if (!climatizationItem) {
              climatizationItem = {
                id: itemId,
                cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
              };
              dynamicItem.climatizationItems.push(climatizationItem);
            }
            
            if (unitIndex !== null) {
              if (!climatizationItem.units) climatizationItem.units = [];
              while (climatizationItem.units.length <= unitIndex) {
                climatizationItem.units.push({ id: `${itemId}-${climatizationItem.units.length + 1}` });
              }
              climatizationItem.units[unitIndex] = {
                id: `${itemId}-${unitIndex + 1}`,
                estado: mapConditionToStatus(element.condition),
                notes: cleanNotesFromBadElements(element.notes) || undefined,
                photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
              };
              climatizationItem.cantidad = Math.max(climatizationItem.cantidad, unitIndex + 1);
            } else {
              climatizationItem.estado = mapConditionToStatus(element.condition);
              climatizationItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
              climatizationItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
              climatizationItem.cantidad = 1;
            }
          }
          // Mobiliario (habitaciones: toggle + question; banos: solo question)
          else if (element.element_name === 'mobiliario-detalle') {
            // Procesar mobiliario-detalle primero: si existe detalle, existe mobiliario
            if (!dynamicItem.mobiliario) {
              dynamicItem.mobiliario = { existeMobiliario: true };
            }
            const mobiliarioPhotos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            dynamicItem.mobiliario.question = {
              id: 'mobiliario',
              status: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: mobiliarioPhotos,
              badElements: extractBadElementsFromNotes(element.notes),
            };
            if (process.env.NODE_ENV === 'development' && mobiliarioPhotos && mobiliarioPhotos.length > 0) {
              console.log('[convertSupabaseToChecklist] 📦 Loaded mobiliario-detalle (dynamic item):', {
                sectionId,
                dynamicItemId: dynamicItem.id,
                zoneId: element.zone_id,
                status: dynamicItem.mobiliario.question?.status,
                photosCount: mobiliarioPhotos.length,
              });
            }
          } else if (element.element_name === 'mobiliario') {
            if (sectionId === 'banos' && element.condition != null) {
              // Banos: mobiliario es una pregunta (sin toggle), guardada con condition
              const question: ChecklistQuestion = {
                id: 'mobiliario',
                status: mapConditionToStatus(element.condition),
                notes: cleanNotesFromBadElements(element.notes) || undefined,
                photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
                badElements: extractBadElementsFromNotes(element.notes),
              };
              if (!dynamicItem.questions) dynamicItem.questions = [];
              const existingIdx = dynamicItem.questions.findIndex((q: ChecklistQuestion) => q.id === 'mobiliario');
              if (existingIdx >= 0) {
                dynamicItem.questions[existingIdx] = { ...dynamicItem.questions[existingIdx], ...question };
              } else {
                dynamicItem.questions.push(question);
              }
            } else {
              // Habitaciones/salón: mobiliario con toggle (exists)
              if (!dynamicItem.mobiliario) {
                dynamicItem.mobiliario = { existeMobiliario: element.exists ?? false };
              } else {
                dynamicItem.mobiliario.existeMobiliario = element.exists ?? false;
              }
            }
          }
        });

        // Normalizar estructura para que todas las habitaciones/baños tengan carpentryItems, climatizationItems, uploadZone
        normalizeDynamicItemStructure(dynamicItem, sectionId, index);

        if (!section.dynamicItems) section.dynamicItems = [];
        section.dynamicItems.push(dynamicItem);
      });
      
      // Actualizar dynamicCount basado en el número de zonas encontradas
      // Esto asegura que el contador refleje el número real de habitaciones/baños
      section.dynamicCount = zonesOfType.length;
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
        // Mobiliario (elemento principal: exists)
        else if (element.element_name === 'mobiliario') {
          if (!section.mobiliario) section.mobiliario = { existeMobiliario: true, question: { id: 'mobiliario' } };
          section.mobiliario.existeMobiliario = element.exists ?? true;
        }
        // Mobiliario detalle (estado, notas, fotos)
        else if (element.element_name === 'mobiliario-detalle') {
          if (!section.mobiliario) section.mobiliario = { existeMobiliario: true, question: { id: 'mobiliario' } };
          const photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
          section.mobiliario.question = {
            ...(section.mobiliario.question || { id: 'mobiliario' }),
            id: 'mobiliario',
            status: mapConditionToStatus(element.condition),
            notes: cleanNotesFromBadElements(element.notes) || undefined,
            photos,
            badElements: extractBadElementsFromNotes(element.notes),
          };
          if (process.env.NODE_ENV === 'development' && photos && photos.length > 0) {
            console.log('[convertSupabaseToChecklist] 📦 Loaded mobiliario-detalle (fixed section):', {
              sectionId,
              zoneId: element.zone_id,
              status: section.mobiliario.question?.status,
              photosCount: photos.length,
            });
          }
        }
        // Questions
        // Questions are elements that don't start with 'fotos-', 'videos-', or item type prefixes
        // and are not 'mobiliario'. Note: question IDs can contain hyphens (e.g., 'acceso-principal')
        // Also exclude 'observaciones' from exteriores section (removed per user request)
        else if (!element.element_name.startsWith('fotos-') &&
                 !element.element_name.startsWith('videos-') &&
                 element.element_name !== 'mobiliario' &&
                 element.element_name !== 'mobiliario-detalle' &&
                 element.element_name !== 'observaciones' &&
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
        // Carpentry items
        if (element.element_name.startsWith('carpentry-')) {
          const itemId = element.element_name.replace(/^carpentry-/, '').replace(/-\d+$/, '');
          const unitMatch = element.element_name.match(/^carpentry-.*-(\d+)$/);
          const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
          
          if (!section.carpentryItems) section.carpentryItems = [];
          
          let carpentryItem = section.carpentryItems.find(item => item.id === itemId);
          if (!carpentryItem) {
            carpentryItem = {
              id: itemId,
              cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
            };
            section.carpentryItems.push(carpentryItem);
          }
          
          if (unitIndex !== null) {
            if (!carpentryItem.units) carpentryItem.units = [];
            while (carpentryItem.units.length <= unitIndex) {
              carpentryItem.units.push({ id: `${itemId}-${carpentryItem.units.length + 1}` });
            }
            carpentryItem.units[unitIndex] = {
              id: `${itemId}-${unitIndex + 1}`,
              estado: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            };
            carpentryItem.cantidad = Math.max(carpentryItem.cantidad, unitIndex + 1);
          } else {
            carpentryItem.estado = mapConditionToStatus(element.condition);
            carpentryItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
            carpentryItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            carpentryItem.cantidad = 1;
          }
        }
        // Climatization items
        else if (element.element_name.startsWith('climatization-')) {
          const itemId = element.element_name.replace(/^climatization-/, '').replace(/-\d+$/, '');
          const unitMatch = element.element_name.match(/^climatization-.*-(\d+)$/);
          const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
          
          if (!section.climatizationItems) section.climatizationItems = [];
          
          let climatizationItem = section.climatizationItems.find(item => item.id === itemId);
          if (!climatizationItem) {
            climatizationItem = {
              id: itemId,
              cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
            };
            section.climatizationItems.push(climatizationItem);
          }
          
          if (unitIndex !== null) {
            if (!climatizationItem.units) climatizationItem.units = [];
            while (climatizationItem.units.length <= unitIndex) {
              climatizationItem.units.push({ id: `${itemId}-${climatizationItem.units.length + 1}` });
            }
            climatizationItem.units[unitIndex] = {
              id: `${itemId}-${unitIndex + 1}`,
              estado: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            };
            climatizationItem.cantidad = Math.max(climatizationItem.cantidad, unitIndex + 1);
          } else {
            climatizationItem.estado = mapConditionToStatus(element.condition);
            climatizationItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
            climatizationItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            climatizationItem.cantidad = 1;
          }
        }
        // Storage items
        else if (element.element_name.startsWith('storage-')) {
          const itemId = element.element_name.replace(/^storage-/, '').replace(/-\d+$/, '');
          const unitMatch = element.element_name.match(/^storage-.*-(\d+)$/);
          const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
          
          if (!section.storageItems) section.storageItems = [];
          
          let storageItem = section.storageItems.find(item => item.id === itemId);
          if (!storageItem) {
            storageItem = {
              id: itemId,
              cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
            };
            section.storageItems.push(storageItem);
          }
          
          if (unitIndex !== null) {
            if (!storageItem.units) storageItem.units = [];
            while (storageItem.units.length <= unitIndex) {
              storageItem.units.push({ id: `${itemId}-${storageItem.units.length + 1}` });
            }
            storageItem.units[unitIndex] = {
              id: `${itemId}-${unitIndex + 1}`,
              estado: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            };
            storageItem.cantidad = Math.max(storageItem.cantidad, unitIndex + 1);
          } else {
            storageItem.estado = mapConditionToStatus(element.condition);
            storageItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
            storageItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            storageItem.cantidad = 1;
          }
        }
      // Appliances items
      else if (element.element_name.startsWith('appliance-')) {
        const itemId = element.element_name.replace(/^appliance-/, '').replace(/-\d+$/, '');
        const unitMatch = element.element_name.match(/^appliance-.*-(\d+)$/);
        const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
        
        if (!section.appliancesItems) section.appliancesItems = [];
        
        let applianceItem = section.appliancesItems.find(item => item.id === itemId);
        if (!applianceItem) {
          applianceItem = {
            id: itemId,
            cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
          };
          section.appliancesItems.push(applianceItem);
        }
        
        if (unitIndex !== null) {
          if (!applianceItem.units) applianceItem.units = [];
          while (applianceItem.units.length <= unitIndex) {
            applianceItem.units.push({ id: `${itemId}-${applianceItem.units.length + 1}` });
          }
          applianceItem.units[unitIndex] = {
            id: `${itemId}-${unitIndex + 1}`,
            estado: mapConditionToStatus(element.condition),
            notes: cleanNotesFromBadElements(element.notes) || undefined,
            photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
          };
          applianceItem.cantidad = Math.max(applianceItem.cantidad, unitIndex + 1);
        } else {
          applianceItem.estado = mapConditionToStatus(element.condition);
          applianceItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
          applianceItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
          applianceItem.cantidad = 1;
        }
      }
        // Security items
        else if (element.element_name.startsWith('security-')) {
          const itemId = element.element_name.replace(/^security-/, '').replace(/-\d+$/, '');
          const unitMatch = element.element_name.match(/^security-.*-(\d+)$/);
          const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
          
          if (!section.securityItems) section.securityItems = [];
          
          let securityItem = section.securityItems.find(item => item.id === itemId);
          if (!securityItem) {
            securityItem = {
              id: itemId,
              cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
            };
            section.securityItems.push(securityItem);
          }
          
          if (unitIndex !== null) {
            if (!securityItem.units) securityItem.units = [];
            while (securityItem.units.length <= unitIndex) {
              securityItem.units.push({ id: `${itemId}-${securityItem.units.length + 1}` });
            }
            securityItem.units[unitIndex] = {
              id: `${itemId}-${unitIndex + 1}`,
              estado: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            };
            securityItem.cantidad = Math.max(securityItem.cantidad, unitIndex + 1);
          } else {
            securityItem.estado = mapConditionToStatus(element.condition);
            securityItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
            securityItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            securityItem.cantidad = 1;
          }
        }
        // Systems items
        else if (element.element_name.startsWith('system-')) {
          const itemId = element.element_name.replace(/^system-/, '').replace(/-\d+$/, '');
          const unitMatch = element.element_name.match(/^system-.*-(\d+)$/);
          const unitIndex = unitMatch ? parseInt(unitMatch[1]) - 1 : null;
          
          if (!section.systemsItems) section.systemsItems = [];
          
          let systemItem = section.systemsItems.find(item => item.id === itemId);
          if (!systemItem) {
            systemItem = {
              id: itemId,
              cantidad: unitIndex !== null ? (unitIndex + 1) : 1,
            };
            section.systemsItems.push(systemItem);
          }
          
          if (unitIndex !== null) {
            if (!systemItem.units) systemItem.units = [];
            while (systemItem.units.length <= unitIndex) {
              systemItem.units.push({ id: `${itemId}-${systemItem.units.length + 1}` });
            }
            systemItem.units[unitIndex] = {
              id: `${itemId}-${unitIndex + 1}`,
              estado: mapConditionToStatus(element.condition),
              notes: cleanNotesFromBadElements(element.notes) || undefined,
              photos: element.image_urls?.map(url => urlToFileUpload(url)) || undefined,
            };
            systemItem.cantidad = Math.max(systemItem.cantidad, unitIndex + 1);
          } else {
            systemItem.estado = mapConditionToStatus(element.condition);
            systemItem.notes = cleanNotesFromBadElements(element.notes) || undefined;
            systemItem.photos = element.image_urls?.map(url => urlToFileUpload(url)) || undefined;
            systemItem.cantidad = 1;
          }
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
      
      // Inicializar pregunta ascensor en entorno-zonas-comunes desde inspection.has_elevator si no existe elemento
      if (sectionId === 'entorno-zonas-comunes' && inspection != null && inspection.has_elevator !== undefined) {
        const hasAscensorQuestion = section.questions?.some(q => q.id === 'ascensor');
        if (!hasAscensorQuestion) {
          if (!section.questions) section.questions = [];
          section.questions.push({
            id: 'ascensor',
            status: inspection.has_elevator ? 'buen_estado' : 'no_aplica',
          });
        }
      }
      
      // After processing all elements, ensure all items are initialized for cocina section
      if (sectionId === 'cocina') {
        // Initialize appliancesItems
        if (!section.appliancesItems) section.appliancesItems = [];
        const ALL_APPLIANCES_IDS = [
          'placa-gas',
          'placa-vitro-induccion',
          'campana-extractora',
          'horno',
          'nevera',
          'lavadora',
          'lavavajillas',
          'microondas',
        ];
        ALL_APPLIANCES_IDS.forEach(applianceId => {
          if (!section.appliancesItems!.find(item => item.id === applianceId)) {
            section.appliancesItems!.push({
              id: applianceId,
              cantidad: 0,
            });
          }
        });
        
        // Initialize storageItems
        if (!section.storageItems) section.storageItems = [];
        const ALL_STORAGE_IDS = [
          'armarios-despensa',
          'cuarto-lavado',
        ];
        ALL_STORAGE_IDS.forEach(storageId => {
          if (!section.storageItems!.find(item => item.id === storageId)) {
            section.storageItems!.push({
              id: storageId,
              cantidad: 0,
            });
          }
        });
        
        // Initialize carpentryItems
        if (!section.carpentryItems) section.carpentryItems = [];
        const ALL_CARPENTRY_IDS = [
          'ventanas',
          'persianas',
        ];
        ALL_CARPENTRY_IDS.forEach(carpentryId => {
          if (!section.carpentryItems!.find(item => item.id === carpentryId)) {
            section.carpentryItems!.push({
              id: carpentryId,
              cantidad: 0,
            });
          }
        });
      }
      
      // After processing all elements, ensure all items are initialized for exteriores section
      if (sectionId === 'exteriores') {
        // Initialize securityItems
        if (!section.securityItems) section.securityItems = [];
        const ALL_SECURITY_IDS = [
          'barandillas',
          'rejas',
        ];
        ALL_SECURITY_IDS.forEach(securityId => {
          if (!section.securityItems!.find(item => item.id === securityId)) {
            section.securityItems!.push({
              id: securityId,
              cantidad: 0,
            });
          }
        });
        
        // Initialize systemsItems
        if (!section.systemsItems) section.systemsItems = [];
        const ALL_SYSTEMS_IDS = [
          'tendedero-exterior',
          'toldos',
        ];
        ALL_SYSTEMS_IDS.forEach(systemId => {
          if (!section.systemsItems!.find(item => item.id === systemId)) {
            section.systemsItems!.push({
              id: systemId,
              cantidad: 0,
            });
          }
        });
      }
    }
  });

  // Log final de secciones con fotos antes de retornar (solo en desarrollo)
  if (DEBUG) {
    debugLog('[convertSupabaseToChecklist] 📊 Final sections summary:', 
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
  }

  return { sections };
}

