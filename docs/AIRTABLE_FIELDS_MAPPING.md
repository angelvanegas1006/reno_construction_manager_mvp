# 🔍 Mapeo de Campos Airtable → Supabase

## ⚠️ Campos que NO están disponibles directamente

Los siguientes campos **no están disponibles** en la tabla/view actual y pueden estar en **tablas relacionadas**:

1. **Area Cluster** (`fldaq2wRKI6iE8iNG`) - Puede estar en tabla "Properties"
2. **Hubspot ID** (`fldyLpNiyReS3Flbv`) - Puede estar en tabla "Engagements"  
3. **Property Unique ID** (`fldMZeyKHO9e6BXBm`) - Puede estar en tabla "Properties"
4. **Responsible Owner** (`fldJlCXcuNyeMFzJa`) - Puede estar en tabla "Properties"
5. **Technical Constructor** (`fldtTmer8awVKDx7Y`) - Puede estar en tabla "Properties"

## ✅ Campos que SÍ están disponibles

Estos campos están disponibles directamente en la tabla:

- ✅ **Address** (`fldQC2Q9I8Q6UeAGC`) - Disponible como "Address"
- ✅ **Type** (`fldBsl5r1YBWDa6Bw`) - Disponible como "Type"
- ✅ **Required Reno** (`fldsiR2hTtrg2uJOl`) - Disponible como "Required reno"
- ✅ **SetUp Team Notes** (`fldPJAWIuIZsS0zw7`) - Disponible como "Set up team notes"
- ✅ **Set up status** (`fldE95fZPdw45XV2J`) - Disponible como "Set up status"
- ✅ **Keys Location** (`fldBefLUpUfCnNUa4`) - Disponible como "Keys Location"
- ✅ **Stage** (`fldupA1DFRu0ECxT3`) - Disponible como "Stage"
- ✅ **Client email** (`fldFT5s4kildAqaGA`) - Disponible como "Client email"
- ✅ **Unique ID (From Engagements)** (`fldrpCWcjaKEDCy4g`) - Disponible como "UNIQUEID (from Engagements)"

## 🔧 Solución

Para obtener los campos de tablas relacionadas, necesitas:

### Opción 1: Incluir campos relacionados en la View de Airtable

1. Ve a Airtable → Tu tabla → View `viwpYQ0hsSSdFrSD1`
2. Agrega columnas de las tablas relacionadas:
   - De tabla "Properties": Area Cluster, Property Unique ID, Responsible Owner, Technical Constructor
   - De tabla "Engagements": Hubspot ID
3. Guarda la view

### Opción 2: Hacer queries adicionales a las tablas relacionadas

Modificar el código para hacer queries adicionales cuando encuentre links a tablas relacionadas.

## 📝 Campos Actualmente Mapeados

```typescript
{
  id: uniqueId, // ✅
  address: address, // ✅
  type: 'Type', // ✅
  renovation_type: 'Required reno', // ✅
  notes: 'Set up team notes', // ✅
  'Set Up Status': 'Set up status', // ✅
  keys_location: 'Keys Location', // ✅
  stage: 'Stage', // ✅
  'Client email': 'Client email', // ✅
  'Unique ID From Engagements': uniqueId, // ✅
  
  // ❌ Estos campos necesitan estar en la view o hacer queries adicionales:
  area_cluster: null, // Necesita estar en view o query a Properties
  'Hubspot ID': null, // Necesita estar en view o query a Engagements
  property_unique_id: null, // Necesita estar en view o query a Properties
  responsible_owner: null, // Necesita estar en view o query a Properties
  'Technical construction': null, // Necesita estar en view o query a Properties
}
```

## 🎯 Recomendación

**La forma más fácil es agregar estos campos a la view de Airtable** para que estén disponibles directamente sin necesidad de queries adicionales.









