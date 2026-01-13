# 🔄 Llamada Automática al Webhook de n8n

## 📋 Resumen

Cuando ejecutas la sincronización de "Reno In Progress" desde Airtable, el sistema **automáticamente** llama al webhook de n8n para todas las propiedades que cumplen los criterios.

## ✅ Criterios para Llamar al Webhook

El webhook se llama automáticamente para propiedades que:

1. ✅ Están en fase `reno-in-progress`
2. ✅ Tienen `budget_pdf_url` lleno (no es `null`)
3. ✅ **NO** tienen categorías dinámicas en la tabla `property_dynamic_categories`

## 🔄 Cómo Funciona

### 1. Ejecutar Sincronización

```bash
npm run sync:reno-in-progress
```

### 2. Proceso Automático

El script hace lo siguiente:

1. **Sincroniza propiedades** desde Airtable (view: `viwQUOrLzUrScuU4k`)
2. **Actualiza `reno_phase`** a `'reno-in-progress'` para todas las propiedades sincronizadas
3. **Busca propiedades elegibles**:
   - En `reno-in-progress`
   - Con `budget_pdf_url` lleno
   - Sin categorías dinámicas
4. **Llama al webhook** para cada propiedad elegible

### 3. Logs del Proceso

Verás logs como estos:

```
[Reno In Progress Sync] Checking properties eligible for webhook call...
[Reno In Progress Sync] Found 5 properties with budget_pdf_url
[Reno In Progress Sync] ⏭️  Skipping property SP-XXX - already has categories
[Reno In Progress Sync] ✅ Webhook called for property SP-YYY
[Reno In Progress Sync] Webhook summary: 3 called, 2 skipped
```

## 📊 Ejemplo de Ejecución

```bash
$ npm run sync:reno-in-progress

🔄 Iniciando sincronización de Reno In Progress desde Airtable...

[Reno In Progress Sync] Starting sync for Reno In Progress phase...
[Reno In Progress Sync] Using view: viwQUOrLzUrScuU4k
...
[Reno In Progress Sync] ✅ Successfully set reno_phase to 'reno-in-progress' for 43 properties
[Reno In Progress Sync] Checking properties eligible for webhook call...
[Reno In Progress Sync] Found 3 properties with budget_pdf_url
[Reno In Progress Sync] ⏭️  Skipping property SP-ABC - already has categories
[Reno In Progress Sync] ✅ Webhook called for property SP-Q4X-HPS-003953
[Reno In Progress Sync] ✅ Webhook called for property SP-TJ1-7IL-004165
[Reno In Progress Sync] Webhook summary: 2 called, 1 skipped

✅ Sincronización completada!
```

## 🔍 Verificación Manual

Si quieres verificar qué propiedades son elegibles sin ejecutar la sincronización completa:

```bash
npm run check:budget-properties
```

Este script muestra:
- Propiedades en `reno-in-progress` con `budget_pdf_url`
- Si tienen categorías o no

## 🛡️ Prevención de Duplicados

El sistema **evita llamadas duplicadas** verificando:

1. Si la propiedad **ya tiene categorías** → No llama al webhook
2. Si la propiedad **no tiene `budget_pdf_url`** → No llama al webhook
3. Si la propiedad **no está en `reno-in-progress`** → No llama al webhook

## 📝 Payload del Webhook

El webhook recibe este payload para cada propiedad:

```json
{
  "budget_pdf_url": "https://api.portfolio.prod.prophero.com/assets/users/docs?key=...",
  "property_id": "SP-Q4X-HPS-003953",
  "unique_id": "SP-Q4X-HPS-003953",
  "property_name": "Plaza del General Dolz 20, 2 B2, Alzira",
  "address": "Plaza del General Dolz 20, 2 B2, Alzira",
  "client_name": "Nombre del Cliente",
  "client_email": "cliente@email.com",
  "renovation_type": "Light Reno",
  "area_cluster": "La Ribera"
}
```

## 🔄 Flujo Completo

```
1. Ejecutar sync:reno-in-progress
   ↓
2. Sincronizar desde Airtable
   ↓
3. Actualizar reno_phase a 'reno-in-progress'
   ↓
4. Buscar propiedades elegibles
   ↓
5. Para cada propiedad elegible:
   - Verificar que no tenga categorías
   - Preparar payload
   - Llamar al webhook de n8n
   ↓
6. n8n procesa el PDF y extrae categorías
   ↓
7. n8n inserta categorías en Supabase
   ↓
8. Las categorías aparecen en la UI
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

- `NEXT_PUBLIC_AIRTABLE_API_KEY`
- `NEXT_PUBLIC_AIRTABLE_BASE_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Webhook URL

El webhook se llama a:
```
https://n8n.prod.prophero.com/webhook/send_categories_cursor
```

## 🧪 Prueba Manual

Si quieres probar el webhook manualmente con una propiedad específica:

```bash
npm run test:webhook
```

Este script:
1. Busca una propiedad en `reno-in-progress` sin categorías
2. Le agrega un `budget_pdf_url` de prueba si no tiene
3. Llama al webhook

## 📊 Monitoreo

Para ver el resumen de llamadas al webhook, revisa los logs después de ejecutar la sincronización:

```
[Reno In Progress Sync] Webhook summary: X called, Y skipped
```

- **called**: Número de webhooks llamados exitosamente
- **skipped**: Número de propiedades omitidas (ya tienen categorías o no tienen `budget_pdf_url`)

## 🔧 Troubleshooting

### No se llama al webhook

**Posibles causas:**
1. Las propiedades no tienen `budget_pdf_url` → Verifica en Airtable que el campo "Tech Budget Attachment" esté lleno
2. Las propiedades ya tienen categorías → Normal, el sistema evita duplicados
3. Las propiedades no están en `reno-in-progress` → Verifica que el `reno_phase` sea correcto

### El webhook se llama pero no se crean categorías

1. Verifica que el workflow de n8n esté activo
2. Revisa los logs de n8n para ver si hay errores
3. Verifica que el webhook esté insertando correctamente en Supabase (revisa `docs/N8N_INSERT_CATEGORIES.md`)

## ✅ Checklist

- [ ] Las propiedades tienen `budget_pdf_url` en Airtable
- [ ] Las propiedades están en fase "Reno in progress" en Airtable
- [ ] El workflow de n8n está activo
- [ ] El webhook de n8n puede insertar en Supabase (configuración correcta)
- [ ] Las variables de entorno están configuradas






