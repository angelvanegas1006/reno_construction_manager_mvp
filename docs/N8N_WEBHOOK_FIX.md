# 🔧 Fix: Error "Could not find the 'categories' column"

## ❌ Error

```
400 - "{\"code\":\"PGRST204\",\"details\":null,\"hint\":null,\"message\":\"Could not find the 'categories' column of 'property_dynamic_categories' in the schema cache\"}"
```

## 🔍 Causa

El workflow de n8n está intentando insertar datos con un campo llamado `categories` que **NO existe** en la tabla `property_dynamic_categories`.

**Problema específico**: n8n está recibiendo datos con esta estructura:
```json
{
  "unique_id": "SP-SRF-ZHJ-001024",
  "categories": [
    { "category_name": "...", "activities_text": "..." }
  ]
}
```

Y está intentando insertar este objeto completo en Supabase, pero Supabase necesita:
- Un **array** de categorías (no un objeto con `categories`)
- Cada categoría debe tener `property_id` (no `unique_id`)
- NO debe incluir el campo `categories` como wrapper

## ✅ Solución

### Campos Correctos de la Tabla

La tabla `property_dynamic_categories` tiene estos campos:

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `property_id` | TEXT | ✅ Sí |
| `category_name` | TEXT | ✅ Sí |
| `activities_text` | TEXT | ❌ No |
| `percentage` | INTEGER | ❌ No |

**⚠️ IMPORTANTE**: NO existe un campo llamado `categories`. Usa `category_name` en su lugar.

### Ejemplo Correcto de Body JSON

```json
{
  "property_id": "SP-SRF-ZHJ-001024",
  "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
  "activities_text": "8.1 — UD — SUSTITUCIÓN DE CERRADURA DE BUZÓN: Retirada de cerradura existente.",
  "percentage": null
}
```

### Ejemplo Incorrecto (causa el error)

```json
{
  "property_id": "SP-SRF-ZHJ-001024",
  "categories": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",  // ❌ Campo incorrecto
  "activities_text": "...",
  "percentage": null
}
```

## 🔧 Pasos para Corregir en n8n

### Solución Rápida: Agregar Nodo Code para Transformar

1. **Abre tu workflow en n8n**
2. **Encuentra el nodo que procesa las categorías** (antes del HTTP Request)
3. **Agrega un nodo Code** entre el procesamiento y el HTTP Request
4. **Copia este código en el nodo Code**:

```javascript
// Obtener los datos del webhook
const inputData = $input.item.json;

// Extraer unique_id (puede venir como unique_id o property_id)
const propertyId = inputData.unique_id || inputData.property_id;

if (!propertyId) {
  throw new Error('No se encontró unique_id o property_id en los datos');
}

// Extraer el array de categorías
const categories = inputData.categories || [];

if (!Array.isArray(categories) || categories.length === 0) {
  throw new Error('No se encontró el array de categorías o está vacío');
}

// Transformar cada categoría agregando property_id
const transformedCategories = categories.map((category) => {
  if (!category.category_name) {
    return null; // Omitir categorías sin nombre
  }

  return {
    property_id: propertyId,
    category_name: category.category_name.trim(),
    activities_text: category.activities_text ? category.activities_text.trim() : null,
    percentage: null
  };
}).filter(cat => cat !== null);

if (transformedCategories.length === 0) {
  throw new Error('No hay categorías válidas para insertar');
}

// Retornar el array transformado
return transformedCategories.map(cat => ({ json: cat }));
```

5. **Configura el nodo HTTP Request** después del Code:
   - **Body**: `{{ $json }}` (directamente, sin array wrapper)
   - **Headers**: Como se muestra en la documentación

### Campos Correctos

Asegúrate de usar estos campos en el body del HTTP Request:
   - ✅ `property_id` (no `propertyId` o `unique_id`)
   - ✅ `category_name` (no `categories` o `category`)
   - ✅ `activities_text` (opcional)
   - ✅ `percentage` (opcional, debe ser número 0-100 o null)

### Ejemplo de Configuración Correcta en n8n

Si estás procesando múltiples categorías desde el PDF, el body debería ser un **array**:

```json
[
  {
    "property_id": "{{ $json.property_id }}",
    "category_name": "{{ $json.category_name }}",
    "activities_text": "{{ $json.activities_text }}",
    "percentage": null
  },
  {
    "property_id": "{{ $json.property_id }}",
    "category_name": "{{ $json.category_name_2 }}",
    "activities_text": "{{ $json.activities_text_2 }}",
    "percentage": null
  }
]
```

O si estás usando un loop para procesar cada categoría:

```json
{
  "property_id": "{{ $json.property_id }}",
  "category_name": "{{ $json.current_category.name }}",
  "activities_text": "{{ $json.current_category.activities }}",
  "percentage": null
}
```

## 📋 Checklist de Verificación

- [ ] El campo se llama `category_name` (no `categories`)
- [ ] El campo se llama `property_id` (no `propertyId`)
- [ ] El campo se llama `activities_text` (no `activities` o `activity_text`)
- [ ] El campo `percentage` es un número entre 0-100 o `null`
- [ ] Los headers incluyen `apikey` y `Authorization` con el Service Role Key
- [ ] El Content-Type es `application/json`
- [ ] La URL es correcta: `https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories`

## 🧪 Prueba con cURL

Puedes probar la inserción correcta con este comando:

```bash
curl -X POST \
  'https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories' \
  -H 'apikey: TU_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "property_id": "SP-SRF-ZHJ-001024",
    "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
    "activities_text": "Prueba de inserción",
    "percentage": null
  }'
```

Si funciona correctamente, deberías recibir un array con el objeto insertado.

## 📚 Referencia Completa

Ver `docs/N8N_INSERT_CATEGORIES.md` para la documentación completa de cómo insertar categorías desde n8n.

