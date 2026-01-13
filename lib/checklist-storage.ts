// Checklist types - Scalable structure for multiple checklist types
export type ChecklistType = 
  | "partner_initial"
  | "reno_initial"
  | "reno_intermediate"
  | "reno_final";

export type ChecklistStatus = 
  | "buen_estado"
  | "necesita_reparacion"
  | "necesita_reemplazo"
  | "no_aplica";

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64
  uploadedAt: string;
}

// Base structure for checklist questions
export interface ChecklistQuestion {
  id: string;
  status?: ChecklistStatus;
  notes?: string;
  photos?: FileUpload[];
  badElements?: string[]; // IDs of elements that are in bad condition
}

// Upload zone data
export interface ChecklistUploadZone {
  id: string;
  photos: FileUpload[];
  videos: FileUpload[];
}

// Dynamic section data (for Habitaciones, Baños, etc.)
export interface ChecklistDynamicItem {
  id: string; // e.g., "habitacion-1", "bano-2"
  questions?: ChecklistQuestion[];
  uploadZone?: ChecklistUploadZone;
  carpentryItems?: ChecklistCarpentryItem[]; // For Habitaciones carpentry section
  climatizationItems?: ChecklistClimatizationItem[]; // For Habitaciones climatization section
  mobiliario?: {
    existeMobiliario?: boolean;
    question?: ChecklistQuestion; // Question when existeMobiliario is true
  };
}

// Individual climatization unit (for when cantidad > 1)
export interface ChecklistClimatizationUnit {
  id: string; // e.g., "radiador-1", "split-ac-2"
  estado?: ChecklistStatus;
  notes?: string;
  photos?: FileUpload[];
  badElements?: string[]; // IDs of elements that are in bad condition
}

// Climatization item (for Estado General section)
export interface ChecklistClimatizationItem {
  id: string; // e.g., "radiadores", "split-ac", "calentador-agua", "calefaccion-conductos"
  cantidad: number;
  units?: ChecklistClimatizationUnit[]; // Individual units when cantidad > 1
  estado?: ChecklistStatus; // Single estado when cantidad = 1
  notes?: string; // Single notes when cantidad = 1
  photos?: FileUpload[]; // Single photos when cantidad = 1
}

// Carpentry item (for Entrada Pasillos section) - same structure as ClimatizationItem
export interface ChecklistCarpentryItem {
  id: string; // e.g., "ventanas", "persianas", "armarios"
  cantidad: number;
  units?: ChecklistClimatizationUnit[]; // Reuse same unit structure
  estado?: ChecklistStatus;
  notes?: string;
  photos?: FileUpload[];
  badElements?: string[]; // IDs of elements that are in bad condition (when cantidad = 1)
}

// Storage items (same structure as carpentry items)
export interface ChecklistStorageItem extends ChecklistCarpentryItem {}

// Appliances items (same structure as carpentry items)
export interface ChecklistApplianceItem extends ChecklistCarpentryItem {}

// Security items (same structure as carpentry items, but without badElements)
export interface ChecklistSecurityItem {
  id: string;
  cantidad: number;
  units?: ChecklistClimatizationUnit[]; // Individual units when cantidad > 1
  estado?: ChecklistStatus; // Single estado when cantidad = 1
  notes?: string; // Single notes when cantidad = 1
  photos?: FileUpload[]; // Single photos when cantidad = 1
}

// Systems items (same structure as security items)
export interface ChecklistSystemItem extends ChecklistSecurityItem {}

// Checklist section data
export interface ChecklistSection {
  id: string;
  uploadZones?: ChecklistUploadZone[]; // Multiple upload zones (e.g., Portal, Fachada, Entorno)
  questions?: ChecklistQuestion[];
  dynamicItems?: ChecklistDynamicItem[]; // For Habitaciones, Baños with counters
  dynamicCount?: number; // Current count for dynamic sections (habitaciones, banos)
  climatizationItems?: ChecklistClimatizationItem[]; // For Estado General climatization section
  carpentryItems?: ChecklistCarpentryItem[]; // For Entrada Pasillos carpentry section, Cocina carpentry
  storageItems?: ChecklistStorageItem[]; // For Cocina storage section
  appliancesItems?: ChecklistApplianceItem[]; // For Cocina appliances section
  securityItems?: ChecklistSecurityItem[]; // For Exteriores security section
  systemsItems?: ChecklistSystemItem[]; // For Exteriores systems section
  mobiliario?: {
    existeMobiliario?: boolean;
    question?: ChecklistQuestion; // Question when existeMobiliario is true
  };
}

// Complete checklist data
export interface ChecklistData {
  propertyId: string;
  checklistType: ChecklistType;
  sections: Record<string, ChecklistSection>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "vistral_checklist_";

// Generate storage key for a checklist
function getStorageKey(propertyId: string, checklistType: ChecklistType): string {
  return `${STORAGE_KEY_PREFIX}${propertyId}_${checklistType}`;
}

// Get checklist by property ID and type
export function getChecklist(
  propertyId: string,
  checklistType: ChecklistType
): ChecklistData | null {
  if (typeof window === "undefined") return null;
  
  const key = getStorageKey(propertyId, checklistType);
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as ChecklistData;
  } catch {
    return null;
  }
}

// Save or update checklist
export function saveChecklist(checklist: ChecklistData): void {
  if (typeof window === "undefined") return;
  
  const key = getStorageKey(checklist.propertyId, checklist.checklistType);
  const updated = {
    ...checklist,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(updated));
}

// Create a new checklist
export function createChecklist(
  propertyId: string,
  checklistType: ChecklistType,
  initialSections?: Record<string, ChecklistSection>
): ChecklistData {
  const now = new Date().toISOString();
  
  const checklist: ChecklistData = {
    propertyId,
    checklistType,
    sections: initialSections || {},
    createdAt: now,
    updatedAt: now,
  };
  
  saveChecklist(checklist);
  return checklist;
}

// Update checklist section
export function updateChecklistSection(
  propertyId: string,
  checklistType: ChecklistType,
  sectionId: string,
  sectionData: Partial<ChecklistSection>
): void {
  const checklist = getChecklist(propertyId, checklistType);
  if (!checklist) {
    // Create new checklist if it doesn't exist
    createChecklist(propertyId, checklistType, {
      [sectionId]: sectionData as ChecklistSection,
    });
    return;
  }
  
  const currentSection = checklist.sections[sectionId] || {};
  const updatedSection: ChecklistSection = {
    ...currentSection,
    ...sectionData,
  };
  
  // Ensure dynamicItems is a new array reference if it's being updated
  if (sectionData.dynamicItems !== undefined) {
    updatedSection.dynamicItems = [...sectionData.dynamicItems];
  }
  
  checklist.sections[sectionId] = updatedSection;
  
  saveChecklist(checklist);
}

// Delete checklist
export function deleteChecklist(
  propertyId: string,
  checklistType: ChecklistType
): void {
  if (typeof window === "undefined") return;
  
  const key = getStorageKey(propertyId, checklistType);
  localStorage.removeItem(key);
}

