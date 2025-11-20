# Migración de Checklist a Supabase

## Cambios necesarios en Supabase

### 1. Actualizar enum de condición en `inspection_elements`

```sql
-- Eliminar el constraint actual si existe
ALTER TABLE inspection_elements 
DROP CONSTRAINT IF EXISTS inspection_elements_condition_check;

-- Crear nuevo enum con 4 estados
CREATE TYPE inspection_condition AS ENUM (
  'buen_estado',
  'necesita_reparacion',
  'necesita_reemplazo',
  'no_aplica'
);

-- Actualizar la columna condition
ALTER TABLE inspection_elements 
ALTER COLUMN condition TYPE inspection_condition 
USING CASE 
  WHEN condition = 'Buen estado' THEN 'buen_estado'::inspection_condition
  WHEN condition = 'Mal estado' THEN 'necesita_reparacion'::inspection_condition
  WHEN condition = 'No aplica' THEN 'no_aplica'::inspection_condition
  ELSE 'buen_estado'::inspection_condition
END;
```

### 2. Agregar campo `inspection_type` a `property_inspections`

```sql
-- Agregar columna para distinguir initial vs final
ALTER TABLE property_inspections 
ADD COLUMN inspection_type TEXT CHECK (inspection_type IN ('initial', 'final'));

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_property_inspections_type ON property_inspections(property_id, inspection_type);
```

### 3. Actualizar enum de `zone_type` en `inspection_zones`

```sql
-- Agregar nueva zona 'entorno'
ALTER TABLE inspection_zones 
DROP CONSTRAINT IF EXISTS inspection_zones_zone_type_check;

-- Crear nuevo enum con todas las zonas
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

-- Actualizar la columna zone_type
ALTER TABLE inspection_zones 
ALTER COLUMN zone_type TYPE inspection_zone_type 
USING zone_type::inspection_zone_type;
```

### 4. Agregar campo para videos en `inspection_elements`

```sql
-- Agregar columna para URLs de videos
ALTER TABLE inspection_elements 
ADD COLUMN video_urls TEXT[] DEFAULT '{}';
```

## Mapeo de Secciones a Zonas

| Sección del Checklist | Zone Type | Zone Name |
|----------------------|-----------|-----------|
| entorno-zonas-comunes | `entorno` | "Entorno y Zonas Comunes" |
| estado-general | `distribucion` | "Estado General" |
| entrada-pasillos | `entrada` | "Entrada y Pasillos" |
| habitaciones | `dormitorio` | "Habitación 1", "Habitación 2", etc. |
| salon | `salon` | "Salón" |
| banos | `bano` | "Baño 1", "Baño 2", etc. |
| cocina | `cocina` | "Cocina" |
| exteriores | `exterior` | "Exteriores" |

## Estructura de Datos

### Questions → inspection_elements
- `question.id` → `element_name`
- `question.status` → `condition` (enum)
- `question.notes` → `notes`
- `question.photos` → `image_urls` (URLs de Supabase Storage)
- `question.badElements` → `metadata.badElements` (JSON array)

### Upload Zones → inspection_elements
- Cada upload zone se guarda como un elemento con `element_name: "fotos-{zoneId}"`
- `uploadZone.photos` → `image_urls`
- `uploadZone.videos` → `video_urls`

### Items con cantidad → inspection_elements múltiples
- Si `cantidad = 1`: Un solo elemento con `quantity: 1`
- Si `cantidad > 1`: Un elemento por unidad con `element_name: "{itemId}-{index}"`

### Mobiliario → inspection_elements
- `element_name: "mobiliario"`
- `exists: boolean` (del mobiliario)
- Si `existeMobiliario = true`, crear elemento adicional con `element_name: "mobiliario-detalle"`

