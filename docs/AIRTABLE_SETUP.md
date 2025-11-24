# Configuración de Airtable - Guía Rápida

## ✅ Configuración Completa

Tu configuración de Airtable está completa:

- ✅ **API Key**: Configurado
- ✅ **Base ID**: `appT59F8wolMDKZeG`
- ✅ **Table Name**: `Properties`
- ✅ **Table ID**: `tblmX19OTsj3cTHmA` (para referencia)
- ✅ **View ID**: `viwpYQ0hsSSdFrSD1` (para referencia)

## 🔒 Seguridad

✅ Tu `.env.local` está protegido por `.gitignore` - **NO se subirá a Git**

⚠️ **IMPORTANTE**: Nunca compartas tus credenciales públicamente.

## 🧪 Probar la Configuración

Puedes probar la conexión con Airtable:

```typescript
// En cualquier componente o página
import { findRecordByPropertyId } from '@/lib/airtable/client';

// Probar buscar un registro
const recordId = await findRecordByPropertyId('Properties', 'tu-property-id');
console.log('Record ID:', recordId);
```

## 🚀 Usar la Sincronización

### Cambio de Fase en Kanban

```typescript
import { syncPhaseToAirtable } from '@/lib/airtable/phase-sync';

// Cuando cambies una fase en el Kanban
await syncPhaseToAirtable(propertyId, 'initial-check');
```

### Actualizar Registro Directamente

```typescript
import { updateAirtableWithRetry, findRecordByPropertyId } from '@/lib/airtable/client';

const recordId = await findRecordByPropertyId('Properties', 'property-id');
if (recordId) {
  await updateAirtableWithRetry('Properties', recordId, {
    'Set Up Status': 'Initial Check',
    'Last Update': new Date().toISOString(),
  });
}
```

## 📝 Variables de Entorno Configuradas

```env
# Airtable Configuration
NEXT_PUBLIC_AIRTABLE_API_KEY=patgm06CFi5OvzcwG.609e8bc3ffd4e8c4e007cc24ab09be229595d344d189c901609dca99d4341d54
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties

# Airtable Table and View IDs (opcional, para referencia)
AIRTABLE_TABLE_ID=tblmX19OTsj3cTHmA
AIRTABLE_VIEW_ID=viwpYQ0hsSSdFrSD1
```

## 📚 Documentación Completa

Ver `docs/AIRTABLE_INTEGRATION.md` para más detalles sobre:
- Casos de uso
- Arquitectura
- Ejemplos de código completos
- Manejo de errores y rate limits

## 🔄 Próximos Pasos

1. **Integrar en el código**: Agregar sincronización cuando se muevan propiedades en el Kanban
2. **Probar**: Hacer un cambio de fase y verificar que se actualice en Airtable
3. **Monitorear**: Revisar logs para asegurar que las actualizaciones funcionan correctamente
