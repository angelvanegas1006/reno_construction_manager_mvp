# Configuración de Google Maps API

Si ves el error **RefererNotAllowedMapError** en consola, la API key tiene restricciones de referrer y la URL desde la que cargas la app no está autorizada.

## Cómo solucionarlo

1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona el proyecto donde está la API key (o créalo si usas una key nueva).
3. Ve a **APIs & Services** → **Credentials** y abre la API key que usas en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
4. En **Application restrictions**:
   - Elige **HTTP referrers (websites)**.
   - En **Website restrictions** añade las URLs desde las que cargas la app, por ejemplo:
     - `http://localhost:3000/*` (desarrollo local)
     - `https://tu-dominio.vercel.app/*` (si despliegas en Vercel)
     - `https://tu-dominio.com/*` (producción)
5. Guarda los cambios (**Save**).

Tras unos minutos, las peticiones desde esas URLs dejarán de dar RefererNotAllowedMapError.

## Comprobar que la API está activa

En **APIs & Services** → **Library** asegúrate de tener habilitadas:

- **Maps JavaScript API**
- **Geocoding API** (si usas geocodificación)

## Variable de entorno

En `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

Reinicia el servidor de desarrollo (`npm run dev`) después de cambiar la variable.
