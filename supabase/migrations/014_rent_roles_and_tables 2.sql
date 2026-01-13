-- ============================================
-- Migración: Agregar roles de rent y crear tablas de alquileres
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Actualizar el CHECK constraint en la tabla user_roles para incluir roles de rent
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'foreman', 'user', 'construction_manager', 'rent_manager', 'rent_agent', 'tenant'));

-- ============================================
-- Crear tablas de alquileres
-- ============================================

-- Tabla de propiedades en alquiler
CREATE TABLE IF NOT EXISTS rent_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL, -- Referencia opcional a propiedad base (TEXT porque properties.id es TEXT)
  address TEXT NOT NULL,
  monthly_rent DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_meters DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de inquilinos
CREATE TABLE IF NOT EXISTS rent_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES rent_properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'past')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contratos
CREATE TABLE IF NOT EXISTS rent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES rent_tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES rent_properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  contract_number TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_rent_properties_status ON rent_properties(status);
CREATE INDEX IF NOT EXISTS idx_rent_properties_property_id ON rent_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_tenants_property_id ON rent_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_tenants_status ON rent_tenants(status);
CREATE INDEX IF NOT EXISTS idx_rent_contracts_tenant_id ON rent_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_contracts_property_id ON rent_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_contracts_status ON rent_contracts(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE rent_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rent_properties
-- Los usuarios con roles de rent pueden ver todas las propiedades
DROP POLICY IF EXISTS "Rent managers can view all rent properties" ON rent_properties;
CREATE POLICY "Rent managers can view all rent properties"
  ON rent_properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

-- Los usuarios con roles de rent pueden insertar propiedades
DROP POLICY IF EXISTS "Rent managers can insert rent properties" ON rent_properties;
CREATE POLICY "Rent managers can insert rent properties"
  ON rent_properties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

-- Los usuarios con roles de rent pueden actualizar propiedades
DROP POLICY IF EXISTS "Rent managers can update rent properties" ON rent_properties;
CREATE POLICY "Rent managers can update rent properties"
  ON rent_properties
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

-- Los usuarios con roles de rent pueden eliminar propiedades
DROP POLICY IF EXISTS "Rent managers can delete rent properties" ON rent_properties;
CREATE POLICY "Rent managers can delete rent properties"
  ON rent_properties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'admin')
    )
  );

-- Políticas RLS para rent_tenants
DROP POLICY IF EXISTS "Rent managers can view all tenants" ON rent_tenants;
CREATE POLICY "Rent managers can view all tenants"
  ON rent_tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can insert tenants" ON rent_tenants;
CREATE POLICY "Rent managers can insert tenants"
  ON rent_tenants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can update tenants" ON rent_tenants;
CREATE POLICY "Rent managers can update tenants"
  ON rent_tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can delete tenants" ON rent_tenants;
CREATE POLICY "Rent managers can delete tenants"
  ON rent_tenants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'admin')
    )
  );

-- Políticas RLS para rent_contracts
DROP POLICY IF EXISTS "Rent managers can view all contracts" ON rent_contracts;
CREATE POLICY "Rent managers can view all contracts"
  ON rent_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can insert contracts" ON rent_contracts;
CREATE POLICY "Rent managers can insert contracts"
  ON rent_contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can update contracts" ON rent_contracts;
CREATE POLICY "Rent managers can update contracts"
  ON rent_contracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'rent_agent', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rent managers can delete contracts" ON rent_contracts;
CREATE POLICY "Rent managers can delete contracts"
  ON rent_contracts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('rent_manager', 'admin')
    )
  );

-- Permitir que service_role tenga acceso completo (para APIs server-side)
DROP POLICY IF EXISTS "Service role can manage rent tables" ON rent_properties;
CREATE POLICY "Service role can manage rent tables"
  ON rent_properties
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage tenants" ON rent_tenants;
CREATE POLICY "Service role can manage tenants"
  ON rent_tenants
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage contracts" ON rent_contracts;
CREATE POLICY "Service role can manage contracts"
  ON rent_contracts
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ✅ Migración Completada
-- ============================================

