"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getChecklistPDFUrl } from "@/lib/pdf/checklist-pdf-storage";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ChecklistPDFViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = params?.id as string;
  const checklistType = searchParams?.get('type') as 'reno_initial' | 'reno_final' | null;
  const from = searchParams?.get('from') as string | null;
  
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHTML = async () => {
      if (!propertyId || !checklistType) {
        setError("Faltan parámetros necesarios");
        setLoading(false);
        return;
      }

      try {
        // Primero intentar obtener desde property_inspections (más confiable)
        const supabase = createClient();
        const inspectionType = checklistType === 'reno_initial' ? 'initial' : 'final';
        
        const { data: inspection } = await supabase
          .from('property_inspections')
          .select('pdf_url')
          .eq('property_id', propertyId)
          .eq('inspection_type', inspectionType)
          .eq('inspection_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (inspection?.pdf_url) {
          // Validar que la URL sea completa
          const url = inspection.pdf_url;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            console.error('[ChecklistPDFViewer] URL inválida desde BD:', url);
            setError(`URL inválida almacenada en la base de datos: ${url.substring(0, 50)}...`);
            setLoading(false);
            return;
          }
          // Verificar que la URL no esté truncada (debe contener el dominio completo)
          if (!url.includes('.supabase.co')) {
            console.error('[ChecklistPDFViewer] URL truncada detectada:', url);
            setError(`URL truncada detectada. URL completa requerida.`);
            setLoading(false);
            return;
          }
          console.log('[ChecklistPDFViewer] ✅ URL válida desde BD:', url.substring(0, 80) + '...');
          setHtmlUrl(url);
        } else {
          // Si no existe en property_inspections, intentar construir URL desde storage
          const url = await getChecklistPDFUrl(propertyId, checklistType);
          
          if (url) {
            setHtmlUrl(url);
          } else {
            setError("Checklist no encontrado. El checklist puede no haber sido finalizado aún.");
          }
        }
      } catch (err: any) {
        console.error('Error loading HTML:', err);
        setError(err.message || "Error al cargar el checklist");
      } finally {
        setLoading(false);
      }
    };

    loadHTML();
  }, [propertyId, checklistType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlUrl) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">{error || "Checklist no encontrado"}</p>
          <Button 
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card dark:bg-[var(--prophero-gray-900)] border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-lg font-semibold">
            Checklist {checklistType === 'reno_initial' ? 'Inicial' : 'Final'}
          </h1>
        </div>
        <a
          href={htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en nueva pestaña
        </a>
      </div>

      {/* HTML Viewer */}
      <div className="h-[calc(100vh-73px)]">
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

