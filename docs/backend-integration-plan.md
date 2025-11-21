# Plan de Integración Backend con n8n para Reno App

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura y plan de implementación para integrar un backend conectado por n8n en la aplicación Reno Construction Manager, permitiendo:
- Drag & Drop en el Kanban
- Sincronización con base de datos
- Endpoints REST API
- Actualizaciones en tiempo real

---

## 🏗️ Arquitectura Propuesta

### Stack Tecnológico

```
Frontend (Next.js) 
    ↓ HTTP/REST
n8n Workflow Automation
    ↓ HTTP/REST
Backend API (Node.js/Express o Python/FastAPI)
    ↓ ORM/Query Builder
Base de Datos (PostgreSQL recomendado)
```

### Flujo de Datos

```
1. Usuario mueve tarjeta en Kanban
   ↓
2. Frontend envía PATCH/PUT a n8n webhook
   ↓
3. n8n procesa y valida datos
   ↓
4. n8n llama a Backend API
   ↓
5. Backend actualiza DB
   ↓
6. Backend notifica cambios (WebSocket/SSE)
   ↓
7. Frontend recibe actualización
```

---

## 📊 Modelo de Datos

### Tabla: `properties`

```sql
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- JSON para datos complejos
  data JSONB, -- Para PropertyData completo
  
  -- Índices
  INDEX idx_reno_phase (reno_phase),
  INDEX idx_current_stage (current_stage),
  INDEX idx_created_at (created_at)
);
```

### Tabla: `checklists`

```sql
CREATE TABLE checklists (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) REFERENCES properties(id),
  checklist_type VARCHAR(50), -- 'partner', 'reno_initial', 'reno_final'
  sections JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(property_id, checklist_type)
);
```

---

## 🔌 Endpoints API Necesarios

### 1. Properties

#### `GET /api/properties`
- **Descripción**: Obtener todas las propiedades
- **Query params**: `?phase=initial-check&search=...`
- **Response**: `{ properties: Property[] }`

#### `GET /api/properties/:id`
- **Descripción**: Obtener una propiedad específica
- **Response**: `{ property: Property }`

#### `PATCH /api/properties/:id/phase`
- **Descripción**: Cambiar fase de una propiedad (drag & drop)
- **Body**: `{ phase: RenoKanbanPhase, position?: number }`
- **Response**: `{ property: Property }`

#### `PATCH /api/properties/:id`
- **Descripción**: Actualizar cualquier campo de la propiedad
- **Body**: `Partial<Property>`
- **Response**: `{ property: Property }`

#### `POST /api/properties`
- **Descripción**: Crear nueva propiedad
- **Body**: `Property`
- **Response**: `{ property: Property }`

### 2. Checklists

#### `GET /api/properties/:id/checklist/:type`
- **Descripción**: Obtener checklist de una propiedad
- **Type**: `partner | reno_initial | reno_final`
- **Response**: `{ checklist: ChecklistData }`

#### `PUT /api/properties/:id/checklist/:type`
- **Descripción**: Guardar/actualizar checklist completo
- **Body**: `ChecklistData`
- **Response**: `{ checklist: ChecklistData }`

#### `PATCH /api/properties/:id/checklist/:type/section/:sectionId`
- **Descripción**: Actualizar una sección específica del checklist
- **Body**: `ChecklistSection`
- **Response**: `{ section: ChecklistSection }`

### 3. Webhooks (n8n)

#### `POST /webhook/n8n/property-updated`
- **Descripción**: Webhook que n8n llama cuando detecta cambios
- **Body**: `{ propertyId: string, changes: object }`
- **Uso**: Para sincronización bidireccional

---

## 🔄 Workflows n8n

### Workflow 1: Property Phase Update

```
Trigger: Webhook (POST /webhook/n8n/property-phase-update)
  ↓
Validate: Verificar que la fase es válida
  ↓
Transform: Mapear datos al formato del backend
  ↓
HTTP Request: PATCH /api/properties/:id/phase
  ↓
If Success:
  ↓
  Notify: Enviar notificación WebSocket/SSE
  ↓
  Log: Registrar cambio en audit log
Else:
  ↓
  Error Handler: Retornar error al frontend
```

### Workflow 2: Checklist Auto-save

```
Trigger: Webhook (POST /webhook/n8n/checklist-save)
  ↓
Debounce: Esperar 2 segundos (evitar múltiples saves)
  ↓
Validate: Verificar estructura del checklist
  ↓
HTTP Request: PATCH /api/properties/:id/checklist/:type/section/:sectionId
  ↓
If Success:
  ↓
  Cache: Actualizar cache si existe
  ↓
  Notify: Notificar otros usuarios conectados
```

### Workflow 3: Property Sync (Bidireccional)

```
Trigger: Cron (cada 5 minutos) o Webhook
  ↓
HTTP Request: GET /api/properties?updated_since=:timestamp
  ↓
For each property:
  ↓
  Compare: Comparar con localStorage/cache
  ↓
  If different:
    ↓
    Update: Actualizar frontend via WebSocket
```

---

## 🎯 Implementación Frontend

### 1. Crear servicio API

**`lib/api/reno-api.ts`**

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export class RenoApiService {
  // Properties
  async getProperties(phase?: RenoKanbanPhase): Promise<Property[]> {
    const url = phase 
      ? `${API_BASE_URL}/api/properties?phase=${phase}`
      : `${API_BASE_URL}/api/properties`;
    
    const res = await fetch(url);
    const json = await res.json();
    return json.properties || [];
  }

  async updatePropertyPhase(
    propertyId: string, 
    phase: RenoKanbanPhase,
    position?: number
  ): Promise<Property> {
    const res = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, position }),
    });
    const json = await res.json();
    return json.property;
  }

  // Checklists
  async getChecklist(
    propertyId: string, 
    type: 'reno_initial' | 'reno_final'
  ): Promise<ChecklistData | null> {
    const res = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/checklist/${type}`);
    if (res.status === 404) return null;
    const json = await res.json();
    return json.checklist;
  }

  async saveChecklist(
    propertyId: string,
    type: 'reno_initial' | 'reno_final',
    checklist: ChecklistData
  ): Promise<ChecklistData> {
    const res = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/checklist/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checklist),
    });
    const json = await res.json();
    return json.checklist;
  }
}

export const renoApi = new RenoApiService();
```

### 2. Implementar Drag & Drop

**Usar `@dnd-kit/core` o `react-beautiful-dnd`**

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (!over) return;
  
  const propertyId = active.id as string;
  const newPhase = over.id as RenoKanbanPhase;
  
  // Optimistic update
  updateLocalState(propertyId, newPhase);
  
  try {
    // Llamar a n8n webhook o directamente a API
    await renoApi.updatePropertyPhase(propertyId, newPhase);
  } catch (error) {
    // Revertir cambio
    revertLocalState(propertyId);
    showError('Error al mover la propiedad');
  }
};
```

### 3. WebSocket para actualizaciones en tiempo real

**`lib/api/websocket.ts`**

```typescript
export class PropertyWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners(data.type, data.payload);
    };
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private notifyListeners(event: string, payload: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(payload));
  }
}
```

---

## 📝 Plan de Implementación (Fases)

### Fase 1: Setup Inicial (Semana 1)

1. **Setup Backend**
   - [ ] Crear proyecto Node.js/Express o Python/FastAPI
   - [ ] Configurar PostgreSQL
   - [ ] Crear migraciones de base de datos
   - [ ] Implementar modelos básicos

2. **Setup n8n**
   - [ ] Instalar n8n (Docker o servidor)
   - [ ] Configurar webhooks básicos
   - [ ] Crear workflow de prueba

3. **Frontend: Servicio API**
   - [ ] Crear `lib/api/reno-api.ts`
   - [ ] Implementar funciones básicas (GET, PATCH)
   - [ ] Agregar manejo de errores

### Fase 2: Kanban Drag & Drop (Semana 2)

1. **Implementar Drag & Drop**
   - [ ] Instalar `@dnd-kit/core`
   - [ ] Modificar `RenoKanbanBoard` para soportar drag
   - [ ] Implementar `handleDragEnd`
   - [ ] Conectar con API

2. **Optimistic Updates**
   - [ ] Actualizar UI inmediatamente
   - [ ] Revertir si falla la API
   - [ ] Mostrar loading states

3. **Sincronización**
   - [ ] Implementar WebSocket básico
   - [ ] Actualizar kanban cuando otros usuarios mueven tarjetas
   - [ ] Manejar conflictos

### Fase 3: Checklists Backend (Semana 3)

1. **Endpoints Checklist**
   - [ ] Implementar GET/PUT/PATCH para checklists
   - [ ] Validar estructura de datos
   - [ ] Implementar versionado (opcional)

2. **Auto-save mejorado**
   - [ ] Conectar auto-save con API
   - [ ] Implementar debounce en n8n
   - [ ] Manejar errores de conexión

### Fase 4: Sincronización Bidireccional (Semana 4)

1. **WebSocket completo**
   - [ ] Implementar en backend
   - [ ] Conectar frontend
   - [ ] Manejar reconexión

2. **Conflict Resolution**
   - [ ] Detectar conflictos
   - [ ] Mostrar diálogo al usuario
   - [ ] Implementar merge strategy

### Fase 5: Testing & Optimización (Semana 5)

1. **Testing**
   - [ ] Tests unitarios API
   - [ ] Tests de integración n8n
   - [ ] Tests E2E drag & drop

2. **Optimización**
   - [ ] Caché en frontend
   - [ ] Paginación en listados
   - [ ] Lazy loading

---

## 🔐 Seguridad y Autenticación

### Autenticación

```typescript
// Agregar token JWT a todas las requests
const token = localStorage.getItem('auth_token');

fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### n8n Security

- Validar webhooks con secret key
- Rate limiting en endpoints
- CORS configurado correctamente

---

## 📦 Variables de Entorno

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook/property-update

# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/vistral_reno
JWT_SECRET=your-secret-key
N8N_API_KEY=your-n8n-api-key

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password
```

---

## 🚀 Próximos Pasos Recomendados

1. **Empezar con MVP mínimo:**
   - Solo drag & drop del kanban
   - Un endpoint básico de actualización
   - Sin WebSocket inicialmente

2. **Iterar:**
   - Agregar checklists
   - Agregar WebSocket
   - Agregar más funcionalidades

3. **Consideraciones:**
   - Mantener localStorage como fallback
   - Implementar modo offline
   - Cache inteligente

---

## 💡 Recomendaciones Técnicas

### Base de Datos
- **PostgreSQL** recomendado por soporte JSONB nativo
- Usar migraciones (Prisma, TypeORM, Alembic)
- Índices en campos frecuentemente consultados

### Backend Framework
- **Node.js/Express**: Si el equipo conoce JavaScript
- **Python/FastAPI**: Si prefieren Python, mejor performance
- **NestJS**: Si quieren estructura más robusta

### n8n Workflows
- Empezar simple, iterar
- Usar error handling nodes
- Logging para debugging
- Testing de workflows manualmente primero

### Frontend
- Mantener estado local optimista
- Implementar retry logic
- Mostrar estados de carga claros
- Manejar errores gracefully

---

## 📚 Recursos Útiles

- [n8n Documentation](https://docs.n8n.io/)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [PostgreSQL JSONB Guide](https://www.postgresql.org/docs/current/datatype-json.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

¿Quieres que empecemos implementando alguna parte específica?

