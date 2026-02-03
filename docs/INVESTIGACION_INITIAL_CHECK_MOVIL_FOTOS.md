# Investigación: Initial check desde móvil – fotos no se ven y check incompleto

## Propiedad afectada
- **ID / Unique ID:** SP-NIU-O3C-005809  
- **Dirección:** Av. Prueba Kick Off  

## Resultado del diagnóstico (Supabase)

Se ejecutó el script `scripts/diagnose-initial-check-photos.ts` para esta propiedad:

- **Inspección initial:** existe 1, estado `completed`, creada y completada el 2026-02-02.
- **Zonas:** 8 zonas creadas correctamente (entorno, distribucion, entrada, dormitorio, salon, bano, cocina, exterior).
- **Elementos (`inspection_elements`):** **0**.

Es decir: la inspección está marcada como completada y tiene sus zonas, pero **no se guardó ningún elemento** (ni preguntas, ni fotos, ni vídeos). Por eso al abrir el check no se ve el contenido ni las fotos.

## Causa probable

El flujo actual es:

1. Al **finalizar** el checklist se llama a `saveCurrentSection()` y luego a `saveAllSections()`.
2. `saveAllSections()` recorre **todas** las secciones de `checklist.sections` y, por cada una, llama a `saveCurrentSection()`.
3. En cada sección, si hay fotos/vídeos en base64:
   - Primero se suben a Supabase Storage (`uploadFilesToStorage`).
   - Si la subida **falla** (red, timeout, RLS, etc.), se hace `toast.error` y **se sale de `saveCurrentSection()` sin guardar elementos**.
   - Solo si la subida va bien se actualizan las URLs en la sección y se hace el `upsert` de elementos en `inspection_elements`.

En móvil es fácil que:

- La subida falle (red lenta, timeout, o políticas de Storage).
- Al fallar la subida, **no se guardan elementos** para esa sección.
- Si falla en las primeras secciones o hay un error antes de llegar a guardar, puede que **no se persista ningún elemento** y sí se marque la inspección como `completed` (porque `completeInspection()` se llama después de `saveAllSections()`).

Además, si en móvil la página se recarga o el estado se rehidrata desde Supabase **antes** de que se ejecute `saveAllSections()` (p. ej. por navegación o cierre de pestaña), `checklist.sections` podría estar vacío o desactualizado y el bucle no guardaría nada.

## Cómo reproducir el diagnóstico

Para cualquier otra propiedad:

```bash
npx tsx scripts/diagnose-initial-check-photos.ts <propertyId o Unique ID>
```

Ejemplo:

```bash
npx tsx scripts/diagnose-initial-check-photos.ts SP-NIU-O3C-005809
```

Ahí se ve si la inspección existe, si tiene zonas y **cuántos elementos tienen `image_urls` / `video_urls`**.

## Recomendaciones

1. **Guardar elementos aunque falle la subida**  
   - No hacer `return` tras un error de `uploadFilesToStorage`.  
   - Guardar en `inspection_elements` lo que se tenga (p. ej. preguntas, notas, y `image_urls`/`video_urls` solo para los archivos que sí se subieron).  
   - Opcional: marcar o reintentar en segundo plano los archivos que no se pudieron subir.

2. **Mejorar robustez en móvil**  
   - Aumentar tiempo de espera o reintentos para la subida a Storage en móvil.  
   - Mostrar un aviso claro si la subida falla (“Algunas fotos no se han podido subir; el resto del check se ha guardado”) en lugar de fallar todo el guardado.

3. **Comprobar políticas de Storage**  
   - Revisar en Supabase que el bucket `inspection-images` exista y que las políticas RLS permitan **insert** (y si aplica **update**) para el rol/usuario que usa la app en móvil (por ejemplo `authenticated` o el que corresponda).

4. **Orden de operaciones al finalizar**  
   - Asegurar que `saveAllSections()` termine correctamente antes de marcar la inspección como `completed` y, si es posible, no cerrar/redirigir hasta que al menos el guardado en DB haya terminado.

5. **Estado al reabrir**  
   - Si el usuario cierra o cambia de pestaña tras rellenar pero antes de “Finalizar”, el estado en memoria se pierde. Valorar guardar borradores por sección (por ejemplo al cambiar de sección) para no depender solo del guardado masivo al final.

## Archivos relevantes

- **Diagnóstico:** `scripts/diagnose-initial-check-photos.ts`
- **Flujo de guardado:** `hooks/useSupabaseChecklistBase.ts` – `saveCurrentSection`, `saveAllSections`, `finalizeChecklist`
- **Subida a Storage:** `lib/supabase/storage-upload.ts`
- **Conversión DB ↔ checklist:** `lib/supabase/checklist-converter.ts` – solo se persisten URLs HTTP en `image_urls`/`video_urls`, no base64.

## Resumen

- Para **SP-NIU-O3C-005809** el initial check está completado en DB pero con **0 elementos**; por eso no se ven fotos ni el resto del contenido.
- La causa más probable es que, en móvil, la subida de archivos falle o el guardado de elementos no llegue a ejecutarse (por error en la subida o por estado vacío al finalizar), mientras que la inspección sí se marca como `completed`.
- Las mejoras propuestas van encaminadas a: guardar siempre los elementos posibles, mejorar mensajes y reintentos en móvil, y revisar Storage y el orden de operaciones al finalizar.
