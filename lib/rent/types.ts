/**
 * Types for Rent Management module
 */

export type RentPropertyStatus = 'available' | 'rented' | 'maintenance' | 'unavailable';
export type TenantStatus = 'active' | 'inactive' | 'past';
export type ContractStatus = 'active' | 'expired' | 'terminated';

export interface RentProperty {
  id: string;
  property_id?: string | null;
  address: string;
  monthly_rent?: number | null;
  status: RentPropertyStatus | string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_meters?: number | null;
  description?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RentTenant {
  id: string;
  property_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  id_number?: string | null;
  status: TenantStatus | string;
  notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RentContract {
  id: string;
  tenant_id: string | null;
  property_id: string | null;
  start_date: string;
  end_date?: string | null;
  monthly_rent: number;
  deposit?: number | null;
  status: ContractStatus;
  contract_number?: string | null;
  notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RentTenantWithProperty extends RentTenant {
  property?: RentProperty | null;
}

export interface RentPropertyWithTenants extends RentProperty {
  tenants?: RentTenant[];
  active_contract?: RentContract | null;
}

// ============================================
// Tipos para integración con Idealista
// ============================================

export type IdealistaListingStatus = 'draft' | 'publishing' | 'published' | 'paused' | 'error';
export type IdealistaLeadStatus = 'pending_qualification' | 'qualified' | 'contacted' | 'converted' | 'rejected';

export interface IdealistaListing {
  id: string;
  property_id: string;
  idealista_listing_id?: string | null;
  status: IdealistaListingStatus;
  published_at?: string | null;
  paused_at?: string | null;
  idealista_url?: string | null;
  metadata?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdealistaLead {
  id: string;
  listing_id?: string | null;
  property_id: string;
  idealista_lead_id?: string | null;
  status: IdealistaLeadStatus;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  original_message?: string | null;
  received_at: string;
  qualified_at?: string | null;
  qualification_data?: IdealistaQualificationData | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdealistaQualificationData {
  presupuesto?: number | null;
  fecha_entrada?: string | null; // ISO date string
  duracion?: number | null; // Meses
  perfil?: string | null; // 'estudiante', 'profesional', 'familia', etc.
  score?: number | null; // 0-100
}

export interface IdealistaPhoto {
  id: string;
  listing_id: string;
  photo_url: string;
  idealista_photo_id?: string | null;
  photo_order: number;
  created_at: string;
}

// Payload para publicar en Idealista
export interface IdealistaPublishPayload {
  property_id: string;
  address: string;
  monthly_rent: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  description?: string;
  photos: string[]; // URLs de las fotos
  city?: string;
  zip_code?: string;
  country?: string;
}

// Payload del bot de IA para leads cualificados
export interface IdealistaQualifiedLeadPayload {
  property_id: string;
  idealista_lead_id?: string; // Opcional, si viene del webhook
  qualification_data: IdealistaQualificationData;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  original_message?: string;
}

