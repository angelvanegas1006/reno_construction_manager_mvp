// Settlements storage - temporary frontend storage similar to partners

export type SettlementStage = 
  | "verificacion-documentacion"
  | "aprobacion-hipoteca"
  | "coordinacion-firma-escritura"
  | "aguardando-firma-compraventa"
  | "finalizadas"
  | "canceladas";

export interface SettlementProperty {
  id: string;
  propertyId: string; // Reference to Property.id if exists
  fullAddress: string;
  address?: string;
  currentStage: SettlementStage;
  createdAt: string;
  updatedAt: string;
  // Settlement-specific fields
  notaryName?: string;
  notaryDate?: string; // ISO date string
  signingDate?: string; // ISO date string
  estimatedSigningDate?: string; // ISO date string
  documentsStatus?: {
    escritura?: boolean;
    notaSimple?: boolean;
    certificadoEnergetico?: boolean;
    otros?: boolean;
  };
  notes?: string;
  analyst?: string;
  completion?: number;
  timeInStage: string;
}

const STORAGE_KEY = "vistral_settlements";

// Get all settlement properties from localStorage
export function getAllSettlementProperties(): SettlementProperty[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as SettlementProperty[];
  } catch {
    return [];
  }
}

// Save a settlement property to localStorage
export function saveSettlementProperty(settlement: SettlementProperty): void {
  if (typeof window === "undefined") return;
  
  const settlements = getAllSettlementProperties();
  const index = settlements.findIndex(s => s.id === settlement.id);
  
  if (index === -1) {
    settlements.push(settlement);
  } else {
    settlements[index] = {
      ...settlement,
      updatedAt: new Date().toISOString(),
    };
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settlements));
}

// Get settlement property by ID
export function getSettlementPropertyById(id: string): SettlementProperty | null {
  const settlements = getAllSettlementProperties();
  return settlements.find(s => s.id === id) || null;
}

// Update settlement property
export function updateSettlementProperty(id: string, updates: Partial<SettlementProperty>): void {
  if (typeof window === "undefined") return;
  
  const settlements = getAllSettlementProperties();
  const index = settlements.findIndex(s => s.id === id);
  
  if (index === -1) return;
  
  settlements[index] = {
    ...settlements[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settlements));
}

// Delete settlement property
export function deleteSettlementProperty(id: string): void {
  if (typeof window === "undefined") return;
  
  const settlements = getAllSettlementProperties();
  const filtered = settlements.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Generate a new settlement property ID
function generateSettlementId(): string {
  const settlements = getAllSettlementProperties();
  const maxId = settlements.reduce((max, s) => {
    const num = parseInt(s.id);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  
  return (maxId + 1).toString().padStart(7, "0");
}

// Create a new settlement property
export function createSettlementProperty(
  propertyId: string,
  fullAddress: string,
  address?: string
): SettlementProperty {
  const id = generateSettlementId();
  const now = new Date();
  
  return {
    id,
    propertyId,
    fullAddress,
    address: address || fullAddress,
    currentStage: "verificacion-documentacion",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    timeInStage: "0 días",
    documentsStatus: {
      escritura: false,
      notaSimple: false,
      certificadoEnergetico: false,
      otros: false,
    },
  };
}

