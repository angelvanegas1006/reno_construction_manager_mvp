# 🧪 Guía: Probar Actividades de Categorías en Local

## 🚀 Inicio Rápido

### 1. Iniciar el servidor local

```bash
cd /Users/angelvanegas/Desktop/new\ project/vistral-mvp
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

### 2. Acceder a la propiedad de prueba

La propiedad que tiene múltiples presupuestos es:
- **ID**: `SP-KMX-CYX-001422`
- **URL Local**: `http://localhost:3000/reno/construction-manager/property/SP-KMX-CYX-001422`

## 📋 Qué Probar

### ✅ Funcionalidad de Múltiples Presupuestos

1. **Visualización de PDFs colapsables**
   - Deberías ver secciones colapsables: "Presupuesto 1", "Presupuesto 2", etc.
   - Cada sección muestra un PDF diferente
   - Las secciones están colapsadas por defecto si hay más de un presupuesto

2. **Extracción automática de categorías**
   - Al cargar la página, debería procesar automáticamente ambos presupuestos
   - Las categorías deberían aparecer agrupadas por presupuesto
   - Cada categoría debe tener un `budget_index` que identifica de qué presupuesto viene

3. **Agrupación de categorías**
   - Las categorías con el mismo nombre pero de diferentes presupuestos se muestran juntas
   - Cada una está etiquetada con su origen (Presupuesto 1, Presupuesto 2, etc.)

### ✅ Actividades de Categorías

1. **Ver actividades**
   - Cada categoría muestra su `activities_text` si está disponible
   - Las actividades se muestran en la sección de progreso de cada categoría

2. **Editar porcentaje**
   - Puedes cambiar el porcentaje de progreso de cada categoría
   - Los cambios se guardan automáticamente

3. **Guardar progreso**
   - Usa el botón "Guardar Progreso" para persistir todos los cambios
   - Verifica que se actualicen en la base de datos

## 🔍 Verificar en la Base de Datos

### Ver categorías de la propiedad

```bash
# Usar el script de verificación
npx tsx scripts/check-property-details.ts SP-KMX-CYX-001422
```

### Verificar budget_index

```bash
# Verificar que las categorías tengan budget_index correcto
npx tsx scripts/update-budget-index-for-property.ts SP-KMX-CYX-001422
```

## 🐛 Debugging

### Ver logs en consola del navegador

1. Abre las DevTools (F12 o Cmd+Option+I)
2. Ve a la pestaña "Console"
3. Busca logs que empiecen con:
   - `[useDynamicCategories]`
   - `[N8N Webhook]`
   - `[MultiBudgetViewer]`

### Verificar estado de las categorías

En la consola del navegador, puedes ejecutar:

```javascript
// Ver categorías cargadas (si estás en la página de la propiedad)
// Las categorías están disponibles en el componente DynamicCategoriesProgress
```

## 📊 Estructura Esperada

### Categorías con múltiples presupuestos

```
Fontanería (Presupuesto 1)
  - activities_text: "Instalación de tuberías..."
  - budget_index: 1
  - percentage: 0

Fontanería (Presupuesto 2)
  - activities_text: "Reparación de grifos..."
  - budget_index: 2
  - percentage: 0

Electricidad (Presupuesto 1)
  - activities_text: "Instalación eléctrica..."
  - budget_index: 1
  - percentage: 0
```

## ⚠️ Problemas Comunes

### No se muestran los PDFs

1. Verifica que `budget_pdf_url` tenga URLs válidas separadas por comas
2. Verifica la consola del navegador para errores de CORS o carga
3. Verifica que los PDFs sean accesibles públicamente

### Las categorías no se agrupan correctamente

1. Verifica que `budget_index` esté asignado correctamente
2. Ejecuta el script de actualización: `npx tsx scripts/update-budget-index-for-property.ts SP-KMX-CYX-001422`
3. Recarga la página

### No se procesan automáticamente los presupuestos

1. Verifica que el webhook de n8n esté funcionando
2. Verifica los logs en la consola del navegador
3. Verifica que `budget_pdf_url` tenga múltiples URLs separadas por comas

## 🔗 URLs Útiles

- **Local**: `http://localhost:3000/reno/construction-manager/property/SP-KMX-CYX-001422`
- **API Update Budget Index**: `http://localhost:3000/api/update-budget-index`

## 📝 Notas

- La propiedad `SP-KMX-CYX-001422` es la única que tiene múltiples presupuestos actualmente
- Los cambios se guardan automáticamente cuando usas "Guardar Progreso"
- El `budget_index` se asigna automáticamente basándose en el orden de creación de las categorías
