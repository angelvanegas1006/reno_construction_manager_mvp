# Verificación: Fotos y categorías del checklist (Initial/Final Check)

Tras aplicar el fix del botón "Continuar" (guardar sección actual con su id antes de cambiar), sigue estos pasos para comprobar que las fotos y el estado/categorías se guardan correctamente.

## 1. Preparar la propiedad de prueba

Si quieres reutilizar una propiedad que ya tenía initial check (ej. SP-NIU-O3C-005809), borra su initial check:

```bash
npx tsx scripts/delete-initial-and-final-check-for-property.ts SP-NIU-O3C-005809
```

## 2. Reproducir el flujo en móvil (o desktop)

1. Ir a la propiedad en la app (Construction Manager) y abrir el initial check.
2. En **varias secciones**:
   - Marcar estado/categorías (ej. "Buen estado", "Necesita reparación").
   - Añadir al menos una foto por sección (cámara o galería).
3. Avanzar usando **solo el botón "Continuar"** (no el menú lateral), para asegurar que el fix de `handleContinue` se ejecuta.
4. Opcional: en la última sección pulsar "Enviar checklist" y completar el flujo.

## 3. Ejecutar el diagnóstico

Desde la raíz del proyecto:

```bash
npx tsx scripts/diagnose-initial-check-photos.ts SP-NIU-O3C-005809
```

(Sustituye por el `propertyId` que hayas usado.)

## 4. Qué comprobar en la salida

- **Elementos totales**: debe ser > 0 (antes del fix salía 0).
- **Con image_urls**: debe haber elementos con fotos (ej. elementos `fotos-*`).
- **Con condition/notes**: los elementos que corresponden a preguntas/categorías deben tener `condition` y/o `notes` según lo que hayas rellenado.

Si **siguen saliendo 0 elementos** o **0 con image_urls**:

- Revisar consola del navegador (y red) al guardar: mensajes de `[storage-upload]` y `[useSupabaseChecklistBase]`.
- Comprobar bucket y RLS: `npx tsx scripts/check-inspection-images-bucket.ts` y [docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md](SUPABASE_STORAGE_INSPECTION_IMAGES.md).

## 5. Comprobar también el menú lateral

Repetir un flujo avanzando con el **menú lateral** (cambiar de sección desde el sidebar). La sección que abandonas debe guardarse igual; el diagnóstico debe seguir mostrando elementos y fotos para las secciones que visitaste.
