# Plan de Integración: Arquitectura de Datos + Separación de Apps

## 📋 Resumen Ejecutivo

Este documento integra la **Arquitectura de Datos Global de Vistral** (definida en tu documento) con el **Plan de Separación de Apps** (monorepo), creando una estrategia unificada para escalabilidad y mantenibilidad.

---

## 🔄 Comparación: Tu Arquitectura vs Mi Plan

### ✅ **Áreas de Alineación**

| Aspecto | Tu Arquitectura | Mi Plan | Estado |
|--------|----------------|--------|--------|
| **Base de Datos** | Supabase (PostgreSQL) | Supabase (PostgreSQL) | ✅ Alineado |
| **Modelo de Datos** | Normalizado (snowflake schema) | Normalizado (snowflake schema) | ✅ Alineado |
| **Escalabilidad** | Global (L1/L2/L3, múltiples países) | Monorepo escalable | ✅ Alineado |
| **Separación de Concerns** | Property, Opportunity, Client Share | Apps separadas (Partner, Reno, Admin) | ✅ Complementario |

### 🔀 **Áreas que Necesitan Integración**

| Aspecto | Tu Arquitectura | Mi Plan | Acción Requerida |
|--------|----------------|--------|------------------|
| **Estructura de Tablas** | `property`, `opportunity`, `client_share`, `deals_opportunities`, etc. | Tabla simple `properties` | ⚠️ **Migrar a tu esquema normalizado** |
| **Niveles de Propiedad** | L1 (Project), L2 (Unit), L3 (Fraction) | Solo nivel único | ⚠️ **Implementar jerarquía L1/L2/L3** |
| **Opportunities** | Tabla central `opportunity` con tipos (FLIP_INVESTMENT, RENTAL_INVESTMENT, etc.) | No existe | ⚠️ **Crear tabla `opportunity`** |
| **Client Share** | Tabla `client_share` para propiedad fraccional | No existe | ⚠️ **Crear tabla `client_share`** |
| **Deals** | `deals_opportunities` consolidando Engagements + Transactions | No existe | ⚠️ **Crear tabla `deals_opportunities`** |

---

## 🏗️ Arquitectura Integrada Propuesta

### **Capa 1: Base de Datos (Supabase)**

```
Supabase PostgreSQL
├── Core Entities (Tu Arquitectura)
│   ├── property (L1/L2/L3)
│   ├── opportunity (FLIP_INVESTMENT, RENTAL_INVESTMENT, etc.)
│   ├── client_share (propiedad fraccional)
│   ├── contact (personas y entidades legales)
│   ├── geography (geographies-v2)
│   └── deals_opportunities (CRM)
│
├── Supporting Tables (Tu Arquitectura)
│   ├── address, city, region, country
│   ├── property_type, property_condition, orientation, energy_rating
│   ├── property_utilities, property_features
│   ├── property_status_history
│   ├── property_notes
│   ├── property_listing
│   ├── leads_status
│   ├── deals_feedback
│   ├── deals_services
│   ├── deals_status_history
│   ├── deals_participants
│   └── financials, files
│
└── App-Specific Tables
    ├── checklists (partner, reno_initial, reno_final)
    └── (otras tablas específicas de apps)
```

### **Capa 2: Monorepo (Apps Separadas)**

```
vistral-mvp/
├── apps/
│   ├── partner/              # App Partner
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── reno/                 # App Reno Construction Manager
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │
│   └── super-admin/          # App Super Admin / Vistral Vision
│       ├── app/
│       ├── components/
│       └── lib/
│
└── packages/
    ├── shared-db/             # 🆕 Servicios de acceso a BD
    │   ├── property-service.ts
    │   ├── opportunity-service.ts
    │   ├── client-share-service.ts
    │   ├── deals-service.ts
    │   └── geography-service.ts
    │
    ├── shared-ui/             # Componentes UI compartidos
    ├── shared-lib/            # Lógica compartida (auth, storage, etc.)
    └── shared-types/          # Tipos TypeScript compartidos
```

---

## 📊 Mapeo de Tablas: Tu Arquitectura → Supabase

### **1. Property Table (Normalizada)**

```sql
-- Tabla principal property (según tu arquitectura)
CREATE TABLE property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  
  -- Identificadores
  internal_code VARCHAR(100),
  cadastral_reference VARCHAR(100),
  cadastral_reference_value DECIMAL(12, 2),
  
  -- Jerarquía L1/L2/L3
  granularity_level VARCHAR(2) NOT NULL CHECK (granularity_level IN ('L1', 'L2', 'L3')),
  project_id UUID REFERENCES property(id), -- FK a L1 si es L2/L3
  parent_unit_id UUID REFERENCES property(id), -- FK a L2 si es L3
  
  -- Atributos físicos
  construction_year INTEGER,
  built_sqm DECIMAL(10, 2),
  usable_sqm DECIMAL(10, 2),
  land_size_sqm DECIMAL(10, 2),
  bedroom_count INTEGER,
  bathroom_count INTEGER,
  garage_space_count INTEGER,
  floor_level INTEGER,
  
  -- Enums
  property_type VARCHAR(50), -- enum
  property_condition VARCHAR(50), -- enum
  orientation VARCHAR(50), -- enum
  energy_certificate_rating VARCHAR(50), -- enum
  
  -- Ubicación
  geography_id UUID REFERENCES geographies_v2(id),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Estado comercial
  status VARCHAR(50), -- enum
  
  -- Relaciones
  created_by_id UUID REFERENCES contact(id),
  assigned_to_id UUID REFERENCES contact(id),
  
  -- Metadatos
  show_in_app BOOLEAN DEFAULT true,
  test_flag BOOLEAN DEFAULT false,
  hs_object_id VARCHAR(100), -- HubSpot reference
  correlation_id VARCHAR(100), -- AWS trace_id
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_property_granularity ON property(granularity_level);
CREATE INDEX idx_property_project_id ON property(project_id);
CREATE INDEX idx_property_parent_unit_id ON property(parent_unit_id);
CREATE INDEX idx_property_geography_id ON property(geography_id);
CREATE INDEX idx_property_status ON property(status);
```

### **2. Opportunity Table (Núcleo Unificador)**

```sql
CREATE TABLE opportunity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con Property
  property_id UUID NOT NULL REFERENCES property(id),
  
  -- Tipo de oportunidad (el núcleo unificador)
  opportunity_type VARCHAR(50) NOT NULL, -- FLIP_INVESTMENT, RENTAL_INVESTMENT, SALE_MANAGEMENT, etc.
  
  -- Estado
  status VARCHAR(50), -- TBD: to-onboard, pre-offer, pre-exchange, pre-settlement, settled, etc.
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opportunity_property_id ON opportunity(property_id);
CREATE INDEX idx_opportunity_type ON opportunity(opportunity_type);
CREATE INDEX idx_opportunity_status ON opportunity(status);
```

### **3. Client Share Table (Propiedad Fraccional)**

```sql
CREATE TABLE client_share (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con Opportunity
  opportunity_id UUID NOT NULL REFERENCES opportunity(id),
  
  -- Propietario económico (quien recibe la visibilidad/ingreso)
  owner_contact_id UUID NOT NULL REFERENCES contact(id),
  
  -- Entidad legal (Sociedad A)
  legal_entity_id UUID REFERENCES contact(id),
  
  -- Porcentajes
  ownership_percentage DECIMAL(5, 2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  financial_responsibility_percentage DECIMAL(5, 2) CHECK (financial_responsibility_percentage >= 0 AND financial_responsibility_percentage <= 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_share_opportunity_id ON client_share(opportunity_id);
CREATE INDEX idx_client_share_owner_contact_id ON client_share(owner_contact_id);
```

### **4. Deals/Opportunities Table (CRM)**

```sql
CREATE TABLE deals_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con Opportunity
  opportunity_id UUID REFERENCES opportunity(id),
  
  -- Información del deal
  buyer_type VARCHAR(50), -- Individual, Company, Trust, Partnership, Married Couple, Society
  contact_id UUID REFERENCES contact(id), -- Lead buyer
  
  -- Fechas del journey
  engagement_date DATE,
  contract_date DATE,
  settlement_date DATE,
  
  -- Deal owner
  deal_owner_id UUID REFERENCES contact(id),
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deals_opportunities_opportunity_id ON deals_opportunities(opportunity_id);
CREATE INDEX idx_deals_opportunities_contact_id ON deals_opportunities(contact_id);
```

### **5. Tablas de Soporte (Según Tu Arquitectura)**

```sql
-- Address (normalizada)
CREATE TABLE address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id),
  geography_id UUID REFERENCES geographies_v2(id),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  address_line TEXT NOT NULL
);

-- Property Features (enum en tu arquitectura)
-- Se puede usar un JSONB column o una tabla separada según necesidad

-- Property Utilities (enum en tu arquitectura)
CREATE TABLE property_utilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id),
  utility_type VARCHAR(50) NOT NULL, -- electricity, water, gas
  utility_status VARCHAR(50) NOT NULL -- enum
);

-- Property Status History
CREATE TABLE property_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by_user_id UUID REFERENCES contact(id)
);

-- Property Notes
CREATE TABLE property_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id),
  note_type VARCHAR(50), -- enum
  description TEXT,
  status VARCHAR(50), -- enum
  element VARCHAR(50), -- enum
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id UUID REFERENCES contact(id)
);
```

---

## 🔌 Servicios Compartidos (packages/shared-db)

### **Property Service**

```typescript
// packages/shared-db/property-service.ts
import { supabase } from '@/lib/supabase/client';

export interface PropertyL1 {
  id: string;
  granularity_level: 'L1';
  // ... campos L1
}

export interface PropertyL2 {
  id: string;
  granularity_level: 'L2';
  project_id: string; // FK a L1
  // ... campos L2
}

export interface PropertyL3 {
  id: string;
  granularity_level: 'L3';
  project_id: string; // FK a L1
  parent_unit_id: string; // FK a L2
  // ... campos L3
}

export class PropertyService {
  /**
   * Get property by ID (puede ser L1, L2 o L3)
   */
  async getProperty(id: string): Promise<PropertyL1 | PropertyL2 | PropertyL3 | null> {
    const { data, error } = await supabase
      .from('property')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get all properties for a Project (L1)
   */
  async getProjectProperties(projectId: string): Promise<PropertyL2[]> {
    const { data, error } = await supabase
      .from('property')
      .select('*')
      .eq('project_id', projectId)
      .eq('granularity_level', 'L2');

    return data || [];
  }

  /**
   * Get all fractions (L3) for a Unit (L2)
   */
  async getUnitFractions(unitId: string): Promise<PropertyL3[]> {
    const { data, error } = await supabase
      .from('property')
      .select('*')
      .eq('parent_unit_id', unitId)
      .eq('granularity_level', 'L3');

    return data || [];
  }
}
```

### **Opportunity Service**

```typescript
// packages/shared-db/opportunity-service.ts
export class OpportunityService {
  /**
   * Get all opportunities for a property
   */
  async getPropertyOpportunities(propertyId: string) {
    const { data, error } = await supabase
      .from('opportunity')
      .select('*')
      .eq('property_id', propertyId);

    return data || [];
  }

  /**
   * Get consolidated portfolio for a contact (Pablo's scenario)
   */
  async getContactPortfolio(contactId: string) {
    // Query que agrega todas las oportunidades y aplica client_share
    const { data, error } = await supabase
      .from('client_share')
      .select(`
        *,
        opportunity:opportunity_id (
          *,
          property:property_id (*)
        )
      `)
      .eq('owner_contact_id', contactId);

    return data || [];
  }
}
```

---

## 🔄 Plan de Migración Integrado

### **Fase 1: Setup Base de Datos (Semana 1-2)**

1. **Crear esquema en Supabase**
   - [ ] Crear tabla `property` con jerarquía L1/L2/L3
   - [ ] Crear tabla `opportunity`
   - [ ] Crear tabla `client_share`
   - [ ] Crear tabla `deals_opportunities`
   - [ ] Crear tablas de soporte (address, property_utilities, etc.)
   - [ ] Crear tabla `geographies_v2` (según tu arquitectura)
   - [ ] Crear tabla `contact` (si no existe)

2. **Migrar datos existentes**
   - [ ] Script de migración desde localStorage → Supabase
   - [ ] Mapear propiedades actuales a nivel L2 (asumir que son Units)
   - [ ] Crear oportunidades iniciales basadas en `currentStage`

### **Fase 2: Crear Servicios Compartidos (Semana 3)**

1. **Package `shared-db`**
   - [ ] Crear `PropertyService`
   - [ ] Crear `OpportunityService`
   - [ ] Crear `ClientShareService`
   - [ ] Crear `DealsService`
   - [ ] Crear `GeographyService`

2. **Tipos TypeScript**
   - [ ] Generar tipos desde Supabase (`supabase gen types`)
   - [ ] Crear interfaces compartidas en `shared-types`

### **Fase 3: Separar Apps (Semana 4-5)**

1. **Setup Monorepo**
   - [ ] Instalar Turborepo
   - [ ] Crear estructura `apps/` y `packages/`
   - [ ] Mover código a apps separadas

2. **Integrar Servicios**
   - [ ] Cada app usa `@vistral/shared-db` para acceder a BD
   - [ ] Actualizar componentes para usar nuevos servicios
   - [ ] Mantener compatibilidad con localStorage durante transición

### **Fase 4: Implementar Funcionalidades (Semana 6-8)**

1. **Partner App**
   - [ ] Usar `OpportunityService` para mostrar portfolio
   - [ ] Implementar vista consolidada usando `ClientShareService`
   - [ ] Migrar checklist a Supabase

2. **Reno App**
   - [ ] Usar `PropertyService` con filtro por `granularity_level = 'L1'`
   - [ ] Implementar drag & drop con `OpportunityService`
   - [ ] Migrar checklist a Supabase

3. **Super Admin App**
   - [ ] Vista global usando `OpportunityService`
   - [ ] Analytics usando `ClientShareService` para cálculos de porcentajes

### **Fase 5: Entornos y Deployment (Semana 9-10)**

1. **Configurar Entornos**
   - [ ] Supabase projects separados (dev, staging, prod)
   - [ ] Variables de entorno por app
   - [ ] Migraciones de BD por entorno

2. **Deployment**
   - [ ] Setup Vercel para cada app
   - [ ] CI/CD con GitHub Actions
   - [ ] Deploy automático a staging

---

## 🎯 Beneficios de la Integración

### ✅ **Escalabilidad Global**
- Soporte para múltiples países (geographies-v2)
- Propiedades fraccionales (L3) y proyectos (L1)
- Propiedad compartida (client_share)

### ✅ **Single Source of Truth**
- `opportunity` como núcleo unificador
- Eliminación de duplicación de datos
- Trazabilidad completa de decisiones de negocio

### ✅ **Separación de Apps**
- Cada app independiente pero compartiendo datos
- Deploy independiente
- Código compartido en packages

### ✅ **Mantenibilidad**
- Esquema normalizado fácil de mantener
- Servicios compartidos reutilizables
- Tipos TypeScript generados automáticamente

---

## 📝 Preguntas y Decisiones Pendientes

### **1. Migración de Datos**
- ¿Cómo mapeamos propiedades actuales a L1/L2/L3?
  - **Propuesta**: Asumir que todas son L2 (Units) inicialmente
- ¿Cómo creamos oportunidades iniciales?
  - **Propuesta**: Basarse en `currentStage` y `propertyType`

### **2. Compatibilidad**
- ¿Mantenemos localStorage durante la transición?
  - **Propuesta**: Sí, con fallback automático

### **3. Performance**
- ¿Cómo manejamos queries complejas (portfolio consolidado)?
  - **Propuesta**: Views materializadas o funciones PostgreSQL

### **4. Geographies-v2**
- ¿Cuándo implementamos geographies-v2?
  - **Propuesta**: Fase 1, antes de migrar datos

---

## 🚀 Próximos Pasos Inmediatos

1. **Revisar y aprobar este plan de integración**
2. **Crear esquema completo en Supabase** (según tu arquitectura)
3. **Generar tipos TypeScript** desde Supabase
4. **Crear servicios compartidos** (`shared-db`)
5. **Setup monorepo** con Turborepo
6. **Migrar una app como prueba** (ej: Partner)

---

¿Quieres que empecemos con alguna fase específica? Puedo ayudarte a:
- Crear el esquema SQL completo en Supabase
- Generar los servicios compartidos
- Setup del monorepo
- Scripts de migración de datos

