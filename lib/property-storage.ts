// Property types matching the user story
export type PropertyType = 
  | "Piso"
  | "Casa"
  | "Ático"
  | "Dúplex"
  | "Estudio"
  | "Loft"
  | "Casa adosada"
  | "Local comercial"
  | "Edificio"
  | "Casa con terreno"
  | "Terreno"
  | "Obra nueva"
  | "Residencia"
  | "En construcción"
  | "Garaje"
  | "Trastero";

export type PropertyStage = 
  | "draft"
  | "review"
  | "needs-correction"
  | "negotiation"
  | "pending-arras"
  | "settlement"
  | "sold"
  | "rejected";

// Extended property data types
export type Orientation = "Norte" | "Sur" | "Este" | "Oeste";

export type InquilinoSituation = 
  | "Los inquilinos permanecen"
  | "El inmueble se entregará libre"
  | "Está ocupado ilegalmente";

export type SubrogacionContrato = 
  | "Con subrogación"
  | "Sin subrogación";

export type EstadoSeguroAlquiler = 
  | "En vigor"
  | "Caducado";

// Datos del Vendedor
export interface VendedorData {
  nombreCompleto?: string;
  dniNifCif?: string;
  email?: string;
  telefonoPais?: string; // Country code (e.g., "+34")
  telefonoNumero?: string;
  dniAdjunto?: FileUpload[]; // Multiple files allowed
}

// Datos del Inquilino
export interface InquilinoData {
  nombreCompleto?: string;
  email?: string;
  telefonoPais?: string;
  telefonoNumero?: string;
  dniNie?: FileUpload[];
  contratoArrendamiento?: FileUpload[];
  fechaFinalizacionContrato?: string; // ISO date string
  periodoPreaviso?: number; // in days
  subrogacionContrato?: SubrogacionContrato;
  importeAlquilerTransferir?: number; // €/mes
  ultimaActualizacionAlquiler?: string; // ISO date string
  justificantesPago?: FileUpload[];
  fechaUltimoRecibo?: string; // ISO date string
  comprobanteTransferenciaVendedor?: FileUpload[];
  justificanteDeposito?: FileUpload[];
  fechaVencimientoSeguroAlquiler?: string; // ISO date string
  estadoSeguroAlquiler?: EstadoSeguroAlquiler;
  proveedorSeguroAlquiler?: string;
}

export interface PropertyData {
  // Información de la propiedad
  tipoPropiedad?: PropertyType;
  superficieConstruida?: number;
  superficieUtil?: number;
  anoConstruccion?: number;
  referenciaCatastral?: string;
  habitaciones?: number;
  banos?: number;
  plazasAparcamiento?: number;
  ascensor?: boolean;
  balconTerraza?: boolean;
  trastero?: boolean;
  orientacion?: Orientation[];

  // Información económica
  precioVenta?: number;
  gastosComunidad?: number;
  confirmacionGastosComunidad?: boolean;
  ibiAnual?: number;
  confirmacionIBI?: boolean;

  // Estado legal y de comunidad
  comunidadPropietariosConstituida?: boolean;
  edificioSeguroActivo?: boolean;
  comercializaExclusiva?: boolean;
  edificioITEfavorable?: boolean;
  propiedadAlquilada?: boolean;
  situacionInquilinos?: InquilinoSituation;

  // Documentación mínima
  videoGeneral?: FileUpload[];
  notaSimpleRegistro?: FileUpload[];
  certificadoEnergetico?: FileUpload[];

  // Datos del Vendedor (array de propietarios)
  vendedores?: VendedorData[];

  // Datos del Inquilino
  inquilino?: InquilinoData;
}

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64
  uploadedAt: string;
}

export interface Property {
  id: string;
  fullAddress: string; // Standardized address from Google Maps
  planta?: string;
  puerta?: string;
  bloque?: string;
  escalera?: string;
  propertyType: PropertyType;
  currentStage: PropertyStage;
  address?: string; // Display address
  price?: number;
  analyst?: string;
  completion?: number;
  correctionsCount?: number;
  timeInStage: string;
  timeCreated?: string;
  createdAt: string;
  // Extended data
  data?: PropertyData;
  lastSaved?: string;
  // Reno Construction Manager fields
  ultimaActualizacion?: string; // ISO date string
  proximaActualizacion?: string; // ISO date string
  inicio?: string; // ISO date string - start of renovation
  finEst?: string; // ISO date string - estimated end date
  region?: string; // e.g., "Vega Baja" - region info (not a tag)
  renoType?: string; // e.g., "Light Reno"
  renovador?: string; // e.g., "LyR"
  // Upcoming Settlements phase fields
  estimatedVisitDate?: string; // ISO date string - estimated date for pre-settlement technical visit
  setupStatusNotes?: string; // Free-text field for property preparation status notes
  // Initial Check phase fields
  realSettlementDate?: string; // ISO date string - real settlement/signing date (read-only)
  // Final Check phase fields
  realCompletionDate?: string; // ISO date string - real completion date of renovation (read-only)
  estimatedFinalVisitDate?: string; // ISO date string - estimated date for final check visit
  // Supabase fields
  uniqueIdFromEngagements?: string; // Unique ID From Engagements from Supabase (for display)
  renoPhase?: string; // Reno phase from Supabase (e.g., "upcoming-settlements", "initial-check", etc.)
  // Additional Supabase fields
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
}

const STORAGE_KEY = "vistral_properties";

// Get all properties from localStorage
export function getAllProperties(): Property[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as Property[];
  } catch {
    return [];
  }
}

// Save a property to localStorage
export function saveProperty(property: Property): void {
  if (typeof window === "undefined") return;
  
  const properties = getAllProperties();
  properties.push(property);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

// Check if a duplicate property exists
export function checkDuplicateProperty(
  fullAddress: string,
  planta?: string,
  puerta?: string,
  bloque?: string,
  escalera?: string
): Property | null {
  const properties = getAllProperties();
  
  // Active stages (not sold or rejected)
  const activeStages: PropertyStage[] = [
    "draft",
    "review",
    "needs-correction",
    "negotiation",
    "pending-arras",
    "settlement",
  ];
  
  // Check for exact match: normalized address + all auxiliary fields match
  const normalizedAddress = fullAddress.toLowerCase().trim();
  
  return properties.find((prop) => {
    if (!activeStages.includes(prop.currentStage)) return false;
    
    const propAddressNormalized = prop.fullAddress.toLowerCase().trim();
    
    // Address must match exactly
    if (propAddressNormalized !== normalizedAddress) return false;
    
    // All auxiliary fields must match (including undefined/null)
    const propPlanta = prop.planta?.toLowerCase().trim() || "";
    const propPuerta = prop.puerta?.toLowerCase().trim() || "";
    const propBloque = prop.bloque?.toLowerCase().trim() || "";
    const propEscalera = prop.escalera?.toLowerCase().trim() || "";
    
    const inputPlanta = planta?.toLowerCase().trim() || "";
    const inputPuerta = puerta?.toLowerCase().trim() || "";
    const inputBloque = bloque?.toLowerCase().trim() || "";
    const inputEscalera = escalera?.toLowerCase().trim() || "";
    
    return (
      propPlanta === inputPlanta &&
      propPuerta === inputPuerta &&
      propBloque === inputBloque &&
      propEscalera === inputEscalera
    );
  }) || null;
}

// Generate a new property ID
function generatePropertyId(): string {
  const properties = getAllProperties();
  const maxId = properties.reduce((max, prop) => {
    const num = parseInt(prop.id);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  
  return (maxId + 1).toString().padStart(7, "0");
}

// Create a new property
export function createProperty(
  fullAddress: string,
  propertyType: PropertyType,
  planta?: string,
  puerta?: string,
  bloque?: string,
  escalera?: string
): Property {
  const id = generatePropertyId();
  const now = new Date();
  
  return {
    id,
    fullAddress,
    planta,
    puerta,
    bloque,
    escalera,
    propertyType,
    currentStage: "draft",
    address: fullAddress, // For display purposes
    timeInStage: "0 días",
    timeCreated: "0 días",
    createdAt: now.toISOString(),
    // Initialize data with tipoPropiedad from propertyType and default vendedor
    data: {
      tipoPropiedad: propertyType,
      vendedores: [{}], // At least one vendedor by default
    },
  };
}

// Get property by ID
export function getPropertyById(id: string): Property | null {
  const properties = getAllProperties();
  return properties.find((prop) => prop.id === id) || null;
}

// Update property
export function updateProperty(id: string, updates: Partial<Property>): void {
  if (typeof window === "undefined") return;
  
  const properties = getAllProperties();
  const index = properties.findIndex((prop) => prop.id === id);
  
  if (index === -1) return;
  
  properties[index] = {
    ...properties[index],
    ...updates,
    lastSaved: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

// Delete property
export function deleteProperty(id: string): void {
  if (typeof window === "undefined") return;
  
  const properties = getAllProperties();
  const filtered = properties.filter((prop) => prop.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Submit property to review
export function submitPropertyToReview(id: string): void {
  const property = getPropertyById(id);
  if (!property) return;
  
  updateProperty(id, {
    currentStage: "review",
    timeInStage: "0 días",
  });
}

