# 📋 Guía: Incluir budget_index en las Categorías Extraídas

## 🎯 Objetivo

Cuando una propiedad tiene múltiples presupuestos (múltiples URLs en `budget_pdf_url` separadas por comas), necesitamos identificar de qué presupuesto viene cada categoría extraída.

## 📊 Campo Nuevo: `budget_index`

Se agregó un nuevo campo `budget_index` a la tabla `property_dynamic_categories`:

- **Tipo**: INTEGER
- **Valor por defecto**: 1
- **Descripción**: Identifica el índice del presupuesto de origen (1, 2, 3, etc.)

## 🔧 Modificación en n8n

### Opción 1: Incluir budget_index en el Payload del Webhook

Modifica el webhook para recibir `budget_index` junto con los otros datos:

```json
{
  "budget_pdf_url": "https://...",
  "property_id": "SP-KMX-CYX-001422",
  "unique_id": "SP-KMX-CYX-001422",
  "budget_index": 1,  // ← NUEVO: índice del presupuesto (1-based)
  ...
}
```

### Opción 2: Agregar budget_index en el Nodo Code de Transformación

En el nodo Code que transforma las categorías antes de insertarlas, agrega `budget_index`:

```javascript
// Obtener los datos del webhook
const inputData = $input.item.json;

// Extraer unique_id (puede venir como unique_id o property_id)
const propertyId = inputData.unique_id || inputData.property_id;

// Extraer budget_index (si viene en el payload, sino usar 1 por defecto)
const budgetIndex = inputData.budget_index || 1;

// Extraer el array de categorías
const categories = inputData.categories || [];

// Transformar cada categoría agregando property_id y budget_index
const transformedCategories = categories.map((category, index) => {
  if (!category.category_name) {
    return null;
  }

  return {
    property_id: propertyId,
    budget_index: budgetIndex,  // ← NUEVO: incluir budget_index
    category_name: category.category_name.trim(),
    activities_text: category.activities_text ? category.activities_text.trim() : null,
    percentage: null
  };
}).filter(cat => cat !== null);

return transformedCategories.map(cat => ({ json: cat }));
```

## 🔄 Flujo Completo con Múltiples Presupuestos

Cuando hay múltiples presupuestos, el frontend llamará al webhook **una vez por cada presupuesto**:

1. **Primera llamada** (Presupuesto 1):
   ```json
   {
     "budget_pdf_url": "https://...presupuesto1.pdf",
     "property_id": "SP-KMX-CYX-001422",
     "budget_index": 1  // ← Primer presupuesto
   }
   ```

2. **Segunda llamada** (Presupuesto 2):
   ```json
   {
     "budget_pdf_url": "https://...presupuesto2.pdf",
     "property_id": "SP-KMX-CYX-001422",
     "budget_index": 2  // ← Segundo presupuesto
   }
   ```

## ✅ Validación

Después de insertar las categorías, verifica que tengan el `budget_index` correcto:

```sql
SELECT 
  category_name,
  budget_index,
  activities_text
FROM property_dynamic_categories
WHERE property_id = 'SP-KMX-CYX-001422'
ORDER BY budget_index, category_name;
```

## 📝 Notas Importantes

1. **Compatibilidad**: Si `budget_index` no se envía, el valor por defecto es `1` (comportamiento retrocompatible).

2. **Misma categoría en múltiples presupuestos**: Si ambos presupuestos tienen "Fontanería", se crearán dos registros:
   - `category_name: "Fontanería"`, `budget_index: 1`
   - `category_name: "Fontanería"`, `budget_index: 2`

3. **Visualización**: El frontend agrupará las categorías por nombre y mostrará de qué presupuesto viene cada una.
