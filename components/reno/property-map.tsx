"use client";

import { useEffect, useRef, useState } from "react";
import { Map } from "lucide-react";

interface PropertyMapProps {
  address: string;
  areaCluster?: string;
}

// Declaración de tipos para Google Maps
declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options?: any) => any;
        Marker: new (options?: any) => any;
        Geocoder: new () => {
          geocode: (request: any, callback: (results: any[], status: string) => void) => void;
        };
        InfoWindow: new (options?: any) => any;
        Animation: {
          DROP: number;
        };
        places: any;
        geocoding: any;
      };
    };
    initMap?: () => void;
  }
}

export function PropertyMap({ address, areaCluster }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener API key - en Next.js las variables NEXT_PUBLIC_* están disponibles en el cliente
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    console.log('[PropertyMap] useEffect triggered', { apiKey: apiKey ? 'present' : 'missing', address, hasMapRef: !!mapRef.current });
    
    if (!apiKey) {
      console.error('[PropertyMap] API key no configurada');
      setError("API key no configurada");
      setIsLoading(false);
      return;
    }

    // Función para inicializar el mapa una vez que Google Maps esté cargado
    const initMap = () => {
      console.log('[PropertyMap] initMap called', { hasGoogle: !!window.google, hasMaps: !!(window.google?.maps) });
      
      if (!mapRef.current) {
        console.error('[PropertyMap] mapRef.current es null en initMap');
        setError("Error: referencia al mapa no disponible");
        setIsLoading(false);
        return;
      }

      if (!window.google || !window.google.maps) {
        console.error('[PropertyMap] Google Maps no está disponible');
        setError("Error al cargar Google Maps");
        setIsLoading(false);
        return;
      }

      console.log('[PropertyMap] Iniciando geocodificación para:', address);

      // Geocodificar la dirección para obtener coordenadas
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode(
        { 
          address: address,
          region: 'ES', // Priorizar resultados en España
        },
        (results, status) => {
          console.log('[PropertyMap] Geocoding response', { status, resultsCount: results?.length || 0 });
          
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            const bounds = results[0].geometry.viewport;

            console.log('[PropertyMap] Location found:', { lat: location.lat(), lng: location.lng() });

            // Crear el mapa
            if (!window.google?.maps) {
              throw new Error("Google Maps no está disponible");
            }
            const map = new window.google.maps.Map(mapRef.current!, {
              center: location,
              zoom: 15,
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            });

            // Ajustar el zoom para mostrar el área completa si hay bounds
            if (bounds) {
              map.fitBounds(bounds);
            }

            // Crear el marcador
            const marker = new window.google.maps.Marker({
              position: location,
              map: map,
              title: address,
              animation: window.google.maps.Animation?.DROP || 0,
            });

            // Info window con la dirección
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <p style="margin: 0; font-weight: 600; font-size: 14px;">${address}</p>
                  ${areaCluster ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${areaCluster}</p>` : ''}
                </div>
              `,
            });

            // Mostrar info window al hacer click en el marcador
            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });

            mapInstanceRef.current = map;
            markerRef.current = marker;
            setIsLoading(false);
            console.log('[PropertyMap] Mapa inicializado correctamente');
          } else {
            console.error("[PropertyMap] Geocoding failed:", status, results);
            setError(`No se pudo encontrar la ubicación: ${status}`);
            setIsLoading(false);
          }
        }
      );
    };

    // Función para cargar Google Maps y luego inicializar
    const loadAndInitMap = () => {
      // Verificar si el ref está disponible
      if (!mapRef.current) {
        console.log('[PropertyMap] mapRef.current no está disponible, reintentando...', {
          hasRef: !!mapRef,
          refCurrent: mapRef.current,
          documentReady: document.readyState
        });
        // Reintentar después de un pequeño delay, pero con un límite máximo
        const maxAttempts = 50; // 5 segundos máximo
        let attempts = 0;
        const checkRef = setInterval(() => {
          attempts++;
          if (mapRef.current) {
            clearInterval(checkRef);
            console.log('[PropertyMap] mapRef.current ahora está disponible después de', attempts, 'intentos');
            // Continuar con la inicialización
            continueInit();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkRef);
            console.error('[PropertyMap] Timeout esperando mapRef.current');
            setError("Error: no se pudo inicializar el contenedor del mapa");
            setIsLoading(false);
          }
        }, 100);
        return;
      }
      
      continueInit();
    };

    const continueInit = () => {
      if (!mapRef.current) {
        console.error('[PropertyMap] mapRef.current es null en continueInit');
        return;
      }

      // Cargar el script de Google Maps si no está cargado
      if (!window.google || !window.google.maps) {
        console.log('[PropertyMap] Google Maps no está cargado, cargando script...');
        
        // Verificar si el script ya está en proceso de carga
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          console.log('[PropertyMap] Script ya existe, esperando a que cargue...');
          // Esperar a que se cargue
          let attempts = 0;
          const maxAttempts = 50; // 5 segundos máximo
          const checkGoogle = setInterval(() => {
            attempts++;
            if (window.google && window.google.maps) {
              console.log('[PropertyMap] Google Maps cargado después de esperar');
              clearInterval(checkGoogle);
              initMap();
            } else if (attempts >= maxAttempts) {
              console.error('[PropertyMap] Timeout esperando Google Maps');
              clearInterval(checkGoogle);
              setError("Timeout al cargar Google Maps");
              setIsLoading(false);
            }
          }, 100);

          // Cleanup se maneja en el return del useEffect
        }

        console.log('[PropertyMap] Creando nuevo script de Google Maps');
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding`;
        script.async = true;
        script.defer = true;
        
        // Timeout para detectar si el script no carga
        const loadTimeout = setTimeout(() => {
          console.error('[PropertyMap] Timeout cargando script de Google Maps');
          setError("Timeout al cargar Google Maps. Verifica tu conexión y que la API key sea válida.");
          setIsLoading(false);
        }, 10000); // 10 segundos
        
        script.onload = () => {
          console.log('[PropertyMap] Script de Google Maps cargado');
          clearTimeout(loadTimeout);
          // Pequeño delay para asegurar que todo esté listo
          setTimeout(() => {
            if (window.google && window.google.maps) {
              initMap();
            } else {
              console.error('[PropertyMap] Google Maps no disponible después de cargar script');
              setError("Google Maps no se inicializó correctamente");
              setIsLoading(false);
            }
          }, 200);
        };
        script.onerror = (error) => {
          console.error('[PropertyMap] Error al cargar script:', error);
          clearTimeout(loadTimeout);
          setError("Error al cargar Google Maps API. Verifica tu API key y que las APIs (Maps JavaScript API y Geocoding API) estén habilitadas en Google Cloud Console.");
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } else {
        console.log('[PropertyMap] Google Maps ya está cargado, inicializando directamente');
        // Google Maps ya está cargado
        initMap();
      }
    };

    // Iniciar la carga después de un pequeño delay para asegurar que el DOM esté listo
    // Usar un timeout más largo para dar tiempo a que el ref esté disponible
    const initTimeout = setTimeout(() => {
      loadAndInitMap();
    }, 200);

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (mapInstanceRef.current) {
        // El mapa se limpia automáticamente
      }
    };
  }, [address, areaCluster, apiKey]);

  // Si no hay API key, mostrar placeholder
  if (!apiKey) {
    return (
      <div className="aspect-video bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Map className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{address}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para ver el mapa
          </p>
        </div>
      </div>
    );
  }

  // SIEMPRE renderizar el div con el ref, incluso cuando está cargando o hay error
  // Esto asegura que el ref esté disponible cuando el useEffect se ejecute
  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] relative">
      {/* Div del mapa - siempre presente en el DOM */}
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      
      {/* Overlay de loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--prophero-blue-600)] mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Overlay de error */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex items-center justify-center z-10">
          <div className="text-center">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">{address}</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
