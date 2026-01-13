# 🔄 Guía: Transformar Datos de n8n para Insertar en Supabase

## 📋 Problema

n8n recibe datos en este formato:
```json
{
  "unique_id": "SP-SRF-ZHJ-001024",
  "categories": [
    {
      "category_name": "1 FONTANERÍA",
      "activities_text": "..."
    },
    {
      "category_name": "2 ELECTRICIDAD",
      "activities_text": "..."
    }
  ]
}
```

Pero Supabase necesita un array de objetos con `property_id` (no `unique_id`):
```json
[
  {
    "property_id": "SP-SRF-ZHJ-001024",
    "category_name": "1 FONTANERÍA",
    "activities_text": "...",
    "percentage": null
  },
  {
    "property_id": "SP-SRF-ZHJ-001024",
    "category_name": "2 ELECTRICIDAD",
    "activities_text": "...",
    "percentage": null
  }
]
```

## ✅ Solución: Transformar en n8n

### Opción 1: Usar un Nodo Code/Function (Recomendado)

Agrega un nodo **Code** o **Function** antes del nodo HTTP Request que inserta en Supabase:

#### Código JavaScript para el Nodo Code:

```javascript
// Obtener los datos del webhook
const inputData = $input.item.json;

// Extraer unique_id y categories
const uniqueId = inputData.unique_id || inputData.property_id;
const categories = inputData.categories || [];

// Transformar el array de categorías
const transformedCategories = categories.map(category => ({
  property_id: uniqueId,  // Usar unique_id como property_id
  category_name: category.category_name,
  activities_text: category.activities_text || null,
  percentage: null  // Inicialmente null, se actualizará después
}));

// Retornar el array transformado
return transformedCategories.map(cat => ({ json: cat }));
```

**Configuración del nodo Code:**
- **Mode**: Run Once for All Items
- **Code**: El código de arriba

### Opción 2: Usar un Nodo Set + Split In Batches

1. **Nodo Set** - Transformar los datos:
   - Agrega un campo `property_id` con valor `{{ $json.unique_id }}`
   - Mantén el campo `categories`

2. **Nodo Split In Batches** - Dividir el array:
   - **Batch Size**: 1
   - Esto creará un item por cada categoría

3. **Nodo Set** - Preparar cada categoría:
   - `property_id`: `{{ $json.property_id }}`
   - `category_name`: `{{ $json.categories[0].category_name }}`
   - `activities_text`: `{{ $json.categories[0].activities_text }}`
   - `percentage`: `null`

4. **Nodo HTTP Request** - Insertar en Supabase:
   - **Body**: 
   ```json
   {
     "property_id": "{{ $json.property_id }}",
     "category_name": "{{ $json.category_name }}",
     "activities_text": "{{ $json.activities_text }}",
     "percentage": null
   }
   ```

### Opción 3: Usar un Nodo Loop (Más Complejo)

1. **Nodo Set** - Preparar datos base:
   - `property_id`: `{{ $json.unique_id }}`
   - `categories_array`: `{{ $json.categories }}`

2. **Nodo Loop Over Items** - Iterar sobre categorías:
   - Para cada categoría, crear un objeto con `property_id`, `category_name`, `activities_text`, `percentage`

3. **Nodo HTTP Request** - Insertar cada categoría individualmente

## 🎯 Solución Recomendada: Nodo Code

La **Opción 1** es la más simple y eficiente. Aquí está el flujo completo:

### Flujo Completo en n8n:

```
1. Webhook (Trigger)
   ↓ Recibe: { unique_id, categories: [...] }
   
2. Code Node (Transformar)
   ↓ Transforma a: [{ property_id, category_name, activities_text, percentage }, ...]
   
3. HTTP Request (Insertar en Supabase)
   ↓ URL: https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories
   ↓ Method: POST
   ↓ Body: {{ $json }} (el array completo transformado)
   ↓ Headers: apikey, Authorization, Content-Type, Prefer
```

### Código Completo para el Nodo Code:

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
const transformedCategories = categories.map((category, index) => {
  // Validar que la categoría tenga category_name
  if (!category.category_name) {
    console.warn(`Categoría en índice ${index} no tiene category_name, se omitirá`);
    return null;
  }

  return {
    property_id: propertyId,
    category_name: category.category_name.trim(),
    activities_text: category.activities_text ? category.activities_text.trim() : null,
    percentage: null  // Inicialmente null, se actualizará después
  };
}).filter(cat => cat !== null); // Filtrar categorías inválidas

if (transformedCategories.length === 0) {
  throw new Error('No hay categorías válidas para insertar');
}

// Retornar el array transformado
// n8n espera un array de objetos con { json: ... }
return transformedCategories.map(cat => ({ json: cat }));
```

### Configuración del Nodo HTTP Request Después del Code:

**URL:**
```
https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories
```

**Method:**
```
POST
```

**Headers:**
```
apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Content-Type: application/json
Prefer: return=representation
```

**Body (JSON):**
```json
{{ $json }}
```

**⚠️ IMPORTANTE**: El body debe ser `{{ $json }}` directamente, NO `[{{ $json }}]` porque el nodo Code ya retorna un array.

## 🧪 Ejemplo de Transformación

### Input (lo que recibe n8n):
```json
{
  "unique_id": "SP-SRF-ZHJ-001024",
  "categories": [
    {
      "category_name": "1 FONTANERÍA",
      "activities_text": "1.1 Adecuación de llaves..."
    },
    {
      "category_name": "2 ELECTRICIDAD",
      "activities_text": "2.1 Base de TV/R-SAT..."
    }
  ]
}
```

### Output (lo que se envía a Supabase):
```json
[
  {
    "property_id": "SP-SRF-ZHJ-001024",
    "category_name": "1 FONTANERÍA",
    "activities_text": "1.1 Adecuación de llaves...",
    "percentage": null
  },
  {
    "property_id": "SP-SRF-ZHJ-001024",
    "category_name": "2 ELECTRICIDAD",
    "activities_text": "2.1 Base de TV/R-SAT...",
    "percentage": null
  }
]
```

## ✅ Verificación

Después de configurar el workflow, prueba con una propiedad y verifica:

1. **Que las categorías se inserten correctamente**:
   ```sql
   SELECT * FROM property_dynamic_categories 
   WHERE property_id = 'SP-SRF-ZHJ-001024'
   ORDER BY category_name;
   ```

2. **Que no haya errores en los logs de n8n**

3. **Que las categorías aparezcan en la UI** de la aplicación

## 🔍 Troubleshooting

### Error: "null value in column 'property_id' violates not-null constraint"
- **Causa**: El código no está extrayendo correctamente `unique_id`
- **Solución**: Verifica que el campo se llame `unique_id` en el JSON de entrada

### Error: "null value in column 'category_name' violates not-null constraint"
- **Causa**: Alguna categoría no tiene `category_name`
- **Solución**: El código ya filtra categorías inválidas, pero verifica que todas tengan `category_name`

### Error: "Could not find the 'categories' column"
- **Causa**: Estás intentando insertar el objeto completo con `categories` como campo
- **Solución**: Asegúrate de usar el nodo Code para transformar los datos antes de insertar

