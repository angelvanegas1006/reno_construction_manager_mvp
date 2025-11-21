/**
 * API Service for Reno Construction Manager
 * Handles all backend communication for properties and checklists
 */

import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { ChecklistData } from "@/lib/checklist-storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PropertyPhaseUpdate {
  phase: RenoKanbanPhase;
  position?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Reno API Service
 * Provides methods to interact with the backend API
 */
export class RenoApiService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('auth_token') 
      : null;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    return response.json();
  }

  // ==================== Properties ====================

  /**
   * Get all properties, optionally filtered by phase
   */
  async getProperties(phase?: RenoKanbanPhase): Promise<Property[]> {
    const url = phase 
      ? `${API_BASE_URL}/api/properties?phase=${phase}`
      : `${API_BASE_URL}/api/properties`;
    
    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      const json = await this.handleResponse<{ properties: Property[] }>(response);
      return json.properties || [];
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        headers: this.getAuthHeaders(),
      });
      const json = await this.handleResponse<{ property: Property }>(response);
      return json.property;
    } catch (error) {
      console.error(`Error fetching property ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update property phase (for drag & drop)
   * Can use n8n webhook or direct API call
   */
  async updatePropertyPhase(
    propertyId: string,
    phase: RenoKanbanPhase,
    position?: number,
    useN8N: boolean = true
  ): Promise<Property> {
    const updateData: PropertyPhaseUpdate = { phase, position };
    
    if (useN8N && N8N_WEBHOOK_URL) {
      // Use n8n webhook
      try {
        const response = await fetch(`${N8N_WEBHOOK_URL}/property-phase-update`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            propertyId,
            ...updateData,
          }),
        });
        const json = await this.handleResponse<{ property: Property }>(response);
        return json.property;
      } catch (error) {
        console.error('Error updating via n8n, falling back to direct API:', error);
        // Fallback to direct API
        return this.updatePropertyPhase(propertyId, phase, position, false);
      }
    } else {
      // Direct API call
      try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/phase`, {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(updateData),
        });
        const json = await this.handleResponse<{ property: Property }>(response);
        return json.property;
      } catch (error) {
        console.error(`Error updating property phase ${propertyId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Update any property field
   */
  async updateProperty(
    propertyId: string,
    updates: Partial<Property>
  ): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      const json = await this.handleResponse<{ property: Property }>(response);
      return json.property;
    } catch (error) {
      console.error(`Error updating property ${propertyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new property
   */
  async createProperty(property: Partial<Property>): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(property),
      });
      const json = await this.handleResponse<{ property: Property }>(response);
      return json.property;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  // ==================== Checklists ====================

  /**
   * Get checklist for a property
   */
  async getChecklist(
    propertyId: string,
    type: 'reno_initial' | 'reno_final' | 'partner'
  ): Promise<ChecklistData | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/properties/${propertyId}/checklist/${type}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      
      if (response.status === 404) {
        return null;
      }
      
      const json = await this.handleResponse<{ checklist: ChecklistData }>(response);
      return json.checklist;
    } catch (error) {
      console.error(`Error fetching checklist ${propertyId}/${type}:`, error);
      throw error;
    }
  }

  /**
   * Save/update entire checklist
   */
  async saveChecklist(
    propertyId: string,
    type: 'reno_initial' | 'reno_final' | 'partner',
    checklist: ChecklistData,
    useN8N: boolean = true
  ): Promise<ChecklistData> {
    if (useN8N && N8N_WEBHOOK_URL) {
      // Use n8n webhook for auto-save
      try {
        const response = await fetch(`${N8N_WEBHOOK_URL}/checklist-save`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            propertyId,
            type,
            checklist,
          }),
        });
        const json = await this.handleResponse<{ checklist: ChecklistData }>(response);
        return json.checklist;
      } catch (error) {
        console.error('Error saving via n8n, falling back to direct API:', error);
        return this.saveChecklist(propertyId, type, checklist, false);
      }
    } else {
      // Direct API call
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/properties/${propertyId}/checklist/${type}`,
          {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(checklist),
          }
        );
        const json = await this.handleResponse<{ checklist: ChecklistData }>(response);
        return json.checklist;
      } catch (error) {
        console.error(`Error saving checklist ${propertyId}/${type}:`, error);
        throw error;
      }
    }
  }

  /**
   * Update a specific section of the checklist
   */
  async updateChecklistSection(
    propertyId: string,
    type: 'reno_initial' | 'reno_final' | 'partner',
    sectionId: string,
    section: any
  ): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/properties/${propertyId}/checklist/${type}/section/${sectionId}`,
        {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(section),
        }
      );
      const json = await this.handleResponse<{ section: any }>(response);
      return json.section;
    } catch (error) {
      console.error(`Error updating checklist section ${sectionId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const renoApi = new RenoApiService();

// Export error class for error handling
export { ApiError };

