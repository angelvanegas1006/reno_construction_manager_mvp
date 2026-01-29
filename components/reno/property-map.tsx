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
  const isMountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener API key - en Next.js las variables NEXT_PUBLIC_* están disponibles en el cliente
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    isMountedRef.current = true;

    if (!apiKey) {
      setError("API key no configurada");
      setIsLoading(false);
      return;
    }

    // Función para inicializar el mapa una vez que Google Maps esté cargado
    const initMap = () => {
      if (!isMountedRef.current || !mapRef.current) {
        return;
      }

      if (!window.google || !window.google.maps) {
        if (isMountedRef.current) {
          setError("Error al cargar Google Maps");
          setIsLoading(false);
        }
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address, region: "ES" },
        (results, status) => {
          if (!isMountedRef.current || !mapRef.current) return;

          if (status === "OK" && results?.[0]) {
            const location = results[0].geometry.location;
            const bounds = results[0].geometry.viewport;

            if (!window.google?.maps) return;
            const container = mapRef.current;
            if (!container) return;

            const map = new window.google.maps.Map(container, {
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
            if (isMountedRef.current) setIsLoading(false);
          } else if (isMountedRef.current) {
            setError(`No se pudo encontrar la ubicación: ${status}`);
            setIsLoading(false);
          }
        }
      );
    };

    // Función para cargar Google Maps y luego inicializar
    const loadAndInitMap = () => {
      if (!isMountedRef.current) return;

      // Verificar si el ref está disponible
      if (!mapRef.current) {
        const maxAttempts = 50; // 5 segundos máximo
        let attempts = 0;
        const id = setInterval(() => {
          attempts++;
          if (!isMountedRef.current) {
            clearInterval(id);
            return;
          }
          if (mapRef.current) {
            clearInterval(id);
            continueInit();
          } else if (attempts >= maxAttempts) {
            clearInterval(id);
            if (isMountedRef.current) {
              setError("Error: no se pudo inicializar el contenedor del mapa");
              setIsLoading(false);
            }
          }
        }, 100);
        pendingIntervalsRef.current.push(id);
        return;
      }

      continueInit();
    };

    const continueInit = () => {
      if (!isMountedRef.current || !mapRef.current) return;

      // Cargar el script de Google Maps si no está cargado
      if (!window.google || !window.google.maps) {
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          let attempts = 0;
          const maxAttempts = 50;
          const id = setInterval(() => {
            attempts++;
            if (!isMountedRef.current || !mapRef.current) {
              clearInterval(id);
              return;
            }
            if (window.google?.maps) {
              clearInterval(id);
              initMap();
            } else if (attempts >= maxAttempts) {
              clearInterval(id);
              if (isMountedRef.current) {
                setError("Timeout al cargar Google Maps");
                setIsLoading(false);
              }
            }
          }, 100);
          pendingIntervalsRef.current.push(id);
          return;
        }

        const loadTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            setError("Timeout al cargar Google Maps. Verifica tu conexión y que la API key sea válida.");
            setIsLoading(false);
          }
        }, 10000);
        pendingTimeoutsRef.current.push(loadTimeout);

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          clearTimeout(loadTimeout);
          const id = setTimeout(() => {
            if (!isMountedRef.current || !mapRef.current) return;
            if (window.google?.maps) {
              initMap();
            } else if (isMountedRef.current) {
              setError("Google Maps no se inicializó correctamente");
              setIsLoading(false);
            }
          }, 200);
          pendingTimeoutsRef.current.push(id);
        };
        script.onerror = () => {
          clearTimeout(loadTimeout);
          if (isMountedRef.current) {
            setError("Error al cargar Google Maps API. Verifica tu API key y que las APIs (Maps JavaScript API y Geocoding API) estén habilitadas en Google Cloud Console.");
            setIsLoading(false);
          }
        };
        document.head.appendChild(script);
      } else {
        if (isMountedRef.current && mapRef.current) initMap();
      }
    };

    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) loadAndInitMap();
    }, 200);
    pendingTimeoutsRef.current.push(initTimeout);

    return () => {
      isMountedRef.current = false;
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];
      pendingIntervalsRef.current.forEach(clearInterval);
      pendingIntervalsRef.current = [];
      if (markerRef.current) {
        markerRef.current.setMap(null);
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
