-- ============================================
-- Migración: Tablas para integración con Idealista
-- ============================================

-- Tabla de listings publicados en Idealista
CREATE TABLE IF NOT EXISTS idealista_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES rent_properties(id) ON DELETE CASCADE,
  idealista_listing_id TEXT UNIQUE, -- ID del listing en Idealista
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'published', 'paused', 'error')),
  published_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  idealista_url TEXT,
  metadata JSONB, -- Datos adicionales de Idealista
  error_message TEXT, -- Mensaje de error si status = 'error'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de leads recibidos de Idealista
CREATE TABLE IF NOT EXISTS idealista_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES idealista_listings(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES rent_properties(id) ON DELETE CASCADE,
  idealista_lead_id TEXT UNIQUE, -- ID del lead en Idealista
  status TEXT NOT NULL DEFAULT 'pending_qualification' CHECK (status IN ('pending_qualification', 'qualified', 'contacted', 'converted', 'rejected')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  original_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  qualification_data JSONB, -- Datos cualificados del bot de IA: { presupuesto, fecha_entrada, duracion, perfil, score }
  notes TEXT, -- Notas adicionales del gestor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de fotos subidas a Idealista (opcional, para tracking)
CREATE TABLE IF NOT EXISTS idealista_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES idealista_listings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  idealista_photo_id TEXT, -- ID de la foto en Idealista
  photo_order INTEGER DEFAULT 0, -- Orden de la foto
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_idealista_listings_property_id ON idealista_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_idealista_listings_status ON idealista_listings(status);
CREATE INDEX IF NOT EXISTS idx_idealista_listings_idealista_id ON idealista_listings(idealista_listing_id);
CREATE INDEX IF NOT EXISTS idx_idealista_leads_property_id ON idealista_leads(property_id);
CREATE INDEX IF NOT EXISTS idx_idealista_leads_listing_id ON idealista_leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_idealista_leads_status ON idealista_leads(status);
CREATE INDEX IF NOT EXISTS idx_idealista_leads_idealista_id ON idealista_leads(idealista_lead_id);
CREATE INDEX IF NOT EXISTS idx_idealista_photos_listing_id ON idealista_photos(listing_id);

-- Habilitar RLS
ALTER TABLE idealista_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealista_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealista_photos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para idealista_listings
CREATE POLICY "Rent managers can view all listings" ON idealista_listings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

CREATE POLICY "Rent managers can manage listings" ON idealista_listings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

-- Políticas RLS para idealista_leads
CREATE POLICY "Rent managers can view all leads" ON idealista_leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

CREATE POLICY "Rent managers can manage leads" ON idealista_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

-- Políticas RLS para idealista_photos
CREATE POLICY "Rent managers can view all photos" ON idealista_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

CREATE POLICY "Rent managers can manage photos" ON idealista_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'rent_manager', 'rent_agent')
    )
  );

-- Política para service role (APIs y webhooks)
CREATE POLICY "Service role can manage idealista tables" ON idealista_listings
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage leads" ON idealista_leads
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage photos" ON idealista_photos
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ✅ Migración Completada
-- ============================================


