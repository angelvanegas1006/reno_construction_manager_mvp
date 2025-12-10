/**
 * Types for Google Calendar Integration
 */

export interface GoogleCalendarToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id?: string | null;
  connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarEvent {
  id: string;
  user_id: string;
  property_id: string;
  event_type: PropertyEventType;
  google_event_id: string;
  calendar_id: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export type PropertyEventType =
  | 'estimated_visit'
  | 'start_date'
  | 'estimated_end_date'
  | 'property_ready'
  | 'manual_visit' // Visitas creadas manualmente en la app
  | 'reminder'; // Recordatorios creados en la app

export interface GoogleCalendarEventData {
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface GoogleCalendarApiEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  iCalUID?: string;
  created?: string;
  updated?: string;
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{
    propertyId: string;
    eventType: PropertyEventType;
    error: string;
  }>;
}

export interface PropertyEvent {
  propertyId: string;
  propertyAddress: string;
  eventType: PropertyEventType;
  date: string | null;
  additionalData?: {
    renovator?: string;
    renoType?: string;
    region?: string;
    clientEmail?: string;
    notes?: string;
  };
}

