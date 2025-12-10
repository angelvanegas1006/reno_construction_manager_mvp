/**
 * Event Mapper
 * 
 * Maps property events to Google Calendar events and vice versa
 */

import { PropertyEvent, PropertyEventType, GoogleCalendarEventData } from './types';
import { Property } from '@/lib/property-storage';

/**
 * Map property event to Google Calendar event data
 */
export function mapPropertyEventToGoogleCalendar(
  property: Property,
  eventType: PropertyEventType
): GoogleCalendarEventData | null {
  const address = property.fullAddress || property.address || 'Dirección no disponible';
  
  let date: string | null = null;
  let title = '';
  let description = '';

  switch (eventType) {
    case 'estimated_visit':
      date = property.estimatedVisitDate || null;
      title = `Visita Estimada - ${address}`;
      description = buildEventDescription(property, {
        type: 'Visita Estimada',
        dateField: 'Fecha de visita estimada',
      });
      break;

    case 'start_date':
      date = property.inicio || null;
      title = `Inicio de Obra - ${address}`;
      description = buildEventDescription(property, {
        type: 'Inicio de Obra',
        dateField: 'Fecha de inicio',
        includeRenovator: true,
        includeRenoType: true,
      });
      break;

    case 'estimated_end_date':
      date = property.finEst || null;
      title = `Finalización Estimada - ${address}`;
      description = buildEventDescription(property, {
        type: 'Finalización Estimada',
        dateField: 'Fecha de finalización estimada',
        includeRenovator: true,
        includeRenoType: true,
      });
      break;

    case 'property_ready':
      // Calculate property ready date from start_date + renoDuration
      if (property.inicio && property.renoDuration) {
        const startDate = new Date(property.inicio);
        startDate.setDate(startDate.getDate() + property.renoDuration);
        date = startDate.toISOString().split('T')[0];
      } else {
        date = null;
      }
      title = `Propiedad Lista - ${address}`;
      description = buildEventDescription(property, {
        type: 'Propiedad Lista',
        dateField: 'Fecha estimada de propiedad lista',
        includeRenovator: true,
      });
      break;

    default:
      return null;
  }

  if (!date) {
    return null;
  }

  // Format date for Google Calendar (all-day event)
  const eventDate = new Date(date);
  const dateStr = eventDate.toISOString().split('T')[0];

  return {
    summary: title,
    description,
    start: {
      date: dateStr,
    },
    end: {
      date: dateStr,
    },
    location: address,
    reminders: {
      useDefault: false,
      overrides: [
        {
          method: 'popup',
          minutes: 1440, // 1 day before
        },
        {
          method: 'email',
          minutes: 1440, // 1 day before
        },
      ],
    },
  };
}

/**
 * Build event description from property data
 */
function buildEventDescription(
  property: Property,
  options: {
    type: string;
    dateField: string;
    includeRenovator?: boolean;
    includeRenoType?: boolean;
    includeRegion?: boolean;
    includeClientEmail?: boolean;
  }
): string {
  const parts: string[] = [`${options.type}`];

  if (property.fullAddress || property.address) {
    parts.push(`Dirección: ${property.fullAddress || property.address}`);
  }

  if (options.includeRegion && property.region) {
    parts.push(`Región: ${property.region}`);
  }

  if (options.includeRenovator && property.renovador) {
    parts.push(`Renovador: ${property.renovador}`);
  }

  if (options.includeRenoType && property.renoType) {
    parts.push(`Tipo de Renovación: ${property.renoType}`);
  }

  if (options.includeClientEmail && (property.data as any)?.clientEmail) {
    parts.push(`Email del Cliente: ${(property.data as any).clientEmail}`);
  }

  if ((property.data as any)?.notes) {
    parts.push(`Notas: ${(property.data as any).notes}`);
  }

  parts.push(`\nID de Propiedad: ${property.id}`);

  return parts.join('\n');
}

/**
 * Extract property event from Google Calendar event
 */
export function extractPropertyEventFromGoogleCalendar(
  googleEvent: { summary: string; description?: string; start?: { date?: string; dateTime?: string } }
): {
  propertyId?: string;
  eventType?: PropertyEventType;
} | null {
  // Try to extract property ID from description
  const propertyIdMatch = googleEvent.description?.match(/ID de Propiedad:\s*([^\n]+)/);
  const propertyId = propertyIdMatch?.[1]?.trim();

  // Try to determine event type from summary
  let eventType: PropertyEventType | undefined;
  const summary = googleEvent.summary.toLowerCase();
  
  if (summary.includes('visita estimada')) {
    eventType = 'estimated_visit';
  } else if (summary.includes('inicio de obra')) {
    eventType = 'start_date';
  } else if (summary.includes('finalización estimada')) {
    eventType = 'estimated_end_date';
  } else if (summary.includes('propiedad lista')) {
    eventType = 'property_ready';
  }

  if (!propertyId || !eventType) {
    return null;
  }

  return {
    propertyId,
    eventType,
  };
}

/**
 * Get all property events that should be synced
 */
export function getPropertyEvents(property: Property): PropertyEvent[] {
  const events: PropertyEvent[] = [];

  if (property.estimatedVisitDate) {
    events.push({
      propertyId: property.id,
      propertyAddress: property.fullAddress || property.address || '',
      eventType: 'estimated_visit',
      date: property.estimatedVisitDate,
      additionalData: {
        region: property.region,
        clientEmail: (property.data as any)?.clientEmail,
        notes: (property.data as any)?.notes,
      },
    });
  }

  if (property.inicio) {
    events.push({
      propertyId: property.id,
      propertyAddress: property.fullAddress || property.address || '',
      eventType: 'start_date',
      date: property.inicio,
      additionalData: {
        renovator: property.renovador,
        renoType: property.renoType,
        region: property.region,
      },
    });
  }

  if (property.finEst) {
    events.push({
      propertyId: property.id,
      propertyAddress: property.fullAddress || property.address || '',
      eventType: 'estimated_end_date',
      date: property.finEst,
      additionalData: {
        renovator: property.renovador,
        renoType: property.renoType,
      },
    });
  }

  // Property ready (calculated from start_date + renoDuration)
  if (property.inicio && property.renoDuration) {
    const startDate = new Date(property.inicio);
    startDate.setDate(startDate.getDate() + property.renoDuration);
    events.push({
      propertyId: property.id,
      propertyAddress: property.fullAddress || property.address || '',
      eventType: 'property_ready',
      date: startDate.toISOString().split('T')[0],
      additionalData: {
        renovator: property.renovador,
      },
    });
  }

  return events;
}

