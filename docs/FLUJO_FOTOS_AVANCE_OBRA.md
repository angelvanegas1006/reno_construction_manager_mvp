# Fotos de avance de obra (obras en proceso)

## Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| **¿Qué hacemos cuando se suben fotos?** | 1) Guardamos cada foto en **Supabase Storage**. 2) Llamamos **una vez** al webhook de n8n por cada **lote de 3 fotos** con las URLs de Storage (y datos de la propiedad). |
| **¿Las guardamos en base de datos?** | **No** en una tabla de fotos. Sí en **Supabase Storage** (bucket `inspection-images`, ruta `{propertyId}/reno-in-progress/{fileName}`). La tabla `properties` **no** se actualiza con URLs de estas fotos. |
| **¿Cuántas llamadas a n8n?** | **Una llamada a n8n por cada lote de 3 fotos**. Ejemplo: 9 fotos → 3 lotes → **3 llamadas** al webhook de n8n. |

---

## 1. Qué pasa cuando se suben fotos

1. **En el cliente** (`RenoInProgressPhotoUpload`):
   - El usuario selecciona fotos (máx. 20, hasta 10 MB cada una; JPEG, PNG, WEBP).
   - Las fotos se convierten a base64 en memoria.
   - Se envían en **lotes de 3 fotos** (`BATCH_SIZE = 3`) a la API para evitar límites de tamaño del body (~1 MB por defecto).

2. **Por cada lote**, el cliente hace **1 request** a:
   - `POST /api/webhooks/reno-in-progress-photos`  
   - Body: `{ propertyId, photoUrls: [{ url (base64), filename }, ...] }` (máx. 3 fotos por request).

3. **En la API** (`app/api/webhooks/reno-in-progress-photos/route.ts`):
   - Lee la propiedad en Supabase (por `id` o por `Unique ID From Engagements`).
   - Comprueba que tenga `drive_folder_id` y `address`.
   - **Sube cada foto del lote a Supabase Storage**:
     - Bucket: `inspection-images`
     - Ruta: `{property.id}/reno-in-progress/{timestamp}_{index}_{random}.{ext}`
   - Obtiene la URL pública de cada archivo subido.
   - **Hace 1 llamada al webhook de n8n** con:
     - `driveFolder_id`, `drive_folder_url`, `propertyAddress`
     - `images`: array de `{ url: publicUrlDeStorage, filename }` (ya no base64).
   - Responde al cliente con éxito o error.

4. **n8n** recibe ese payload y, según el flujo configurado, usa las URLs para guardar/copiar las fotos en la carpeta de Drive de la propiedad.

---

## 2. Dónde se guardan las fotos

- **Supabase Storage**  
  - Bucket: `inspection-images`  
  - Path: `{propertyId}/reno-in-progress/{fileName}`  
  - Las URLs son públicas (o según política del bucket).

- **Base de datos (Supabase)**  
  - **No** se inserta ninguna fila en una tabla de “fotos de avance”.
  - **No** se actualiza la tabla `properties` con URLs de estas fotos.
  - Solo se **lee** la propiedad (id, address, drive_folder_id, drive_folder_url) para construir el payload de n8n y el path en Storage.

- **Drive**  
  - Lo gestiona el flujo de n8n (copiar/guardar en la carpeta de la propiedad usando `driveFolder_id` y las URLs que le enviamos).

---

## 3. Cuántas llamadas se hacen al flujo de n8n

- El cliente agrupa las fotos en lotes de **3** (`BATCH_SIZE = 3` en `reno-in-progress-photo-upload.tsx`).
- Por cada lote:
  - 1 request del navegador → **nuestra API** (`/api/webhooks/reno-in-progress-photos`).
  - Nuestra API, después de subir las fotos a Storage, hace **1 request** al webhook de n8n.

Por tanto:

- **Número de llamadas al webhook de n8n** = número de lotes = `ceil(cantidad de fotos / 3)`.

Ejemplos:

- 1 foto → 1 lote → **1 llamada** a n8n  
- 3 fotos → 1 lote → **1 llamada** a n8n  
- 4 fotos → 2 lotes → **2 llamadas** a n8n  
- 9 fotos → 3 lotes → **3 llamadas** a n8n  
- 20 fotos (máximo) → 7 lotes → **7 llamadas** a n8n  

Cada llamada a n8n incluye **todas las fotos de ese lote** (como URLs de Supabase Storage), no una foto por llamada.

---

## 4. Referencia de código

| Qué | Dónde |
|-----|--------|
| Componente “Fotos de avance de obra” | `components/reno/reno-in-progress-photo-upload.tsx` |
| Lotes de 3 fotos, llamada a API | Mismo componente, `BATCH_SIZE = 3`, `uploadRenoInProgressPhotos(propertyId, batch)` |
| Cliente → API (fetch) | `lib/n8n/webhook-caller.ts` → `uploadRenoInProgressPhotos()` → `POST /api/webhooks/reno-in-progress-photos` |
| API: Storage + llamada n8n | `app/api/webhooks/reno-in-progress-photos/route.ts` |
| URL del webhook n8n | `https://n8n.prod.prophero.com/webhook/reno_in_progress_photos` |

---

## 5. Diagrama del flujo (por lote de 3 fotos)

```
[Usuario] selecciona fotos
       ↓
[RenoInProgressPhotoUpload] agrupa en lotes de 3
       ↓
Por cada lote:
  [Cliente] POST /api/webhooks/reno-in-progress-photos { propertyId, photoUrls (3 fotos base64) }
       ↓
  [API] 1) Lee property en Supabase
        2) Sube cada foto a Supabase Storage (inspection-images / {propertyId}/reno-in-progress/...)
        3) POST al webhook n8n con { driveFolder_id, propertyAddress, images: [ URLs de Storage ] }
       ↓
  [n8n] Recibe payload y guarda/copia en Drive
       ↓
  [API] Responde OK/error al cliente
       ↓
  [Cliente] Marca fotos del lote como “subidas” o muestra error
```
