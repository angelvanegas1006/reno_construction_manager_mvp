/**
 * Example: Property Service using Event Bus
 * 
 * This demonstrates how Property Service would publish events
 * and how other services would consume them.
 */

import { EventBus } from '../src/event-bus';
import { supabase } from '@/lib/supabase/client';

// ============================================
// Property Service (Publisher)
// ============================================

class PropertyService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async createProperty(property: {
    id: string;
    granularity_level: 'L1' | 'L2' | 'L3';
    project_id?: string;
    parent_unit_id?: string;
    status: string;
  }) {
    // Create property in database
    const { data, error } = await supabase
      .from('property')
      .insert(property)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Publish event (trigger will also publish, but this is explicit)
    await this.eventBus.publish(
      'property.created',
      {
        property_id: data.id,
        granularity_level: data.granularity_level,
        project_id: data.project_id,
        parent_unit_id: data.parent_unit_id,
      },
      'property-service'
    );

    return data;
  }

  async updatePropertyStatus(propertyId: string, newStatus: string) {
    // Update in database
    const { data, error } = await supabase
      .from('property')
      .update({ status: newStatus })
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Publish event
    await this.eventBus.publish(
      'property.status_changed',
      {
        property_id: propertyId,
        new_status: newStatus,
      },
      'property-service'
    );

    return data;
  }
}

// ============================================
// Opportunity Service (Consumer)
// ============================================

class OpportunityService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // When a property is created, automatically create an opportunity
    this.eventBus.subscribe('property.created', async (payload) => {
      const { property_id, granularity_level } = payload.data;

      console.log(`[OpportunityService] Property created: ${property_id}`);

      // Determine opportunity type based on granularity level
      let opportunityType: string;
      if (granularity_level === 'L1') {
        opportunityType = 'FLIP_INVESTMENT';
      } else if (granularity_level === 'L2') {
        opportunityType = 'RENTAL_INVESTMENT';
      } else {
        opportunityType = 'RENTAL_INVESTMENT'; // Default for L3
      }

      // Create opportunity
      const { data, error } = await supabase
        .from('opportunity')
        .insert({
          property_id,
          opportunity_type: opportunityType,
          status: 'to-onboard',
        })
        .select()
        .single();

      if (error) {
        console.error('[OpportunityService] Error creating opportunity:', error);
        return;
      }

      // Publish event
      await this.eventBus.publish(
        'opportunity.created',
        {
          opportunity_id: data.id,
          property_id,
          opportunity_type: opportunityType,
        },
        'opportunity-service'
      );

      console.log(`[OpportunityService] Opportunity created: ${data.id}`);
    });

    // When property status changes, update related opportunities
    this.eventBus.subscribe('property.status_changed', async (payload) => {
      const { property_id, new_status } = payload.data;

      console.log(`[OpportunityService] Property status changed: ${property_id} -> ${new_status}`);

      // Update opportunities related to this property
      const { error } = await supabase
        .from('opportunity')
        .update({ status: new_status })
        .eq('property_id', property_id);

      if (error) {
        console.error('[OpportunityService] Error updating opportunities:', error);
      }
    });
  }

  async createOpportunity(opportunity: {
    property_id: string;
    opportunity_type: string;
    status: string;
  }) {
    const { data, error } = await supabase
      .from('opportunity')
      .insert(opportunity)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await this.eventBus.publish(
      'opportunity.created',
      {
        opportunity_id: data.id,
        property_id: opportunity.property_id,
        opportunity_type: opportunity.opportunity_type,
      },
      'opportunity-service'
    );

    return data;
  }
}

// ============================================
// Analytics Service (Consumer)
// ============================================

class AnalyticsService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Track all events for analytics
    const eventsToTrack = [
      'property.created',
      'property.updated',
      'property.status_changed',
      'opportunity.created',
      'deal.stage_changed',
      'deal.closed_won',
      'deal.closed_lost',
    ];

    this.eventBus.subscribe(eventsToTrack, async (payload) => {
      console.log(`[AnalyticsService] Tracking event: ${payload.event_type}`);

      // Store event in analytics table
      const { error } = await supabase.from('analytics_events').insert({
        event_type: payload.event_type,
        event_data: payload.data,
        timestamp: payload.timestamp,
        source_service: payload.source_service,
      });

      if (error) {
        console.error('[AnalyticsService] Error storing event:', error);
      }

      // Update real-time metrics
      await this.updateMetrics(payload);
    });
  }

  private async updateMetrics(payload: any) {
    // Update dashboard metrics
    // This could update a Redis cache or another fast storage
    console.log(`[AnalyticsService] Updating metrics for: ${payload.event_type}`);
  }
}

// ============================================
// Usage Example
// ============================================

export async function exampleUsage() {
  // Initialize Event Bus
  const eventBus = new EventBus({
    supabase,
    channelName: 'vistral-events',
    enableLogging: true,
  });

  // Initialize services
  const propertyService = new PropertyService(eventBus);
  const opportunityService = new OpportunityService(eventBus);
  const analyticsService = new AnalyticsService(eventBus);

  // Create a property
  const property = await propertyService.createProperty({
    id: '123',
    granularity_level: 'L2',
    status: 'draft',
  });

  console.log('Property created:', property);

  // The Opportunity Service will automatically create an opportunity
  // The Analytics Service will track the event

  // Update property status
  await propertyService.updatePropertyStatus('123', 'active');

  // Cleanup
  eventBus.disconnect();
}

