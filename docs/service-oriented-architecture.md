# Arquitectura Orientada a Servicios (SOA) - Vistral

## 📋 Principios Fundamentales

### ✅ **Objetivos**
- **Separación de responsabilidades**: Cada servicio maneja un dominio específico
- **Independencia**: Cada servicio puede desplegarse y escalarse independientemente
- **Mantenibilidad**: Cambios en un servicio no afectan a otros
- **Escalabilidad**: Escalar solo los servicios que necesitan más recursos

### ❌ **Evitar**
- Monolito con todo acoplado
- Dependencias circulares entre servicios
- Base de datos compartida directamente entre servicios
- Lógica de negocio duplicada

---

## 🏗️ Arquitectura de Servicios Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Apps (Next.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐            │
│  │ Partner  │  │   Reno    │  │ Super Admin  │            │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘            │
└───────┼───────────────┼───────────────┼────────────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │      API Gateway              │
        │  (Vercel Edge Functions /    │
        │   Cloudflare Workers)         │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   Property   │ │ Opportunity │ │    Deals    │
│   Service    │ │   Service   │ │   Service   │
│              │ │             │ │             │
│  - CRUD L1   │ │ - CRUD      │ │ - CRUD      │
│  - CRUD L2   │ │ - Portfolio │ │ - Journey   │
│  - CRUD L3   │ │ - Analytics │ │ - Status    │
│  - Features  │ │             │ │             │
└──────┬───────┘ └──────┬──────┘ └──────┬──────┘
       │                │               │
       └────────────────┼───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │      Supabase PostgreSQL     │
        │  (Cada servicio tiene su     │
        │   propio schema/namespace)    │
        └──────────────────────────────┘
```

---

## 🔌 Servicios Propuestos

### **1. Property Service**
**Responsabilidad**: Gestión de propiedades físicas (L1/L2/L3)

**Endpoints**:
```
GET    /api/properties/:id
POST   /api/properties
PATCH  /api/properties/:id
DELETE /api/properties/:id

GET    /api/properties?granularity_level=L1
GET    /api/properties/:projectId/units (L2)
GET    /api/properties/:unitId/fractions (L3)

GET    /api/properties/:id/features
PATCH  /api/properties/:id/features
```

**Base de Datos**:
- Schema: `property_service`
- Tablas: `property`, `address`, `property_features`, `property_utilities`, `property_status_history`

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

### **2. Opportunity Service**
**Responsabilidad**: Gestión de oportunidades de negocio (núcleo unificador)

**Endpoints**:
```
GET    /api/opportunities/:id
POST   /api/opportunities
PATCH  /api/opportunities/:id

GET    /api/opportunities?property_id=:id
GET    /api/opportunities?contact_id=:id
GET    /api/opportunities?type=FLIP_INVESTMENT

GET    /api/opportunities/:id/portfolio (con client_share aplicado)
GET    /api/contacts/:id/consolidated-portfolio
```

**Base de Datos**:
- Schema: `opportunity_service`
- Tablas: `opportunity`, `client_share`

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

### **3. Deals Service (CRM)**
**Responsabilidad**: Gestión del journey de compra/venta/alquiler

**Endpoints**:
```
GET    /api/deals/:id
POST   /api/deals
PATCH  /api/deals/:id

GET    /api/deals?contact_id=:id
GET    /api/deals?status=closed_won
GET    /api/deals/:id/participants
POST   /api/deals/:id/participants

GET    /api/deals/:id/status-history
POST   /api/deals/:id/feedback
```

**Base de Datos**:
- Schema: `deals_service`
- Tablas: `deals_opportunities`, `deals_participants`, `deals_status_history`, `deals_feedback`, `deals_services`, `leads_status`

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

### **4. Checklist Service**
**Responsabilidad**: Gestión de checklists (Partner, Reno Initial, Reno Final)

**Endpoints**:
```
GET    /api/checklists/:id
POST   /api/checklists
PATCH  /api/checklists/:id

GET    /api/checklists?property_id=:id&type=partner
GET    /api/checklists?property_id=:id&type=reno_initial
GET    /api/checklists?property_id=:id&type=reno_final

POST   /api/checklists/:id/sections/:sectionId
PATCH  /api/checklists/:id/sections/:sectionId
```

**Base de Datos**:
- Schema: `checklist_service`
- Tablas: `checklists`, `checklist_sections` (JSONB o normalizado)

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

### **5. Geography Service**
**Responsabilidad**: Gestión de datos geográficos (geographies-v2)

**Endpoints**:
```
GET    /api/geographies/:id
GET    /api/geographies?country=ES&level=postal_code
GET    /api/geographies/:id/hierarchy (recursivo hasta country)
GET    /api/geographies/:id/tax-jurisdiction
```

**Base de Datos**:
- Schema: `geography_service`
- Tablas: `geographies_v2`, `tax_jurisdictions`

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

### **6. Contact Service**
**Responsabilidad**: Gestión de contactos (personas y entidades legales)

**Endpoints**:
```
GET    /api/contacts/:id
POST   /api/contacts
PATCH  /api/contacts/:id

GET    /api/contacts?type=individual
GET    /api/contacts?type=company
GET    /api/contacts?type=trust
```

**Base de Datos**:
- Schema: `contact_service`
- Tablas: `contact`, `contact_role`, `property_contact`

**Tecnología**:
- **Backend**: Next.js API Routes o Supabase Edge Functions
- **Storage**: Supabase PostgreSQL (schema separado)

---

## 🏛️ Estructura del Monorepo (Servicios Separados)

```
vistral-mvp/
├── services/                    # 🆕 Servicios backend
│   ├── property-service/
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Lógica de negocio
│   │   │   ├── models/         # Modelos de datos
│   │   │   └── db/             # Queries SQL
│   │   ├── supabase/
│   │   │   └── migrations/     # Migraciones del schema
│   │   └── package.json
│   │
│   ├── opportunity-service/
│   │   ├── src/
│   │   ├── supabase/
│   │   └── package.json
│   │
│   ├── deals-service/
│   │   ├── src/
│   │   ├── supabase/
│   │   └── package.json
│   │
│   ├── checklist-service/
│   │   ├── src/
│   │   ├── supabase/
│   │   └── package.json
│   │
│   ├── geography-service/
│   │   ├── src/
│   │   ├── supabase/
│   │   └── package.json
│   │
│   └── contact-service/
│       ├── src/
│       ├── supabase/
│       └── package.json
│
├── apps/                        # Frontend apps
│   ├── partner/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │       └── api/            # Clientes API para servicios
│   │
│   ├── reno/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │       └── api/
│   │
│   └── super-admin/
│       ├── app/
│       ├── components/
│       └── lib/
│           └── api/
│
├── packages/
│   ├── api-client/             # 🆕 Cliente HTTP compartido
│   │   ├── property-client.ts
│   │   ├── opportunity-client.ts
│   │   ├── deals-client.ts
│   │   └── checklist-client.ts
│   │
│   ├── shared-types/           # Tipos TypeScript compartidos
│   │   ├── property.types.ts
│   │   ├── opportunity.types.ts
│   │   └── deals.types.ts
│   │
│   └── shared-ui/              # Componentes UI compartidos
│
└── infrastructure/
    ├── api-gateway/            # 🆕 API Gateway (opcional)
    └── docker/                 # Dockerfiles para servicios
```

---

## 🔌 Comunicación Entre Servicios

### **Opción 1: REST API (Recomendado para empezar)**

```typescript
// packages/api-client/property-client.ts
export class PropertyClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_PROPERTY_SERVICE_URL!) {
    this.baseUrl = baseUrl;
  }

  async getProperty(id: string): Promise<Property> {
    const response = await fetch(`${this.baseUrl}/api/properties/${id}`);
    if (!response.ok) throw new Error('Failed to fetch property');
    return response.json();
  }

  async createProperty(property: CreatePropertyDto): Promise<Property> {
    const response = await fetch(`${this.baseUrl}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    if (!response.ok) throw new Error('Failed to create property');
    return response.json();
  }
}
```

### **Opción 2: Event-Driven (Para el futuro)**

```typescript
// Event: property.created
// Event: opportunity.updated
// Event: deal.status_changed

// Usar Supabase Realtime o un message broker (RabbitMQ, AWS SQS)
```

---

## 🗄️ Estrategia de Base de Datos

### **Opción A: Schemas Separados en Supabase (Recomendado)**

```sql
-- Cada servicio tiene su propio schema
CREATE SCHEMA property_service;
CREATE SCHEMA opportunity_service;
CREATE SCHEMA deals_service;
CREATE SCHEMA checklist_service;
CREATE SCHEMA geography_service;
CREATE SCHEMA contact_service;

-- Cada servicio solo accede a su schema
-- Comunicación entre servicios vía API, no directa a BD
```

**Ventajas**:
- ✅ Separación clara de datos
- ✅ Un solo proyecto Supabase
- ✅ Fácil de mantener
- ✅ Row Level Security por schema

**Desventajas**:
- ⚠️ Joins entre schemas requieren funciones PostgreSQL o API calls

### **Opción B: Proyectos Supabase Separados**

```
- vistral-property-service (Supabase project)
- vistral-opportunity-service (Supabase project)
- vistral-deals-service (Supabase project)
- etc.
```

**Ventajas**:
- ✅ Separación completa
- ✅ Escalado independiente
- ✅ Deploy independiente

**Desventajas**:
- ⚠️ Más complejo de gestionar
- ⚠️ Más costoso (múltiples proyectos)

---

## 🚀 Implementación con Next.js

### **Cada Servicio como Next.js App**

```typescript
// services/property-service/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/services/property-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyService = new PropertyService();
  const property = await propertyService.getProperty(params.id);
  
  if (!property) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.json(property);
}
```

### **Deployment**

**Opción 1: Vercel (Cada servicio como proyecto separado)**
```
- vistral-property-service.vercel.app
- vistral-opportunity-service.vercel.app
- vistral-deals-service.vercel.app
```

**Opción 2: Monorepo con Vercel**
```json
// vercel.json
{
  "projects": [
    {
      "name": "vistral-property-service",
      "root": "services/property-service"
    },
    {
      "name": "vistral-opportunity-service",
      "root": "services/opportunity-service"
    }
  ]
}
```

---

## 📦 Cliente API Compartido

```typescript
// packages/api-client/index.ts
import { PropertyClient } from './property-client';
import { OpportunityClient } from './opportunity-client';
import { DealsClient } from './deals-client';
import { ChecklistClient } from './checklist-client';

export class VistralApiClient {
  property: PropertyClient;
  opportunity: OpportunityClient;
  deals: DealsClient;
  checklist: ChecklistClient;

  constructor() {
    this.property = new PropertyClient(
      process.env.NEXT_PUBLIC_PROPERTY_SERVICE_URL!
    );
    this.opportunity = new OpportunityClient(
      process.env.NEXT_PUBLIC_OPPORTUNITY_SERVICE_URL!
    );
    this.deals = new DealsClient(
      process.env.NEXT_PUBLIC_DEALS_SERVICE_URL!
    );
    this.checklist = new ChecklistClient(
      process.env.NEXT_PUBLIC_CHECKLIST_SERVICE_URL!
    );
  }
}

export const api = new VistralApiClient();
```

**Uso en Frontend**:
```typescript
// apps/partner/lib/api/properties.ts
import { api } from '@vistral/api-client';

export async function getProperty(id: string) {
  return api.property.getProperty(id);
}

export async function getPropertyOpportunities(id: string) {
  return api.opportunity.getPropertyOpportunities(id);
}
```

---

## 🔐 Seguridad y Autenticación

### **Autenticación Centralizada**

```typescript
// packages/auth-service/
// Servicio compartido para autenticación

// Cada servicio valida el token JWT
// Token generado por Supabase Auth
```

### **API Keys por Servicio** (Para comunicación service-to-service)

```typescript
// services/property-service/src/middleware/auth.ts
export async function validateServiceToken(request: Request) {
  const token = request.headers.get('X-Service-Token');
  // Validar contra Supabase o secrets
}
```

---

## 📊 Monitoreo y Observabilidad

### **Logging Centralizado**
- Cada servicio loggea a un servicio central (ej: Datadog, LogRocket)

### **Métricas**
- Cada servicio expone métricas (ej: Prometheus)
- Dashboard centralizado (ej: Grafana)

### **Tracing**
- Distributed tracing (ej: OpenTelemetry)
- Rastrear requests a través de múltiples servicios

---

## 🔄 Plan de Migración Gradual

### **Fase 1: Setup Servicios Base (Semana 1-2)**
1. Crear estructura de servicios en monorepo
2. Setup Property Service (migrar desde localStorage)
3. Setup Opportunity Service
4. Crear cliente API compartido

### **Fase 2: Migrar Frontend Apps (Semana 3-4)**
1. Partner App → usar Property Service + Opportunity Service
2. Reno App → usar Property Service + Checklist Service
3. Super Admin → usar todos los servicios

### **Fase 3: Servicios Adicionales (Semana 5-6)**
1. Deals Service
2. Geography Service
3. Contact Service

### **Fase 4: Optimización (Semana 7-8)**
1. Caching (Redis o Vercel KV)
2. Rate limiting
3. Monitoring y alerting

---

## ✅ Ventajas de Esta Arquitectura

1. **Escalabilidad Independiente**: Escalar solo Property Service si hay mucho tráfico
2. **Deploy Independiente**: Cambios en Deals Service no afectan Property Service
3. **Equipos Independientes**: Cada equipo puede trabajar en su servicio
4. **Tecnología Flexible**: Cada servicio puede usar diferentes tecnologías si es necesario
5. **Testing Aislado**: Tests unitarios por servicio, más fácil de mantener
6. **Mantenibilidad**: Código más pequeño y enfocado por servicio

---

## 🎯 Próximos Pasos

1. **Aprobar esta arquitectura**
2. **Crear estructura inicial del monorepo**
3. **Implementar Property Service como prueba de concepto**
4. **Migrar una app frontend para usar el servicio**
5. **Iterar y mejorar**

---

¿Te parece bien esta arquitectura orientada a servicios? ¿Quieres que empecemos con algún servicio específico?

