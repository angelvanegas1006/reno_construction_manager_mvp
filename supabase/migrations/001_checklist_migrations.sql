-- ============================================
-- Migraciones SQL para Checklist con Supabase
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. Actualizar enum de condición en inspection_elements
-- ============================================

-- Eliminar constraint actual si existe
ALTER TABLE inspection_elements 
DROP CONSTRAINT IF EXISTS inspection_elements_condition_check;

-- Crear nuevo enum con 4 estados
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_condition') THEN
        CREATE TYPE inspection_condition AS ENUM (
            'buen_estado',
            'necesita_reparacion',
            'necesita_reemplazo',
            'no_aplica'
        );
    END IF;
END $$;

-- Actualizar la columna condition
ALTER TABLE inspection_elements 
ALTER COLUMN condition TYPE inspection_condition 
USING CASE 
    WHEN condition::text = 'Buen estado' THEN 'buen_estado'::inspection_condition
    WHEN condition::text = 'Mal estado' THEN 'necesita_reparacion'::inspection_condition
    WHEN condition::text = 'No aplica' THEN 'no_aplica'::inspection_condition
    WHEN condition::text = 'buen_estado' THEN 'buen_estado'::inspection_condition
    WHEN condition::text = 'necesita_reparacion' THEN 'necesita_reparacion'::inspection_condition
    WHEN condition::text = 'necesita_reemplazo' THEN 'necesita_reemplazo'::inspection_condition
    WHEN condition::text = 'no_aplica' THEN 'no_aplica'::inspection_condition
    ELSE 'buen_estado'::inspection_condition
END;

-- ============================================
-- 2. Agregar campo inspection_type a property_inspections
-- ============================================

-- Agregar columna para distinguir initial vs final
ALTER TABLE property_inspections 
ADD COLUMN IF NOT EXISTS inspection_type TEXT CHECK (inspection_type IN ('initial', 'final'));

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_property_inspections_type 
ON property_inspections(property_id, inspection_type);

-- ============================================
-- 3. Actualizar enum de zone_type en inspection_zones
-- ============================================

-- Eliminar constraint actual si existe
ALTER TABLE inspection_zones 
DROP CONSTRAINT IF EXISTS inspection_zones_zone_type_check;

-- Crear nuevo enum con todas las zonas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_zone_type') THEN
        CREATE TYPE inspection_zone_type AS ENUM (
            'entrada',
            'distribucion',
            'dormitorio',
            'salon',
            'bano',
            'cocina',
            'exterior',
            'entorno'
        );
    END IF;
END $$;

-- Actualizar la columna zone_type
ALTER TABLE inspection_zones 
ALTER COLUMN zone_type TYPE inspection_zone_type 
USING zone_type::inspection_zone_type;

-- ============================================
-- 4. Agregar campo para videos en inspection_elements
-- ============================================

-- Agregar columna para URLs de videos
ALTER TABLE inspection_elements 
ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';

-- ============================================
-- 5. Verificar que las tablas existen
-- ============================================

-- Si las tablas no existen, crearlas (estructura básica)
-- Nota: Ajusta según tu esquema real

CREATE TABLE IF NOT EXISTS property_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    inspection_type TEXT CHECK (inspection_type IN ('initial', 'final')),
    inspection_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    pdf_url TEXT,
    public_link_id TEXT,
    has_elevator BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS inspection_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES property_inspections(id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    zone_type inspection_zone_type,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES inspection_zones(id) ON DELETE CASCADE,
    element_name TEXT NOT NULL,
    condition inspection_condition,
    exists BOOLEAN,
    quantity INTEGER,
    notes TEXT,
    image_urls TEXT[] DEFAULT '{}',
    video_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(zone_id, element_name)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_inspection_zones_inspection_id 
ON inspection_zones(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_elements_zone_id 
ON inspection_elements(zone_id);

-- ============================================
-- 6. Crear bucket de Storage para imágenes
-- ============================================

-- Nota: Esto debe hacerse desde Supabase Dashboard → Storage
-- O usando la API de Supabase Storage
-- Bucket name: 'inspection-images'
-- Public: false (privado)

-- ============================================
-- 7. Event Bus Setup (for event-driven architecture)
-- ============================================

-- Function to publish events
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

-- Event Store Table (for event sourcing)
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

-- Enable Realtime for event_store
-- This allows Supabase Realtime to listen to event_store changes
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS event_store;

-- ============================================
-- ✅ Migraciones Completadas
-- ============================================

