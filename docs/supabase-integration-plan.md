# Plan de Integración con Supabase para Reno App

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura y plan de implementación para integrar Supabase como backend para la aplicación Reno Construction Manager, permitiendo:
- Drag & Drop en el Kanban con sincronización en tiempo real
- Base de datos PostgreSQL gestionada por Supabase
- API REST automática
- Subscripciones en tiempo real (Realtime)
- Autenticación integrada
- Integración con n8n para workflows

---

## 🏗️ Arquitectura con Supabase

### Stack Tecnológico

```
Frontend (Next.js)
    ↓ Supabase Client
Supabase (PostgreSQL + REST API + Realtime + Auth)
    ↓ HTTP/REST
n8n Workflow Automation (opcional, para lógica compleja)
```

### Ventajas de Supabase

✅ **PostgreSQL nativo**: Base de datos robusta y escalable  
✅ **REST API automática**: No necesitas crear endpoints manualmente  
✅ **Realtime**: Subscripciones WebSocket integradas  
✅ **Autenticación**: Row Level Security (RLS) integrado  
✅ **Storage**: Para fotos/videos de checklists  
✅ **Edge Functions**: Para lógica serverless si necesitas  

---

## 📊 Esquema de Base de Datos

### Tabla: `properties`

```sql
-- Crear tabla properties
CREATE TABLE properties (
  id VARCHAR(50) PRIMARY KEY,
  full_address TEXT NOT NULL,
  property_type VARCHAR(50),
  current_stage VARCHAR(50), -- Para Partner module
  reno_phase VARCHAR(50),    -- Para Reno module
  
  -- Datos básicos
  address TEXT,
  price DECIMAL(12, 2),
  analyst VARCHAR(100),
  completion INTEGER DEFAULT 0,
  
  -- Campos Reno específicos
  region VARCHAR(100),
  reno_type VARCHAR(50),
  renovador VARCHAR(100),
  inicio DATE,
  fin_est DATE,
  real_settlement_date DATE,
  estimated_visit_date DATE,
  real_completion_date DATE,
  estimated_final_visit_date DATE,
  setup_status_notes TEXT,
  proxima_actualizacion DATE,
  ultima_actualizacion DATE,
  
  -- Metadatos
  time_in_stage VARCHAR(50),
  time_created VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- JSON para datos complejos
  data JSONB DEFAULT '{}'::jsonb, -- Para PropertyData completo
  
  -- Usuario que creó/modificó
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_properties_reno_phase ON properties(reno_phase);
CREATE INDEX idx_properties_current_stage ON properties(current_stage);
CREATE INDEX idx_properties_created_at ON properties(created_at);
CREATE INDEX idx_properties_updated_at ON properties(updated_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at 
  BEFORE UPDATE ON properties 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### Tabla: `checklists`

```sql
-- Crear tabla checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  checklist_type VARCHAR(50) NOT NULL, -- 'partner', 'reno_initial', 'reno_final'
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(property_id, checklist_type)
);

-- Índices
CREATE INDEX idx_checklists_property_id ON checklists(property_id);
CREATE INDEX idx_checklists_type ON checklists(checklist_type);
CREATE INDEX idx_checklists_updated_at ON checklists(updated_at);

-- Trigger para updated_at
CREATE TRIGGER update_checklists_updated_at 
  BEFORE UPDATE ON checklists 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- Políticas para properties
CREATE POLICY "Users can view all properties"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Users can insert properties"
  ON properties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update properties"
  ON properties FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para checklists
CREATE POLICY "Users can view all checklists"
  ON checklists FOR SELECT
  USING (true);

CREATE POLICY "Users can insert checklists"
  ON checklists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update checklists"
  ON checklists FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

---

## 🔌 Supabase Client Setup

### Instalación

```bash
npm install @supabase/supabase-js
```

### Configuración (`lib/supabase/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### Tipos TypeScript (`lib/supabase/database.types.ts`)

```typescript
// Generar tipos desde Supabase Dashboard o CLI
// supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          full_address: string;
          property_type: string | null;
          current_stage: string | null;
          reno_phase: string | null;
          address: string | null;
          price: number | null;
          analyst: string | null;
          completion: number | null;
          region: string | null;
          reno_type: string | null;
          renovador: string | null;
          inicio: string | null;
          fin_est: string | null;
          real_settlement_date: string | null;
          estimated_visit_date: string | null;
          real_completion_date: string | null;
          estimated_final_visit_date: string | null;
          setup_status_notes: string | null;
          proxima_actualizacion: string | null;
          ultima_actualizacion: string | null;
          time_in_stage: string | null;
          time_created: string | null;
          created_at: string;
          updated_at: string;
          data: Json;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id: string;
          full_address: string;
          property_type?: string | null;
          current_stage?: string | null;
          reno_phase?: string | null;
          // ... otros campos
        };
        Update: {
          id?: string;
          full_address?: string;
          // ... campos opcionales para update
        };
      };
      checklists: {
        Row: {
          id: string;
          property_id: string;
          checklist_type: string;
          sections: Json;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          property_id: string;
          checklist_type: string;
          sections?: Json;
        };
        Update: {
          sections?: Json;
          updated_at?: string;
        };
      };
    };
  };
}
```

---

## 📝 Servicio API con Supabase

### `lib/api/supabase-properties.ts`

```typescript
import { supabase } from '@/lib/supabase/client';
import { Property } from '@/lib/property-storage';
import { RenoKanbanPhase } from '@/lib/reno-kanban-config';

export class SupabasePropertiesService {
  /**
   * Get all properties, optionally filtered by phase
   */
  async getProperties(phase?: RenoKanbanPhase): Promise<Property[]> {
    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (phase) {
      query = query.eq('reno_phase', phase);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching properties: ${error.message}`);
    }

    return this.mapToProperties(data || []);
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error fetching property: ${error.message}`);
    }

    return data ? this.mapToProperty(data) : null;
  }

  /**
   * Update property phase (for drag & drop)
   */
  async updatePropertyPhase(
    propertyId: string,
    phase: RenoKanbanPhase,
    position?: number
  ): Promise<Property> {
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
      throw new Error(`Error updating property phase: ${error.message}`);
    }

    return this.mapToProperty(data);
  }

  /**
   * Update any property field
   */
  async updateProperty(
    propertyId: string,
    updates: Partial<Property>
  ): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update({
        ...this.mapFromProperty(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating property: ${error.message}`);
    }

    return this.mapToProperty(data);
  }

  /**
   * Create a new property
   */
  async createProperty(property: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert(this.mapFromProperty(property))
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating property: ${error.message}`);
    }

    return this.mapToProperty(data);
  }

  /**
   * Subscribe to property changes (Realtime)
   */
  subscribeToProperties(
    phase: RenoKanbanPhase | null,
    callback: (property: Property) => void
  ) {
    let channel = supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          ...(phase && { filter: `reno_phase=eq.${phase}` }),
        },
        (payload) => {
          const property = this.mapToProperty(payload.new as any);
          callback(property);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to phase changes (for drag & drop)
   */
  subscribeToPhaseChanges(
    callback: (payload: { propertyId: string; oldPhase: string | null; newPhase: string | null }) => void
  ) {
    let channel = supabase
      .channel('phase-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties',
          filter: 'reno_phase=neq.null',
        },
        (payload) => {
          const oldPhase = (payload.old as any)?.reno_phase;
          const newPhase = (payload.new as any)?.reno_phase;
          
          if (oldPhase !== newPhase) {
            callback({
              propertyId: (payload.new as any).id,
              oldPhase,
              newPhase,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Helper methods to map between Supabase and Property types
  private mapToProperty(row: any): Property {
    return {
      id: row.id,
      fullAddress: row.full_address,
      propertyType: row.property_type,
      currentStage: row.current_stage,
      address: row.address,
      price: row.price,
      analyst: row.analyst,
      completion: row.completion,
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
      data: row.data || {},
    };
  }

  private mapToProperties(rows: any[]): Property[] {
    return rows.map(row => this.mapToProperty(row));
  }

  private mapFromProperty(property: Partial<Property>): any {
    return {
      id: property.id,
      full_address: property.fullAddress,
      property_type: property.propertyType,
      current_stage: property.currentStage,
      address: property.address,
      price: property.price,
      analyst: property.analyst,
      completion: property.completion,
      region: property.region,
      reno_type: property.renoType,
      renovador: property.renovador,
      inicio: property.inicio,
      fin_est: property.finEst,
      real_settlement_date: property.realSettlementDate,
      estimated_visit_date: property.estimatedVisitDate,
      real_completion_date: property.realCompletionDate,
      estimated_final_visit_date: property.estimatedFinalVisitDate,
      setup_status_notes: property.setupStatusNotes,
      proxima_actualizacion: property.proximaActualizacion,
      ultima_actualizacion: property.ultimaActualizacion,
      time_in_stage: property.timeInStage,
      time_created: property.timeCreated,
      data: property.data || {},
    };
  }
}

export const supabaseProperties = new SupabasePropertiesService();
```

---

## 🔄 Realtime Subscriptions

### Uso en Componentes

```typescript
import { useEffect, useState } from 'react';
import { supabaseProperties } from '@/lib/api/supabase-properties';
import { Property } from '@/lib/property-storage';

export function RenoKanbanBoard() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    // Load initial data
    supabaseProperties.getProperties().then(setProperties);

    // Subscribe to changes
    const unsubscribe = supabaseProperties.subscribeToPhaseChanges((payload) => {
      // Update local state when phase changes
      setProperties(prev => 
        prev.map(p => 
          p.id === payload.propertyId 
            ? { ...p, renoPhase: payload.newPhase as any }
            : p
        )
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
```

---

## 🤖 Integración con n8n

### Workflow: Property Phase Update

n8n puede conectarse a Supabase usando:

1. **Supabase Node** (si existe en n8n)
2. **HTTP Request** a Supabase REST API
3. **Supabase Edge Function** (opcional, para lógica compleja)

### Ejemplo: HTTP Request a Supabase REST API

```
1. Webhook (Trigger)
   ↓
2. Validate Data
   ↓
3. HTTP Request: PATCH https://YOUR_PROJECT.supabase.co/rest/v1/properties
   - Headers:
     - apikey: YOUR_SERVICE_ROLE_KEY
     - Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     - Content-Type: application/json
     - Prefer: return=representation
   - Body: { reno_phase: $json.phase }
   - Query: ?id=eq.$json.propertyId
   ↓
4. If Success:
   - Log success
   - Return updated property
Else:
   - Error handler
```

---

## 📦 Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Para n8n (usar service_role key, nunca exponer en frontend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🚀 Plan de Implementación

### Fase 1: Setup Supabase (Semana 1)

1. **Crear proyecto Supabase**
   - [ ] Crear cuenta/proyecto en supabase.com
   - [ ] Crear tablas `properties` y `checklists`
   - [ ] Configurar RLS policies
   - [ ] Generar tipos TypeScript

2. **Setup Frontend**
   - [ ] Instalar `@supabase/supabase-js`
   - [ ] Configurar cliente Supabase
   - [ ] Crear servicio `SupabasePropertiesService`
   - [ ] Migrar datos desde localStorage (opcional)

### Fase 2: Drag & Drop con Realtime (Semana 2)

1. **Implementar Drag & Drop**
   - [ ] Instalar `@dnd-kit`
   - [ ] Modificar `RenoKanbanBoard`
   - [ ] Conectar con `supabaseProperties.updatePropertyPhase`

2. **Realtime Subscriptions**
   - [ ] Suscribirse a cambios de fase
   - [ ] Actualizar UI automáticamente
   - [ ] Manejar conflictos

### Fase 3: Checklists (Semana 3)

1. **Checklists Service**
   - [ ] Crear `SupabaseChecklistsService`
   - [ ] Implementar GET/PUT/PATCH
   - [ ] Conectar auto-save

2. **Realtime para Checklists**
   - [ ] Suscribirse a cambios
   - [ ] Mostrar indicador cuando otro usuario edita

### Fase 4: n8n Integration (Semana 4)

1. **Workflows n8n**
   - [ ] Configurar conexión a Supabase
   - [ ] Crear workflow para validaciones complejas
   - [ ] Integrar con otros servicios si es necesario

---

## 💡 Ventajas de Supabase vs Backend Custom

✅ **Menos código**: No necesitas crear endpoints  
✅ **Realtime nativo**: WebSockets integrados  
✅ **Escalable**: Infraestructura gestionada  
✅ **Seguridad**: RLS integrado  
✅ **TypeScript**: Tipos generados automáticamente  
✅ **Storage**: Para fotos/videos sin setup adicional  

---

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript](https://supabase.com/docs/reference/javascript/typescript-support)

