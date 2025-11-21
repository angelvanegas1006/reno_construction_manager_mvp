/**
 * Supabase Properties Service
 * Handles all property-related operations using Supabase
 */

import { supabase } from '@/lib/supabase/client';
import { Property } from '@/lib/property-storage';
import { RenoKanbanPhase } from '@/lib/reno-kanban-config';

export class SupabasePropertiesService {
  /**
   * Get all properties, optionally filtered by phase
   */
  async getProperties(phase?: RenoKanbanPhase): Promise<Property[]> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (phase) {
        query = query.eq('reno_phase', phase);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching properties:', error);
        throw new Error(`Error fetching properties: ${error.message}`);
      }

      return this.mapToProperties(data || []);
    } catch (error) {
      console.error('Error in getProperties:', error);
      throw error;
    }
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error(`Error fetching property ${id}:`, error);
        throw new Error(`Error fetching property: ${error.message}`);
      }

      return data ? this.mapToProperty(data) : null;
    } catch (error) {
      console.error(`Error in getProperty(${id}):`, error);
      throw error;
    }
  }

  /**
   * Update property phase (for drag & drop)
   */
  async updatePropertyPhase(
    propertyId: string,
    phase: RenoKanbanPhase,
    position?: number
  ): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          reno_phase: phase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating property phase ${propertyId}:`, error);
        throw new Error(`Error updating property phase: ${error.message}`);
      }

      if (!data) {
        throw new Error('Property not found');
      }

      return this.mapToProperty(data);
    } catch (error) {
      console.error(`Error in updatePropertyPhase(${propertyId}):`, error);
      throw error;
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
      const mappedUpdates = this.mapFromProperty(updates);
      mappedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('properties')
        .update(mappedUpdates)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating property ${propertyId}:`, error);
        throw new Error(`Error updating property: ${error.message}`);
      }

      if (!data) {
        throw new Error('Property not found');
      }

      return this.mapToProperty(data);
    } catch (error) {
      console.error(`Error in updateProperty(${propertyId}):`, error);
      throw error;
    }
  }

  /**
   * Create a new property
   */
  async createProperty(property: Partial<Property>): Promise<Property> {
    try {
      const mappedProperty = this.mapFromProperty(property);
      
      // Ensure required fields
      if (!mappedProperty.id || !mappedProperty.full_address) {
        throw new Error('Property ID and full address are required');
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(mappedProperty)
        .select()
        .single();

      if (error) {
        console.error('Error creating property:', error);
        throw new Error(`Error creating property: ${error.message}`);
      }

      if (!data) {
        throw new Error('Failed to create property');
      }

      return this.mapToProperty(data);
    } catch (error) {
      console.error('Error in createProperty:', error);
      throw error;
    }
  }

  /**
   * Subscribe to property changes (Realtime)
   * Returns unsubscribe function
   */
  subscribeToProperties(
    phase: RenoKanbanPhase | null,
    callback: (property: Property, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  ): () => void {
    const channelName = phase 
      ? `properties-${phase}` 
      : 'properties-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          ...(phase && { filter: `reno_phase=eq.${phase}` }),
        },
        (payload) => {
          try {
            if (payload.eventType === 'DELETE') {
              // Handle delete if needed
              return;
            }

            const property = this.mapToProperty(payload.new as any);
            callback(property, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE');
          } catch (error) {
            console.error('Error in subscription callback:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to phase changes (for drag & drop)
   * Returns unsubscribe function
   */
  subscribeToPhaseChanges(
    callback: (payload: { 
      propertyId: string; 
      oldPhase: RenoKanbanPhase | null; 
      newPhase: RenoKanbanPhase | null;
      property: Property;
    }) => void
  ): () => void {
    const channel = supabase
      .channel('phase-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties',
        },
        (payload) => {
          try {
            const oldPhase = (payload.old as any)?.reno_phase as RenoKanbanPhase | null;
            const newPhase = (payload.new as any)?.reno_phase as RenoKanbanPhase | null;
            
            if (oldPhase !== newPhase) {
              const property = this.mapToProperty(payload.new as any);
              callback({
                propertyId: property.id,
                oldPhase,
                newPhase,
                property,
              });
            }
          } catch (error) {
            console.error('Error in phase change subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Search properties
   */
  async searchProperties(query: string): Promise<Property[]> {
    try {
      const searchTerm = `%${query}%`;
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .or(`id.ilike.${searchTerm},full_address.ilike.${searchTerm}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching properties:', error);
        throw new Error(`Error searching properties: ${error.message}`);
      }

      return this.mapToProperties(data || []);
    } catch (error) {
      console.error('Error in searchProperties:', error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Map Supabase row to Property type
   */
  private mapToProperty(row: any): Property {
    return {
      id: row.id,
      fullAddress: row.full_address,
      propertyType: row.property_type,
      currentStage: row.current_stage,
      address: row.address,
      price: row.price,
      analyst: row.analyst,
      completion: row.completion ?? 0,
      region: row.region,
      renoType: row.reno_type,
      renovador: row.renovador,
      inicio: row.inicio,
      finEst: row.fin_est,
      realSettlementDate: row.real_settlement_date,
      estimatedVisitDate: row.estimated_visit_date,
      realCompletionDate: row.real_completion_date,
      estimatedFinalVisitDate: row.estimated_final_visit_date,
      setupStatusNotes: row.setup_status_notes,
      proximaActualizacion: row.proxima_actualizacion,
      ultimaActualizacion: row.ultima_actualizacion,
      timeInStage: row.time_in_stage,
      timeCreated: row.time_created,
      createdAt: row.created_at,
      data: (row.data as any) || {},
    };
  }

  /**
   * Map array of Supabase rows to Property array
   */
  private mapToProperties(rows: any[]): Property[] {
    return rows.map(row => this.mapToProperty(row));
  }

  /**
   * Map Property type to Supabase row format
   */
  private mapFromProperty(property: Partial<Property>): any {
    const mapped: any = {};

    if (property.id !== undefined) mapped.id = property.id;
    if (property.fullAddress !== undefined) mapped.full_address = property.fullAddress;
    if (property.propertyType !== undefined) mapped.property_type = property.propertyType;
    if (property.currentStage !== undefined) mapped.current_stage = property.currentStage;
    if (property.address !== undefined) mapped.address = property.address;
    if (property.price !== undefined) mapped.price = property.price;
    if (property.analyst !== undefined) mapped.analyst = property.analyst;
    if (property.completion !== undefined) mapped.completion = property.completion;
    if (property.region !== undefined) mapped.region = property.region;
    if (property.renoType !== undefined) mapped.reno_type = property.renoType;
    if (property.renovador !== undefined) mapped.renovador = property.renovador;
    if (property.inicio !== undefined) mapped.inicio = property.inicio;
    if (property.finEst !== undefined) mapped.fin_est = property.finEst;
    if (property.realSettlementDate !== undefined) mapped.real_settlement_date = property.realSettlementDate;
    if (property.estimatedVisitDate !== undefined) mapped.estimated_visit_date = property.estimatedVisitDate;
    if (property.realCompletionDate !== undefined) mapped.real_completion_date = property.realCompletionDate;
    if (property.estimatedFinalVisitDate !== undefined) mapped.estimated_final_visit_date = property.estimatedFinalVisitDate;
    if (property.setupStatusNotes !== undefined) mapped.setup_status_notes = property.setupStatusNotes;
    if (property.proximaActualizacion !== undefined) mapped.proxima_actualizacion = property.proximaActualizacion;
    if (property.ultimaActualizacion !== undefined) mapped.ultima_actualizacion = property.ultimaActualizacion;
    if (property.timeInStage !== undefined) mapped.time_in_stage = property.timeInStage;
    if (property.timeCreated !== undefined) mapped.time_created = property.timeCreated;
    if (property.data !== undefined) mapped.data = property.data;

    return mapped;
  }
}

// Export singleton instance
export const supabaseProperties = new SupabasePropertiesService();

