-- Event Bus Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Function to publish events
-- ============================================
CREATE OR REPLACE FUNCTION publish_event(
  event_type TEXT,
  event_data JSONB,
  source_service TEXT DEFAULT 'unknown',
  event_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Publish to PostgreSQL NOTIFY channel
  -- This can be consumed by Supabase Realtime
  PERFORM pg_notify(
    'vistral_events',
    json_build_object(
      'event_type', event_type,
      'data', event_data,
      'timestamp', NOW(),
      'source_service', source_service,
      'metadata', COALESCE(event_metadata, '{}'::jsonb)
    )::text
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Event Store Table (Optional - for event sourcing)
-- ============================================
CREATE TABLE IF NOT EXISTS event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  source_service TEXT NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate 
  ON event_store(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_type 
  ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_timestamp 
  ON event_store(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_service 
  ON event_store(source_service);

-- Function to store events in event_store
CREATE OR REPLACE FUNCTION store_event(
  event_type TEXT,
  aggregate_id TEXT,
  aggregate_type TEXT,
  event_data JSONB,
  source_service TEXT,
  event_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO event_store (
    event_type,
    aggregate_id,
    aggregate_type,
    event_data,
    metadata,
    source_service
  ) VALUES (
    event_type,
    aggregate_id,
    aggregate_type,
    event_data,
    COALESCE(event_metadata, '{}'::jsonb),
    source_service
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Example Trigger for Property Service
-- ============================================
-- This is an example. Adjust based on your actual table structure

-- Function to notify property changes
CREATE OR REPLACE FUNCTION notify_property_changed()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  event_data JSONB;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      event_type := 'property.created';
      event_data := row_to_json(NEW)::jsonb;
      
      -- Publish event
      PERFORM publish_event(
        event_type,
        json_build_object(
          'property_id', NEW.id,
          'granularity_level', NEW.granularity_level,
          'project_id', NEW.project_id,
          'parent_unit_id', NEW.parent_unit_id
        )::jsonb,
        'property-service'
      );
      
      -- Store in event_store (optional)
      PERFORM store_event(
        event_type,
        NEW.id::TEXT,
        'property',
        event_data,
        'property-service'
      );
      
    WHEN 'UPDATE' THEN
      event_type := 'property.updated';
      event_data := json_build_object(
        'property_id', NEW.id,
        'old_data', row_to_json(OLD),
        'new_data', row_to_json(NEW)
      )::jsonb;
      
      -- Publish update event
      PERFORM publish_event(
        event_type,
        json_build_object(
          'property_id', NEW.id,
          'changes', json_build_object(
            'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN NEW.status ELSE NULL END,
            'granularity_level', CASE WHEN OLD.granularity_level IS DISTINCT FROM NEW.granularity_level THEN NEW.granularity_level ELSE NULL END
          )
        )::jsonb,
        'property-service'
      );
      
      -- If status changed, publish additional event
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM publish_event(
          'property.status_changed',
          json_build_object(
            'property_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status
          )::jsonb,
          'property-service'
        );
      END IF;
      
      -- Store in event_store
      PERFORM store_event(
        event_type,
        NEW.id::TEXT,
        'property',
        event_data,
        'property-service'
      );
      
    WHEN 'DELETE' THEN
      event_type := 'property.deleted';
      event_data := row_to_json(OLD)::jsonb;
      
      PERFORM publish_event(
        event_type,
        json_build_object(
          'property_id', OLD.id
        )::jsonb,
        'property-service'
      );
      
      PERFORM store_event(
        event_type,
        OLD.id::TEXT,
        'property',
        event_data,
        'property-service'
      );
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Enable Realtime for event_store (optional)
-- ============================================
-- This allows Supabase Realtime to listen to event_store changes
-- ALTER PUBLICATION supabase_realtime ADD TABLE event_store;

-- ============================================
-- Notes:
-- ============================================
-- 1. To use triggers, create them on your actual tables:
--    CREATE TRIGGER property_events_trigger
--      AFTER INSERT OR UPDATE OR DELETE ON your_property_table
--      FOR EACH ROW
--      EXECUTE FUNCTION notify_property_changed();
--
-- 2. Adjust the trigger function based on your table structure
-- 3. Enable Realtime for tables you want to listen to:
--    ALTER PUBLICATION supabase_realtime ADD TABLE your_table;

