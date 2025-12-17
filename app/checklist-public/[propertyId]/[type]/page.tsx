"use client";

import { useEffect, useState } from "react";
import { getChecklistPDFUrl } from "@/lib/pdf/checklist-pdf-storage";

/**
 * Página pública para compartir checklists
 * URL formato: /public/checklist/[propertyId]/[type]
 * Ejemplo: /public/checklist/SP-V4P-KDH-005658/final
 */
export default function PublicChecklistPage({
  params,
}: {
  params: Promise<{ propertyId: string; type: string }>;
}) {
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHTML = async () => {
      try {
        const resolvedParams = await params;
        const { propertyId, type } = resolvedParams;

        if (!propertyId || !type) {
          setError("Parámetros inválidos");
          setLoading(false);
          return;
        }

        // Validar que el tipo sea válido
        const checklistType = type === 'initial' ? 'reno_initial' : 
                             type === 'final' ? 'reno_final' : null;

        if (!checklistType) {
          setError("Tipo de checklist inválido. Debe ser 'initial' o 'final'");
          setLoading(false);
          return;
        }

        // Obtener la URL del HTML
        const url = await getChecklistPDFUrl(propertyId, checklistType);
        
        if (url) {
          setHtmlUrl(url);
        } else {
          setError("Checklist no encontrado. El checklist puede no haber sido finalizado aún.");
        }
      } catch (err: any) {
        console.error('Error loading HTML:', err);
        setError(err.message || "Error al cargar el checklist");
      } finally {
        setLoading(false);
      }
    };

    loadHTML();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlUrl) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold">Checklist no disponible</h1>
          <p className="text-muted-foreground">{error || "Checklist no encontrado"}</p>
          <p className="text-sm text-muted-foreground mt-4">
            El checklist puede no haber sido finalizado aún o la URL es incorrecta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
      {/* HTML Viewer - Pantalla completa */}
      <div className="h-screen w-screen">
        <iframe
          src={`/api/proxy-html?url=${encodeURIComponent(htmlUrl)}`}
          className="w-full h-full border-0"
          title="Checklist de Inspección"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}

