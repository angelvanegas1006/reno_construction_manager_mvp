"use client";

import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  fileUrl: string;
  fileName?: string;
}

export function PdfViewer({ fileUrl, fileName = 'budget.pdf' }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0); // Para forzar recarga del visor

  // Configurar el plugin con el layout por defecto (incluye todos los controles: zoom, navegación, descarga, impresión, etc.)
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnail tab
      defaultTabs[1], // Bookmark tab
    ],
  });

  // Resetear estado cuando cambia la URL
  useEffect(() => {
    setError(null);
    setLoading(true);
    setKey(prev => prev + 1); // Forzar recarga del visor
  }, [fileUrl]);

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden bg-muted/50" style={{ minHeight: '600px' }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 min-h-[600px]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-semibold mb-2">Error al cargar el PDF</p>
            <p className="text-sm text-muted-foreground mb-4 text-center">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                setKey(prev => prev + 1); // Forzar recarga
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="relative w-full h-full" style={{ minHeight: '600px' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando PDF...</p>
                </div>
              </div>
            )}
            <Viewer
              key={key}
              fileUrl={fileUrl}
              plugins={[defaultLayoutPluginInstance]}
              onDocumentLoad={() => {
                setLoading(false);
                setError(null);
              }}
              onLoadError={(error) => {
                console.error('[PDF Viewer] Error loading PDF:', error);
                setError('Error al cargar el PDF. Verifica que la URL sea válida.');
                setLoading(false);
              }}
            />
          </div>
        )}
      </Worker>
    </div>
  );
}

