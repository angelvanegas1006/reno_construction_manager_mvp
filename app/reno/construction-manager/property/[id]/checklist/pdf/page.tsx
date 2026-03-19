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

  const handleBack = () => {
    if (from === 'status') {
      // Si viene desde el tab de estado, volver allí
      router.push(`/reno/construction-manager/property/${propertyId}?tab=estado`);
    } else {
      // Si viene desde otro lugar (kanban, home, etc.), usar router.back() para volver a la página anterior
      router.back();
    }
  };

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
        
        console.log('[ChecklistPDFViewer] 🔍 Buscando inspección:', {
          propertyId,
          checklistType,
          inspectionType,
        });
        
        // Buscar la inspección correcta - IMPORTANTE: incluir inspection_type en el select para validar
        const { data: inspection, error: inspectionError } = await supabase
          .from('property_inspections')
          .select('id, inspection_type, pdf_url')
          .eq('property_id', propertyId)
          .eq('inspection_type', inspectionType)
          .eq('inspection_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar errores si no existe

        // Si hay un error relacionado con la columna inspection_type, intentar sin ese filtro
        if (inspectionError && (inspectionError.code === '42883' || inspectionError.message?.includes('column') || inspectionError.message?.includes('does not exist'))) {
          console.warn('[ChecklistPDFViewer] ⚠️ Campo inspection_type no existe, buscando sin filtro:', inspectionError.message);
          
          // Buscar todas las inspecciones completadas sin seleccionar inspection_type (puede no existir)
          // Intentar primero con inspection_type, si falla, intentar sin él
          type InspectionItem = { id: string; inspection_type?: string; pdf_url?: string };
          let allInspections: InspectionItem[] = [];
          
          // Intentar con inspection_type primero
          const { data: inspectionsWithType, error: errorWithType } = await supabase
            .from('property_inspections')
            .select('id, inspection_type, pdf_url')
            .eq('property_id', propertyId)
            .eq('inspection_status', 'completed')
            .order('completed_at', { ascending: false });
          
          if (errorWithType && (errorWithType.message?.includes('column') || errorWithType.message?.includes('does not exist'))) {
            // Si falla porque inspection_type no existe, intentar sin él
            console.warn('[ChecklistPDFViewer] ⚠️ inspection_type no existe en select, intentando sin él');
            const { data: inspectionsWithoutType, error: errorWithoutType } = await supabase
              .from('property_inspections')
              .select('id, pdf_url')
              .eq('property_id', propertyId)
              .eq('inspection_status', 'completed')
              .order('completed_at', { ascending: false });
            
            if (errorWithoutType) {
              console.error('[ChecklistPDFViewer] ❌ Error buscando inspecciones:', errorWithoutType);
              throw errorWithoutType;
            }
            
            // Mapear los resultados sin inspection_type
            if (inspectionsWithoutType && Array.isArray(inspectionsWithoutType)) {
              allInspections = inspectionsWithoutType.map((insp: any): InspectionItem => ({
                id: String(insp.id),
                pdf_url: insp.pdf_url ? String(insp.pdf_url) : undefined,
                // inspection_type no está disponible
              }));
            }
          } else {
            if (errorWithType) {
              console.error('[ChecklistPDFViewer] ❌ Error buscando inspecciones:', errorWithType);
              throw errorWithType;
            }
            // Solo asignar si no hay error y es un array válido
            if (inspectionsWithType && Array.isArray(inspectionsWithType)) {
              allInspections = inspectionsWithType.map((insp: any): InspectionItem => ({
                id: String(insp.id),
                inspection_type: insp.inspection_type ? String(insp.inspection_type) : undefined,
                pdf_url: insp.pdf_url ? String(insp.pdf_url) : undefined,
              }));
            }
          }
          
          // Verificar que allInspections es un array válido
          if (Array.isArray(allInspections) && allInspections.length > 0) {
            // Filtrar manualmente por inspection_type si existe
            const matchingInspection = allInspections.find((insp) => {
              // Si tiene inspection_type, verificar que coincida
              if (insp.inspection_type) {
                return insp.inspection_type === inspectionType;
              }
              // Si no tiene inspection_type, no usar (no podemos determinar el tipo)
              return false;
            });
            
            if (matchingInspection && matchingInspection.pdf_url) {
              const pdfUrl = matchingInspection.pdf_url;
              if (typeof pdfUrl === 'string' && pdfUrl.startsWith('http')) {
                console.log('[ChecklistPDFViewer] ✅ Inspección encontrada (sin filtro de BD):', {
                  id: matchingInspection.id,
                  inspection_type: matchingInspection.inspection_type,
                });
                setHtmlUrl(pdfUrl);
                setLoading(false);
                return;
              }
            }
          }
        } else if (inspectionError && inspectionError.code !== 'PGRST116') {
          // PGRST116 es "no rows returned", que es válido si no existe la inspección
          console.error('[ChecklistPDFViewer] ❌ Error buscando inspección:', inspectionError);
          throw inspectionError;
        }

        // Validar que la inspección obtenida tenga el tipo correcto
        // Verificar que inspection es un objeto válido y no un error
        if (inspection && typeof inspection === 'object' && 'id' in inspection) {
          // Type assertion para asegurar que TypeScript entienda el tipo correcto
          const inspectionData = inspection as { id: string; inspection_type?: string; pdf_url?: string };
          
          // IMPORTANTE: Verificar que el inspection_type coincida antes de usar el pdf_url
          if (inspectionData.inspection_type && inspectionData.inspection_type !== inspectionType) {
            console.error('[ChecklistPDFViewer] ❌ Inspección con tipo incorrecto:', {
              esperado: inspectionType,
              obtenido: inspectionData.inspection_type,
              id: inspectionData.id,
            });
            // No usar esta inspección, continuar con el fallback
          } else if (inspectionData.pdf_url) {
          // Validar que la URL sea completa
            const url = inspectionData.pdf_url;
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
            console.log('[ChecklistPDFViewer] ✅ URL válida desde BD:', {
              inspection_type: inspectionData.inspection_type,
              url: url.substring(0, 80) + '...',
            });
          setHtmlUrl(url);
            setLoading(false);
            return;
          }
        }
        
        // Si no se encontró la inspección correcta, intentar construir URL desde storage
        console.log('[ChecklistPDFViewer] ⚠️ No se encontró inspección con pdf_url, intentando desde storage...');
        
          // Si no existe en property_inspections, intentar construir URL desde storage
          let url = await getChecklistPDFUrl(propertyId, checklistType);
          
          if (!url) {
            // Si no existe el HTML, intentar regenerarlo
            console.log('[ChecklistPDFViewer] HTML no encontrado, intentando regenerar...');
            try {
              const regenerateResponse = await fetch('/api/regenerate-checklist-html', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  propertyId,
                  checklistType,
                }),
              });

              if (regenerateResponse.ok) {
                const regenerateData = await regenerateResponse.json();
                url = regenerateData.storageUrl;
                console.log('[ChecklistPDFViewer] ✅ HTML regenerado exitosamente');
              } else {
                console.warn('[ChecklistPDFViewer] No se pudo regenerar el HTML');
              }
            } catch (regenerateError) {
              console.error('[ChecklistPDFViewer] Error al regenerar HTML:', regenerateError);
            }
          }
          
          if (url) {
            setHtmlUrl(url);
          } else {
            setError("Checklist no encontrado. El checklist puede no haber sido finalizado aún o no se pudo generar el informe.");
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
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlUrl) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-danger dark:text-danger">{error || "Checklist no encontrado"}</p>
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
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card dark:bg-v-gray-900 border-b p-4 flex items-center justify-between">
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
          href={`/api/proxy-html?url=${encodeURIComponent(htmlUrl)}`}
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

