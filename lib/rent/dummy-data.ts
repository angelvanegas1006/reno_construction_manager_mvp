/**
 * Datos dummy para desarrollo y testing de la integración con Idealista
 */

import { RentProperty, IdealistaListing, IdealistaLead } from './types';

// Propiedades dummy completas
export const dummyProperties: RentProperty[] = [
  {
    id: 'prop-1',
    property_id: null,
    address: 'Calle Gran Vía 45, 3º B',
    monthly_rent: 1200,
    status: 'available',
    bedrooms: 2,
    bathrooms: 1,
    square_meters: 75,
    description: 'Apartamento luminoso en el centro de Madrid, completamente reformado. Incluye balcón y ascensor.',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'prop-2',
    property_id: null,
    address: 'Avenida de la Paz 12, 1º A',
    monthly_rent: 950,
    status: 'available',
    bedrooms: 1,
    bathrooms: 1,
    square_meters: 55,
    description: 'Estudio moderno en zona residencial, cerca de transporte público y servicios.',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: 'prop-3',
    property_id: null,
    address: 'Calle Serrano 88, 5º C',
    monthly_rent: 1800,
    status: 'available',
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 110,
    description: 'Piso amplio en zona exclusiva, con terraza y vistas. Perfecto para familias.',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString(),
  },
  {
    id: 'prop-4',
    property_id: null,
    address: 'Plaza Mayor 5, 2º D',
    monthly_rent: 1400,
    status: 'available',
    bedrooms: 2,
    bathrooms: 2,
    square_meters: 85,
    description: 'Apartamento céntrico con dos baños, ideal para compartir. Zona muy bien comunicada.',
    created_at: new Date('2024-02-10').toISOString(),
    updated_at: new Date('2024-02-10').toISOString(),
  },
  {
    id: 'prop-5',
    property_id: null,
    address: 'Calle Alcalá 200, 4º E',
    monthly_rent: 1100,
    status: 'available',
    bedrooms: 2,
    bathrooms: 1,
    square_meters: 70,
    description: 'Piso recién reformado, muy luminoso. Incluye plaza de garaje opcional.',
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date('2024-02-15').toISOString(),
  },
];

// Listings de Idealista con diferentes estados
export const dummyListings: IdealistaListing[] = [
  {
    id: 'listing-1',
    property_id: 'prop-1',
    idealista_listing_id: 'idealista-12345',
    status: 'published',
    published_at: new Date('2024-01-16').toISOString(),
    paused_at: null,
    idealista_url: 'https://www.idealista.com/inmueble/12345/',
    metadata: { views: 245, favorites: 12 },
    error_message: null,
    created_at: new Date('2024-01-16').toISOString(),
    updated_at: new Date('2024-01-16').toISOString(),
  },
  {
    id: 'listing-2',
    property_id: 'prop-2',
    idealista_listing_id: null,
    status: 'draft',
    published_at: null,
    paused_at: null,
    idealista_url: null,
    metadata: null,
    error_message: null,
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: 'listing-3',
    property_id: 'prop-3',
    idealista_listing_id: 'idealista-67890',
    status: 'published',
    published_at: new Date('2024-02-02').toISOString(),
    paused_at: null,
    idealista_url: 'https://www.idealista.com/inmueble/67890/',
    metadata: { views: 189, favorites: 8 },
    error_message: null,
    created_at: new Date('2024-02-02').toISOString(),
    updated_at: new Date('2024-02-02').toISOString(),
  },
  {
    id: 'listing-4',
    property_id: 'prop-4',
    idealista_listing_id: 'idealista-11111',
    status: 'paused',
    published_at: new Date('2024-02-11').toISOString(),
    paused_at: new Date('2024-02-20').toISOString(),
    idealista_url: 'https://www.idealista.com/inmueble/11111/',
    metadata: { views: 67, favorites: 3 },
    error_message: null,
    created_at: new Date('2024-02-11').toISOString(),
    updated_at: new Date('2024-02-20').toISOString(),
  },
  {
    id: 'listing-5',
    property_id: 'prop-5',
    idealista_listing_id: null,
    status: 'error',
    published_at: null,
    paused_at: null,
    idealista_url: null,
    metadata: null,
    error_message: 'Error al subir fotos: formato no soportado',
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date('2024-02-15').toISOString(),
  },
];

// Leads con diferentes estados
export const dummyLeads: IdealistaLead[] = [
  {
    id: 'lead-1',
    listing_id: 'listing-1',
    property_id: 'prop-1',
    idealista_lead_id: 'idealista-lead-001',
    status: 'qualified',
    contact_name: 'María González',
    contact_phone: '+34 612 345 678',
    contact_email: 'maria.gonzalez@email.com',
    original_message: 'Hola, estoy interesada en el apartamento. ¿Está disponible para verlo esta semana?',
    received_at: new Date('2024-01-18T10:30:00').toISOString(),
    qualified_at: new Date('2024-01-18T10:35:00').toISOString(),
    qualification_data: {
      presupuesto: 1300,
      fecha_entrada: '2024-03-01',
      duracion: 12,
      perfil: 'profesional',
      score: 85,
    },
    notes: null,
    created_at: new Date('2024-01-18T10:30:00').toISOString(),
    updated_at: new Date('2024-01-18T10:35:00').toISOString(),
  },
  {
    id: 'lead-2',
    listing_id: 'listing-1',
    property_id: 'prop-1',
    idealista_lead_id: 'idealista-lead-002',
    status: 'contacted',
    contact_name: 'Juan Pérez',
    contact_phone: '+34 623 456 789',
    contact_email: 'juan.perez@email.com',
    original_message: 'Buenos días, me gustaría más información sobre el piso.',
    received_at: new Date('2024-01-19T14:20:00').toISOString(),
    qualified_at: new Date('2024-01-19T14:25:00').toISOString(),
    qualification_data: {
      presupuesto: 1200,
      fecha_entrada: '2024-02-15',
      duracion: 6,
      perfil: 'estudiante',
      score: 65,
    },
    notes: 'Llamado el 20/01. Interesado pero necesita más tiempo.',
    created_at: new Date('2024-01-19T14:20:00').toISOString(),
    updated_at: new Date('2024-01-20T09:00:00').toISOString(),
  },
  {
    id: 'lead-3',
    listing_id: 'listing-1',
    property_id: 'prop-1',
    idealista_lead_id: 'idealista-lead-003',
    status: 'pending_qualification',
    contact_name: 'Ana Martínez',
    contact_phone: '+34 634 567 890',
    contact_email: null,
    original_message: '¿Tiene garaje?',
    received_at: new Date('2024-01-22T16:45:00').toISOString(),
    qualified_at: null,
    qualification_data: null,
    notes: null,
    created_at: new Date('2024-01-22T16:45:00').toISOString(),
    updated_at: new Date('2024-01-22T16:45:00').toISOString(),
  },
  {
    id: 'lead-4',
    listing_id: 'listing-3',
    property_id: 'prop-3',
    idealista_lead_id: 'idealista-lead-004',
    status: 'converted',
    contact_name: 'Carlos Ruiz',
    contact_phone: '+34 645 678 901',
    contact_email: 'carlos.ruiz@email.com',
    original_message: 'Somos una familia de 4 personas buscando un piso amplio. ¿Podríamos verlo?',
    received_at: new Date('2024-02-05T11:15:00').toISOString(),
    qualified_at: new Date('2024-02-05T11:20:00').toISOString(),
    qualification_data: {
      presupuesto: 1900,
      fecha_entrada: '2024-03-15',
      duracion: 24,
      perfil: 'familia',
      score: 95,
    },
    notes: 'Contrato firmado el 10/02. Entrada el 15/03.',
    created_at: new Date('2024-02-05T11:15:00').toISOString(),
    updated_at: new Date('2024-02-10T17:00:00').toISOString(),
  },
  {
    id: 'lead-5',
    listing_id: 'listing-3',
    property_id: 'prop-3',
    idealista_lead_id: 'idealista-lead-005',
    status: 'rejected',
    contact_name: 'Laura Sánchez',
    contact_phone: '+34 656 789 012',
    contact_email: 'laura.sanchez@email.com',
    original_message: 'Hola, ¿aceptan mascotas?',
    received_at: new Date('2024-02-08T09:30:00').toISOString(),
    qualified_at: new Date('2024-02-08T09:35:00').toISOString(),
    qualification_data: {
      presupuesto: 1500,
      fecha_entrada: '2024-04-01',
      duracion: 6,
      perfil: 'profesional',
      score: 45,
    },
    notes: 'Presupuesto insuficiente y necesita mascotas (no permitidas).',
    created_at: new Date('2024-02-08T09:30:00').toISOString(),
    updated_at: new Date('2024-02-08T10:00:00').toISOString(),
  },
  {
    id: 'lead-6',
    listing_id: 'listing-3',
    property_id: 'prop-3',
    idealista_lead_id: 'idealista-lead-006',
    status: 'qualified',
    contact_name: 'Pedro López',
    contact_phone: '+34 667 890 123',
    contact_email: 'pedro.lopez@email.com',
    original_message: 'Interesado en el piso. ¿Podríamos agendar una visita?',
    received_at: new Date('2024-02-12T13:00:00').toISOString(),
    qualified_at: new Date('2024-02-12T13:05:00').toISOString(),
    qualification_data: {
      presupuesto: 1850,
      fecha_entrada: '2024-03-20',
      duracion: 18,
      perfil: 'profesional',
      score: 88,
    },
    notes: null,
    created_at: new Date('2024-02-12T13:00:00').toISOString(),
    updated_at: new Date('2024-02-12T13:05:00').toISOString(),
  },
];

// Fotos dummy (URLs de ejemplo)
export const dummyPhotos: Record<string, string[]> = {
  'prop-1': [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  ],
  'prop-2': [
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  ],
  'prop-3': [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
  ],
  'prop-4': [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  ],
  'prop-5': [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
  ],
};

// Helper functions
export function getPropertyById(id: string): RentProperty | undefined {
  return dummyProperties.find(p => p.id === id);
}

export function getListingByPropertyId(propertyId: string): IdealistaListing | undefined {
  return dummyListings.find(l => l.property_id === propertyId);
}

export function getLeadsByPropertyId(propertyId: string): IdealistaLead[] {
  return dummyLeads.filter(l => l.property_id === propertyId);
}

export function getPhotosByPropertyId(propertyId: string): string[] {
  return dummyPhotos[propertyId] || [];
}
















