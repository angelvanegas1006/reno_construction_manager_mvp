# 📤 Guía: Insertar Categorías Dinámicas desde n8n a Supabase

Esta guía explica cómo configurar un nodo HTTP Request en n8n para insertar categorías dinámicas en la tabla `property_dynamic_categories` de Supabase.

## 📋 Estructura de la Tabla

La tabla `property_dynamic_categories` tiene los siguientes campos:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | ❌ No | Se genera automáticamente |
| `property_id` | TEXT | ✅ Sí | ID de la propiedad (ej: "SP-Q4X-HPS-003953") |
| `category_name` | TEXT | ✅ Sí | Nombre de la categoría (ej: "Fontanería", "Electricidad") |
| `activities_text` | TEXT | ❌ No | Texto descriptivo de las actividades |
| `percentage` | INTEGER | ❌ No | Porcentaje de progreso (0-100) |
| `created_at` | TIMESTAMP | ❌ No | Se genera automáticamente |
| `updated_at` | TIMESTAMP | ❌ No | Se genera automáticamente |

## 🔧 Configuración del Nodo HTTP Request en n8n

### 1. Método y URL

- **Método**: `POST`
- **URL**: 
  ```
  https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories
  ```
  > ⚠️ **Nota**: Esta es la URL para el proyecto de **DEV**. Para producción, usa la URL correspondiente.

### 2. Headers (Autenticación)

Configura estos headers en el nodo HTTP Request:

| Header | Valor |
|--------|-------|
| `apikey` | `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}` |
| `Authorization` | `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

> 💡 **Tip**: Usa variables de entorno en n8n para almacenar el `SUPABASE_SERVICE_ROLE_KEY` de forma segura.

### 3. Body (JSON)

El body debe ser un objeto JSON o un array de objetos JSON para insertar múltiples categorías.

#### Ejemplo: Insertar una sola categoría

```json
{
  "property_id": "SP-Q4X-HPS-003953",
  "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
  "activities_text": "8.1 — UD — SUSTITUCIÓN DE CERRADURA DE BUZÓN: Retirada de cerradura existente. Suministro y montaje de cerradura universal compatible (clip + leva ajustable), con dos llaves incluidas.",
  "percentage": null
}
```

#### Ejemplo: Insertar múltiples categorías (array)

```json
[
  {
    "property_id": "SP-Q4X-HPS-003953",
    "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
    "activities_text": "8.1 — UD — SUSTITUCIÓN DE CERRADURA DE BUZÓN: Retirada de cerradura existente.",
    "percentage": null
  },
  {
    "property_id": "SP-Q4X-HPS-003953",
    "category_name": "2 INSTALACIÓN DE FONTANERÍA",
    "activities_text": "Instalación completa de fontanería según presupuesto.",
    "percentage": null
  },
  {
    "property_id": "SP-Q4X-HPS-003953",
    "category_name": "3 INSTALACIÓN ELÉCTRICA",
    "activities_text": "Instalación eléctrica completa.",
    "percentage": null
  }
]
```

## 📝 Ejemplo Completo en n8n

### Configuración del Nodo HTTP Request

```javascript
// URL
https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories

// Method
POST

// Headers
{
  "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}

// Body (JSON)
{
  "property_id": "{{ $json.property_id }}",
  "category_name": "{{ $json.category_name }}",
  "activities_text": "{{ $json.activities_text }}",
  "percentage": null
}
```

### Ejemplo con Datos Dinámicos desde el Webhook

Si recibes datos del webhook anterior, puedes mapearlos así:

```json
{
  "property_id": "{{ $json.body.property_id }}",
  "category_name": "{{ $json.category_name }}",
  "activities_text": "{{ $json.activities_text }}",
  "percentage": null
}
```

## 🔄 Flujo Completo en n8n

### 1. Nodo Webhook (Entrada)
- Recibe: `property_id`, `budget_pdf_url`, etc.

### 2. Nodo Code/Function (Procesar PDF)
- Extrae categorías del PDF con OCR
- Genera array de categorías

### 3. Nodo Split In Batches (Opcional)
- Si tienes muchas categorías, divide en lotes

### 4. Nodo HTTP Request (Insertar en Supabase)
- **URL**: `https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories`
- **Method**: `POST`
- **Headers**: Como se muestra arriba
- **Body**: Array de categorías o categoría individual

### 5. Nodo IF (Verificar éxito)
- Verifica si la inserción fue exitosa

## ✅ Validaciones y Errores Comunes

### 1. Error: "new row violates foreign key constraint"

**Causa**: El `property_id` no existe en la tabla `properties`.

**Solución**: Verifica que el `property_id` sea correcto y exista en Supabase.

```sql
-- Verificar si existe la propiedad
SELECT id FROM properties WHERE id = 'SP-Q4X-HPS-003953';
```

### 2. Error: "null value in column 'property_id' violates not-null constraint"

**Causa**: El campo `property_id` es requerido pero no se está enviando.

**Solución**: Asegúrate de incluir `property_id` en el body.

### 3. Error: "null value in column 'category_name' violates not-null constraint"

**Causa**: El campo `category_name` es requerido pero no se está enviando.

**Solución**: Asegúrate de incluir `category_name` en el body.

### 4. Error: "new row violates check constraint"

**Causa**: El `percentage` está fuera del rango 0-100 o no es un número.

**Solución**: Verifica que `percentage` sea `null` o un número entre 0 y 100.

### 5. Error: 401 Unauthorized

**Causa**: El `SUPABASE_SERVICE_ROLE_KEY` es incorrecto o no se está enviando.

**Solución**: Verifica que el header `Authorization` tenga el formato correcto: `Bearer [KEY]`

## 🧪 Ejemplo de Prueba con cURL

Puedes probar la inserción desde la terminal con cURL:

```bash
curl -X POST \
  'https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories' \
  -H 'apikey: TU_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "property_id": "SP-Q4X-HPS-003953",
    "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
    "activities_text": "8.1 — UD — SUSTITUCIÓN DE CERRADURA DE BUZÓN",
    "percentage": null
  }'
```

## 📊 Respuesta Exitosa

Si la inserción es exitosa, recibirás un array con los datos insertados:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "property_id": "SP-Q4X-HPS-003953",
    "category_name": "1 ACTUACIONES PREVIAS Y DEMOLICIONES",
    "activities_text": "8.1 — UD — SUSTITUCIÓN DE CERRADURA DE BUZÓN",
    "percentage": null,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

## 🔐 Variables de Entorno en n8n

Para mayor seguridad, configura estas variables de entorno en n8n:

1. Ve a **Settings** → **Environment Variables**
2. Agrega:
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu Service Role Key de Supabase
   - `SUPABASE_URL`: `https://kqqobbxjyrdputngvxrf.supabase.co` (para DEV)

Luego úsalas en los headers:
```
{{ $env.SUPABASE_SERVICE_ROLE_KEY }}
```

## 💡 Tips Adicionales

1. **Insertar múltiples categorías**: Envía un array en el body para insertar varias categorías en una sola llamada.

2. **Evitar duplicados**: Antes de insertar, verifica si la categoría ya existe:
   ```sql
   SELECT * FROM property_dynamic_categories 
   WHERE property_id = 'SP-Q4X-HPS-003953' 
   AND category_name = '1 ACTUACIONES PREVIAS Y DEMOLICIONES';
   ```

3. **Manejo de errores**: Usa un nodo **IF** después del HTTP Request para verificar el código de respuesta (200 = éxito).

4. **Logging**: Agrega un nodo **Set** para guardar logs de las inserciones exitosas o fallidas.

## 📚 Referencias

- [Supabase REST API Documentation](https://supabase.com/docs/reference/javascript/insert)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)


