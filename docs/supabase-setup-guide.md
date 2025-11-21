# Guía de Setup de Supabase

## Paso 1: Crear Proyecto Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que se complete el setup (2-3 minutos)

## Paso 2: Crear Tablas

Ve a **SQL Editor** en el dashboard de Supabase y ejecuta:

```sql
-- Tabla properties
CREATE TABLE properties (
  id VARCHAR(50) PRIMARY KEY,
  full_address TEXT NOT NULL,
  property_type VARCHAR(50),
  current_stage VARCHAR(50),
  reno_phase VARCHAR(50),
  
  address TEXT,
  price DECIMAL(12, 2),
  analyst VARCHAR(100),
  completion INTEGER DEFAULT 0,
  
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
  
  time_in_stage VARCHAR(50),
  time_created VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  data JSONB DEFAULT '{}'::jsonb,
  
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_properties_reno_phase ON properties(reno_phase);
CREATE INDEX idx_properties_current_stage ON properties(current_stage);
CREATE INDEX idx_properties_created_at ON properties(created_at);
CREATE INDEX idx_properties_updated_at ON properties(updated_at);

-- Trigger para updated_at
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

-- Tabla checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  checklist_type VARCHAR(50) NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(property_id, checklist_type)
);

CREATE INDEX idx_checklists_property_id ON checklists(property_id);
CREATE INDEX idx_checklists_type ON checklists(checklist_type);
CREATE INDEX idx_checklists_updated_at ON checklists(updated_at);

CREATE TRIGGER update_checklists_updated_at 
  BEFORE UPDATE ON checklists 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

## Paso 3: Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- Políticas para properties (permitir todo por ahora, ajustar según necesidades)
CREATE POLICY "Enable read access for all users"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON properties FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON properties FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Políticas para checklists
CREATE POLICY "Enable read access for all users"
  ON checklists FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON checklists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON checklists FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

## Paso 4: Habilitar Realtime

1. Ve a **Database** > **Replication**
2. Habilita replication para:
   - `properties` table
   - `checklists` table

O ejecuta en SQL Editor:

```sql
-- Habilitar Realtime para properties
ALTER PUBLICATION supabase_realtime ADD TABLE properties;

-- Habilitar Realtime para checklists
ALTER PUBLICATION supabase_realtime ADD TABLE checklists;
```

## Paso 5: Obtener Credenciales

1. Ve a **Project Settings** > **API**
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Para n8n (nunca exponer en frontend)

## Paso 6: Configurar Variables de Entorno

Crea/actualiza `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Paso 7: Generar Tipos TypeScript (Opcional pero Recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Generar tipos
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

O usa el generador online en el dashboard de Supabase.

## Paso 8: Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

## Paso 9: Probar Conexión

Crea un archivo de prueba:

```typescript
// test-supabase.ts
import { supabase } from '@/lib/supabase/client';

async function testConnection() {
  const { data, error } = await supabase
    .from('properties')
    .select('count');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Conexión exitosa!');
  }
}

testConnection();
```

## Migración de Datos desde localStorage

Ver `docs/migrate-to-supabase.md` para script de migración.

## Troubleshooting

### Error: "relation does not exist"
- Verifica que las tablas se crearon correctamente
- Revisa el esquema en el SQL Editor

### Error: "permission denied"
- Verifica las políticas RLS
- Asegúrate de estar autenticado si las políticas lo requieren

### Realtime no funciona
- Verifica que Realtime está habilitado en Database > Replication
- Verifica que el canal está suscrito correctamente

### Tipos TypeScript no coinciden
- Regenera los tipos desde Supabase
- Verifica que el esquema de la DB coincide con los tipos

