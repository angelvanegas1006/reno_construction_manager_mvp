# Configuración de Views de Airtable

## Overview

La sincronización desde Airtable usa diferentes **views** para filtrar propiedades según su fase en el proceso de renovación. Cada view debe estar configurada en Airtable con los filtros apropiados para mostrar solo las propiedades que deben estar en esa fase específica.

## Views Configuradas

### 1. Upcoming Settlements
- **View ID**: `viwpYQ0hsSSdFrSD1`
- **Fase en Supabase**: `upcoming-settlements`
- **Descripción**: Propiedades que están próximas a ser escrituradas y necesitan preparación inicial
- **Filtros en Airtable**:
  - `Stage == Presettlement & Settled`
  - `Set Up status = Pending to visit`
  - `Type = Unit & Building`
  - `Test Flag != Test`
  - `Country = Spain`
  - `Unique ID != Empty`
  - `Hubspot ID != Empty`
  - `Property Unique ID != Empty`
  - `Real settlement date is before one week from now`
  - `Already Tenanted != Yes`

## Configuración Actual

Actualmente, la sincronización está configurada para usar la view `viwpYQ0hsSSdFrSD1` que corresponde a propiedades en fase "upcoming-settlements".

### Variables de Entorno

```bash
NEXT_PUBLIC_AIRTABLE_TABLE_ID=tblmX19OTsj3cTHmA
NEXT_PUBLIC_AIRTABLE_VIEW_ID=viwpYQ0hsSSdFrSD1
```

## Próximos Pasos

Para agregar sincronización de otras fases, necesitarás:

1. Crear nuevas views en Airtable con los filtros apropiados para cada fase
2. Configurar variables de entorno adicionales o modificar el código para soportar múltiples views
3. Ejecutar sincronizaciones separadas para cada fase

## Notas

- La sincronización actualiza todas las propiedades que coinciden con los IDs de Airtable, sin importar su fase actual en Supabase
- Si una propiedad ya existe en Supabase pero está en una fase diferente, se actualizará con los datos de Airtable
- Las propiedades que ya no cumplen los filtros de la view permanecen en Supabase en su fase actual (no se eliminan automáticamente)









