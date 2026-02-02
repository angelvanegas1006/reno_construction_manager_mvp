# Sincronización Airtable y Cron Jobs diarios

Este documento explica cómo funciona la sincronización con Airtable, cómo ejecutarla manualmente y cómo comprobar que los cron jobs diarios están funcionando.

---

## 1. Sincronización con Airtable

### Qué hace el sync

- **Origen**: bases/vistas de Airtable (por fases del kanban).
- **Destino**: tabla `properties` en Supabase.
- **Lógica**: `lib/airtable/sync-all-phases.ts` → `syncAllPhasesFromAirtable()` usa el método unificado en `lib/airtable/sync-unified.ts` para mantener Airtable y Supabase alineados (crear/actualizar propiedades, mover a “orphaned” si no están en ninguna vista, etc.).

### Cómo ejecutar el sync manualmente

**Opción A – Desde tu máquina (recomendado para pruebas)**

```bash
# Cargar .env.local y ejecutar sync completo
npm run sync:all-phases
```

O con el script que además verifica `Est_reno_start_date`:

```bash
npx tsx scripts/run-local-sync.ts
```

**Opción B – Llamar al endpoint de cron (producción/staging)**

Si tienes `CRON_SECRET` configurado en el proyecto:

```bash
# Sustituir TU_DOMINIO y TU_CRON_SECRET
curl -X GET "https://TU_DOMINIO/api/cron/sync-airtable" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Ejemplo con variable de entorno:

```bash
curl -X GET "https://tu-app.vercel.app/api/cron/sync-airtable" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Si la respuesta es `200` y el JSON incluye `success`, `totalCreated`, `totalUpdated`, el sync se ejecutó correctamente.

---

## 2. Cron jobs diarios (Vercel)

### Configuración actual (`vercel.json`)

- **Sync Airtable**: `/api/cron/sync-airtable`  
  Horarios (UTC): **8:00, 10:30, 12:00, 14:30, 16:00, 18:30, 20:00, 22:30** (varias veces al día).

- **Sync Google Calendar**: `/api/cron/sync-google-calendar`  
  Horario (UTC): **9:00** una vez al día.

### Comprobar que los crons están funcionando

1. **Solo en producción**  
   Los cron jobs de Vercel **solo se ejecutan en el deployment de producción**, no en previews. Si trabajas en una URL de preview (por rama), los crons no correrán ahí.

2. **Variable `CRON_SECRET`**  
   - En el dashboard de Vercel: **Project → Settings → Environment Variables**.  
   - Debe existir `CRON_SECRET` (recomendado ≥ 16 caracteres) y estar definida para **Production** (y Staging si usas ese entorno).  
   - Vercel envía `Authorization: Bearer <CRON_SECRET>` al llamar a los cron; si no está configurado o no coincide, el endpoint puede responder 401 y el cron “fallará” desde el punto de vista del resultado.

3. **Logs en Vercel**  
   - **Project → Logs**: filtrar por la ruta `/api/cron/sync-airtable` (o `sync-google-calendar`).  
   - Ver si hay peticiones a esas horas (UTC) y si la respuesta es 200 o 401/500.  
   - **Deployments → último deployment de producción → Functions**: ver invocaciones y duración de la función del cron.

4. **Pestaña Cron Jobs (si está disponible)**  
   En **Project → Settings** o en la vista del proyecto, si Vercel muestra la sección de Cron Jobs, ahí se listan los cron definidos en `vercel.json` y a veces el último run.

### Posibles causas por las que “no se nota” que funcionan

| Causa | Qué hacer |
|-------|-----------|
| Deployment no es producción | Hacer deploy a producción (`main` o el branch que tengas como production). |
| `CRON_SECRET` faltante o distinto | Añadir/actualizar `CRON_SECRET` en Environment Variables para Production (y Staging si aplica) y volver a desplegar si hace falta. |
| Timeout del sync | Si el sync tarda más que el límite de la función (p. ej. 60 s en Pro), puede cortarse; revisar logs y optimizar sync o dividir trabajo. |
| Errores dentro del sync | En Logs, buscar respuestas 500 o mensajes `[Airtable Sync Cron] Error:`; revisar credenciales Airtable/Supabase y permisos. |

### Verificación rápida del endpoint (sin esperar al cron)

```bash
# Con CRON_SECRET (respuesta 200 + JSON con resultado del sync)
curl -X GET "https://tu-dominio.vercel.app/api/cron/sync-airtable" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Si devuelve 401, el secret no está o no coincide. Si devuelve 200, el sync se ejecutó correctamente en esa llamada.

---

## 3. Webhook de Airtable (opcional, cambios en tiempo real)

Además de los crons, puedes configurar un webhook de Airtable para que, al cambiar datos en Airtable, se llame a tu API y se actualice Supabase sin esperar al próximo cron.

- **URL del webhook**: `https://TU_DOMINIO/api/webhooks/airtable`  
- **Variable opcional**: `AIRTABLE_WEBHOOK_SECRET` para autorizar el POST.  
- **Configuración**:  
  `npm run setup:airtable-webhook` (usa `NEXT_PUBLIC_AIRTABLE_BASE_ID` y, si aplica, `AIRTABLE_WEBHOOK_URL` o `NEXT_PUBLIC_APP_URL`).

El endpoint está en `app/api/webhooks/airtable/route.ts` y usa `lib/airtable/webhook-processor` para procesar el cuerpo del webhook.

---

## 4. Resumen de variables de entorno útiles

| Variable | Uso |
|----------|-----|
| `CRON_SECRET` | Que Vercel autorice las llamadas a `/api/cron/*`. **Recomendado en producción.** |
| `NEXT_PUBLIC_AIRTABLE_BASE_ID` | Base de Airtable para sync y webhook. |
| `AIRTABLE_API_KEY` o token configurado en `lib/airtable` | Acceso a la API de Airtable. |
| `AIRTABLE_WEBHOOK_URL` / `NEXT_PUBLIC_APP_URL` | URL base para registrar el webhook (script `setup:airtable-webhook`). |
| `AIRTABLE_WEBHOOK_SECRET` | (Opcional) Secret para validar el POST del webhook. |
| Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) | Para que el sync escriba en `properties`. |

---

## 5. Checklist rápido si “los crons no funcionan”

1. [ ] El deployment donde miras es **producción** (no preview).  
2. [ ] En Vercel, **Environment Variables** → `CRON_SECRET` existe y está en **Production**.  
3. [ ] **Logs** del proyecto: hay peticiones a `/api/cron/sync-airtable` a las horas en UTC indicadas.  
4. [ ] Esas peticiones devuelven **200** (y no 401/500).  
5. [ ] Probar manualmente con `curl` y `Authorization: Bearer $CRON_SECRET` y comprobar que responde 200 y que en Supabase se actualizan datos después del sync.

Si tras esto sigues sin ver ejecuciones, revisar en la documentación de Vercel la sección de [Cron Jobs](https://vercel.com/docs/cron-jobs) y [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) por posibles límites o cambios de comportamiento de la cuenta.
