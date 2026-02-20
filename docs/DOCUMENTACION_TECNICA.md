# Documentación Técnica - Vistral Reno MVP

Documento de referencia con las especificaciones técnicas principales de la aplicación para uso en documentación interna.

---

## 1. Cron Jobs y Sincronización con Airtable

### 1.1 Configuración de Cron Jobs (Vercel)

Los cron jobs se definen en `vercel.json` y **solo se ejecutan en el deployment de producción** (no en previews).

| Endpoint | Horario (UTC) | Descripción |
|----------|---------------|-------------|
| `/api/cron/sync-airtable` | 8:00, 10:30, 12:00, 14:30, 16:00, 18:30, 20:00, 22:30 | Sincronización Airtable → Supabase (8 veces al día) |
| `/api/cron/sync-google-calendar` | 9:00 | Sincronización eventos con Google Calendar (1 vez al día) |

### 1.2 Sync Airtable - Flujo Completo

**Ruta API:** `app/api/cron/sync-airtable/route.ts`

**Autorización:**
- **Cron (Vercel):** `Authorization: Bearer CRON_SECRET` o `User-Agent: vercel-cron/*`
- **Manual (botón "Sync con Airtable"):** Usuarios con rol `admin` o `construction_manager` (verificación vía Supabase `user_roles`)

**Método:** GET o POST (ambos ejecutan el mismo sync)

**Flujo de ejecución** (`lib/airtable/sync-all-phases.ts` → `syncAllPhasesFromAirtable()`):

1. **Sync unificado de fases** (`lib/airtable/sync-unified.ts`):
   - Obtiene propiedades de **todas las vistas de Airtable** en paralelo
   - Tabla Airtable: `tblmX19OTsj3cTHmA`
   - Vistas por fase (prioridad: mayor número = fase más avanzada gana):
     - `upcoming-settlements` (viwpYQ0hsSSdFrSD1)
     - `initial-check` (viwFZZ5S3VFCfYP6g)
     - `reno-budget` (viwKS3iOiyX5iu5zP)
     - `reno-in-progress` (viwQUOrLzUrScuU4k)
     - `furnishing` (viw9NDUaeGIQDvugU)
     - `final-check` (viwnDG5TY6wjZhBL2)
     - `final-check-post-suministros` (viw4S8L4DT1sSFbtO)
     - `pendiente-suministros` (viwCFzKrVQSCc23zc)
     - `cleaning` (viwLajczYxzQd4UvU)
   - Resuelve conflictos: si una propiedad está en varias vistas, gana la fase con mayor prioridad
   - Propiedades que no están en ninguna vista → `reno_phase = "orphaned"`
   - Upsert en Supabase `properties` (crear/actualizar)

2. **Sync de proyectos** (`lib/airtable/sync-projects.ts`):
   - Sincroniza tabla `projects` desde Airtable (vista configurada en `AIRTABLE_PROJECTS_VIEW_ID`)
   - Enlaza `properties.project_id` desde Airtable "Properties linked"

3. **Sync de presupuestos** (`lib/airtable/sync-budget-from-transactions.ts`):
   - Sincroniza `budget_pdf_url` desde Airtable Transactions para todas las propiedades del kanban
   - Si una propiedad no tiene categorías dinámicas → dispara webhook n8n para extracción de categorías del PDF

### 1.3 Sync Google Calendar

**Ruta API:** `app/api/cron/sync-google-calendar/route.ts`

- Obtiene usuarios con Google Calendar conectado (`google_calendar_tokens`)
- Para cada usuario, sincroniza eventos de propiedades (visitas estimadas, fechas de obra, etc.) con su calendario
- Usa `lib/google-calendar/sync-service.ts`

### 1.4 Ejecución Manual del Sync Airtable

**Desde la UI:** Botón "Sync con Airtable" en el navbar de los kanbans (Units y Proyectos/WIP). Solo visible para admin/construction_manager.

**Desde terminal:**
```bash
npm run sync:all-phases
# o
npx tsx scripts/run-local-sync.ts
```

**Desde producción (curl):**
```bash
curl -X GET "https://TU_DOMINIO/api/cron/sync-airtable" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 1.5 Webhook de Airtable (opcional)

**Ruta:** `app/api/webhooks/airtable` (POST)

- Recibe eventos de Airtable cuando cambian registros
- Procesa con `lib/airtable/webhook-processor.ts`
- Configuración: `npm run setup:airtable-webhook`
- Variable opcional: `AIRTABLE_WEBHOOK_SECRET` para autorizar el POST

---

## 2. Stack Tecnológico

| Tecnología | Versión / Uso |
|------------|---------------|
| **Next.js** | 16.x (App Router) |
| **React** | 19.x |
| **TypeScript** | 5.x |
| **Supabase** | Auth, PostgreSQL, Storage |
| **Airtable** | Fuente de datos de propiedades y proyectos |
| **Tailwind CSS** | 4.x |
| **Radix UI** | Componentes (Dialog, Select, etc.) |
| **Lucide React** | Iconos |
| **date-fns** | Manejo de fechas |
| **Zod** | Validación de esquemas |
| **Mixpanel** | Analytics |
| **Vercel** | Hosting, Cron Jobs |

---

## 3. Autenticación y Roles

**Proveedor:** Supabase Auth (no Auth0 en el flujo actual de la app Reno)

**Tabla de roles:** `user_roles` (user_id, role)

**Roles (`app_role` enum):**
- `admin`
- `construction_manager`
- `foreman` (jefe de obra)
- `user`

**Contexto:** `lib/auth/app-auth-context.tsx` → `AppAuthProvider` usa `useSupabaseAuthContext` y consulta `user_roles` para obtener el rol.

**Permisos por rol:**
- **admin / construction_manager:** Acceso completo a kanbans, sync Airtable, filtros, asignación de jefe de obra
- **foreman:** Kanban Units con propiedades asignadas a él (`assigned_site_manager_email`), sin acceso a Kanban Proyectos
- **user:** Acceso limitado según lógica de negocio

---

## 4. Base de Datos (Supabase / PostgreSQL)

**Tablas principales:**
- `properties` – Propiedades (viviendas) sincronizadas desde Airtable + campos propios (ej. `assigned_site_manager_email`)
- `projects` – Proyectos que agrupan propiedades (Project, WIP)
- `property_inspections` – Inspecciones (checklist inicial/final)
- `inspection_zones` / `inspection_elements` – Estructura del checklist
- `property_dynamic_categories` – Categorías extraídas del PDF de partidas (n8n)
- `user_roles` – Roles de usuario
- `google_calendar_tokens` – Tokens OAuth para Google Calendar

**Sincronización Airtable → Supabase:**
- `properties`: campos mapeados desde Airtable (Set Up Status, Unique ID, address, etc.) + `reno_phase` derivado
- `projects`: desde vista Airtable de proyectos
- `properties.project_id`: enlace desde Airtable "Properties linked"

**Campos solo en Supabase (no sincronizados con Airtable):**
- `assigned_site_manager_email` – Jefe de obra asignado en Kanban Proyectos

---

## 5. Integración n8n

**Propósito:** Automatización de tareas (extracción de categorías del PDF, creación de carpetas Drive, reportes, etc.)

**Webhooks principales:**
- **Extracción de categorías:** `https://n8n.prod.prophero.com/webhook/send_categories_cursor` – Extrae categorías del PDF de partidas de obra y las guarda en `property_dynamic_categories`
- **Reporte de problemas:** Webhook en `report-problem-modal.tsx`
- **Fotos del checklist:** `createDriveFolderForProperty`, `uploadPhotosToDrive` en `lib/n8n/webhook-caller.ts`

**Disparo de extracción de categorías:**
1. Durante el sync Airtable (propiedades con `budget_pdf_url` y sin categorías)
2. Tras sync de presupuesto desde Airtable (`/api/sync-budget-from-airtable`)
3. Desde el kanban: botón Sync dispara sync Airtable y luego `/api/n8n/trigger-categories-extraction` (solo admin/construction_manager)

---

## 6. Kanban y Fases

**Kanban 1 (Units/Buildings/Lots):** Propiedades tipo Unit, Building, Lot. Foreman ve además Project/WIP asignados a él.

**Kanban 2 (Proyectos/WIP):** Solo propiedades tipo Project y WIP. Fases: reno-in-progress, furnishing, final-check, pendiente-suministros, final-check-post-suministros, cleaning.

**Fases del kanban** (`lib/reno-kanban-config.ts`):
- Fases iniciales: upcoming-settlements, initial-check, reno-budget-*
- Obra en curso: reno-in-progress, furnishing, final-check, pendiente-suministros, final-check-post-suministros, cleaning
- Orphaned: propiedades que ya no están en ninguna vista de Airtable

**Mapeo Set Up Status → fase:** `lib/supabase/kanban-mapping.ts` (`mapSetUpStatusToKanbanPhase`)

---

## 7. Checklists (Initial / Final)

**Rutas:**
- `/reno/construction-manager/property/[id]/checklist` – Formulario del checklist
- `/reno/construction-manager/property/[id]/checklist/pdf` – PDF generado

**Tipos:** `reno_initial` (check inicial) y `reno_final` (check final)

**Fases que usan checklist final** (`FINAL_CHECKLIST_PHASES` en checklist page):
- final-check, final-check-post-suministros, furnishing, cleaning, pendiente-suministros, amueblamiento, check-final, furnishing-cleaning

**Storage:** Fotos en Supabase Storage; URLs en `inspection_elements.image_urls`

---

## 8. Variables de Entorno Importantes

| Variable | Uso |
|----------|-----|
| `CRON_SECRET` | Autorización de cron jobs en Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (operaciones admin) |
| `NEXT_PUBLIC_AIRTABLE_BASE_ID` | Base de Airtable |
| `AIRTABLE_API_KEY` | Token de API de Airtable |
| `AIRTABLE_WEBHOOK_SECRET` | (Opcional) Validación del webhook Airtable |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (para redirects, webhooks) |

---

## 9. Estructura de Carpetas Relevante

```
app/
  api/
    cron/
      sync-airtable/route.ts    # Cron sync Airtable
      sync-google-calendar/route.ts
    webhooks/
      airtable/route.ts         # Webhook Airtable
    n8n/
      trigger-categories-extraction/route.ts
  reno/
    construction-manager/       # Kanbans, property detail, checklist
lib/
  airtable/
    sync-unified.ts             # Sync unificado por vistas
    sync-all-phases.ts          # Orquestador del sync completo
    sync-from-airtable.ts       # Fetch y mapeo Airtable → Supabase
    sync-projects.ts            # Sync proyectos y enlace
    sync-budget-from-transactions.ts
  supabase/
    client.ts, server.ts, admin.ts
  auth/
    app-auth-context.tsx
  n8n/
    webhook-caller.ts
```

---

## 10. Scripts NPM Útiles

| Script | Descripción |
|--------|-------------|
| `npm run sync:all-phases` | Sync completo Airtable → Supabase (local) |
| `npm run sync:projects` | Solo sync de proyectos |
| `npm run setup:airtable-webhook` | Configurar webhook Airtable |
| `npm run test:sync-airtable` | Probar sync Airtable |
| `npm run migrate:dev` | Ejecutar migraciones Supabase |

---

## 11. Documentación Relacionada

- `docs/CRON_Y_SYNC_AIRTABLE.md` – Detalle de cron y sync
- `docs/SYNC_PROYECTOS_PROPIEDADES_ANALISIS.md` – Análisis sync proyectos ↔ propiedades
- `docs/AIRTABLE_VIEWS_CONFIG.md` – Configuración de vistas Airtable
- `docs/AIRTABLE_FIELDS_MAPPING.md` – Mapeo de campos Airtable
