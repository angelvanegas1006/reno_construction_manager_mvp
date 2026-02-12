"use client";

import { useState } from "react";
import { CheckCircle2, Clock, User, Building2, MessageSquare, ClipboardList, ChevronDown, ChevronUp, Bell, Flag, Wrench, Folder, Key } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";
import { PropertyRemindersSection } from "@/components/reno/property-reminders-section";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePropertyComments } from "@/hooks/usePropertyComments";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { isDelayedWork } from "@/lib/property-sorting";

interface PropertyStatusSidebarProps {
  property: Property;
  supabaseProperty?: any;
  propertyId?: string | null;
  pendingItems?: Array<{
    label: string;
    onClick?: () => void;
  }>;
}

/**
 * PropertyStatusSidebar Component
 * 
 * Sidebar derecho expandible con:
 * - Estado de revisión/progreso
 * - Items pendientes
 * - Reno Constructor asignado
 * - Jefe de Obra asignado
 * - Comentarios (colapsable)
 * - Checklist (colapsable, solo si aplica)
 */
export function PropertyStatusSidebar({
  property,
  supabaseProperty,
  propertyId,
  pendingItems = [],
}: PropertyStatusSidebarProps) {
  const { t, language } = useI18n();
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState(0);

  // Extract data from Supabase
  const renoPhase = supabaseProperty?.reno_phase || property.renoPhase || "upcoming-settlements";
  const technicalConstructor = supabaseProperty?.['Technical construction'] || supabaseProperty?.technical_construction;
  const responsibleOwner = supabaseProperty?.responsible_owner;
  const renovatorName = supabaseProperty?.['Renovator name'] || property.renovador;
  const renoType = property.renoType || supabaseProperty?.reno_type;
  const keysLocation = supabaseProperty?.keys_location;
  const createdAt = supabaseProperty?.created_at || property.createdAt;
  const driveFolderUrl = supabaseProperty?.drive_folder_url;
  
  // Get days based on phase
  const daysToVisit = property.daysToVisit;
  const daysToStartRenoSinceRSD = property.daysToStartRenoSinceRSD;
  const renoDuration = property.renoDuration;
  const daysToPropertyReady = property.daysToPropertyReady;
  
  // Check if property is delayed
  const isDelayed = isDelayedWork(property, renoPhase);
  
  // Get the appropriate days label and value based on phase
  const getDaysInfo = () => {
    if ((renoPhase === "initial-check" || renoPhase === "upcoming-settlements") && daysToVisit !== null && daysToVisit !== undefined) {
      return { label: "Días para visitar", value: daysToVisit };
    }
    if ((renoPhase === "reno-budget-renovator" || renoPhase === "reno-budget-client" || renoPhase === "reno-budget-start") && 
        daysToStartRenoSinceRSD !== null && daysToStartRenoSinceRSD !== undefined) {
      return { label: "Días desde la firma", value: daysToStartRenoSinceRSD };
    }
    if (renoPhase === "reno-in-progress" && renoDuration !== null && renoDuration !== undefined) {
      return { label: "Duración de la obra", value: renoDuration };
    }
    if ((renoPhase === "furnishing" || renoPhase === "cleaning") && daysToPropertyReady !== null && daysToPropertyReady !== undefined) {
      return { label: "Días para propiedad lista", value: daysToPropertyReady };
    }
    return null;
  };
  
  const daysInfo = getDaysInfo();

  // Check if property has checklist
  useEffect(() => {
    const checkChecklist = async () => {
      if (!propertyId) return;
      
      const supabase = createClient();
      const checklistType = (renoPhase === "final-check" || renoPhase === "pendiente-suministros") ? "final" : "initial";
      
      if (renoPhase === "initial-check" || renoPhase === "final-check" || renoPhase === "pendiente-suministros") {
        // Try to fetch with inspection_type first
        let { data, error } = await supabase
          .from("property_inspections")
          .select("id, inspection_status, completed_at")
          .eq("property_id", propertyId)
          .eq("inspection_type", checklistType)
          .single();

        // Handle errors: 406 (Not Acceptable) or column doesn't exist - try without inspection_type
        if (error && (
          error.code === '42883' || 
          error.message?.includes('column') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('406') ||
          error.code === 'PGRST116'
        )) {
          // Try without inspection_type filter
          const { data: allData, error: allError } = await supabase
            .from("property_inspections")
            .select("id, inspection_status, completed_at")
            .eq("property_id", propertyId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (allError && allError.code !== 'PGRST116') {
            // Silently fail - checklist might not exist yet
            return;
          }
          data = allData;
          error = null;
        } else if (error && error.code !== 'PGRST116') {
          // Silently fail for other errors
          return;
        }

        if (data && !error) {
          setHasChecklist(true);
          // Only show progress if checklist is completed
          if (data.completed_at) {
            setChecklistProgress(100);
          } else {
            // Don't show progress if not completed - it's not accurate
            setChecklistProgress(0);
          }
        }
      }
    };

    checkChecklist();
  }, [propertyId, renoPhase]);

  // Format date
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  // Get phase label
  const getPhaseLabel = () => {
    const phaseLabels: Record<string, string> = {
      "upcoming-settlements": t.kanban.upcomingSettlements,
      "initial-check": t.kanban.initialCheck,
      "reno-budget-renovator": t.kanban.renoBudgetRenovator,
      "reno-budget-client": t.kanban.renoBudgetClient,
      "reno-budget-start": t.kanban.renoBudgetStart,
      "reno-in-progress": t.kanban.renoInProgress,
      "final-check": t.kanban.finalCheck,
      "pendiente-suministros": t.kanban.pendienteSuministros,
      "furnishing": t.kanban.furnishing || "Amoblamiento",
      "cleaning": t.kanban.cleaning || "Limpieza",
      "done": t.kanban.done,
    };
    return phaseLabels[renoPhase] || renoPhase;
  };

  const getChecklistLabel = () => {
    return (renoPhase === "final-check" || renoPhase === "pendiente-suministros") ? t.kanban.finalCheck : t.kanban.initialCheck;
  };

  return (
    <div className="w-full lg:w-80 border-l-0 lg:border-l bg-card dark:bg-[var(--prophero-gray-900)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Status Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {getPhaseLabel()}
            </span>
            <span className="text-xs text-muted-foreground">
              {formattedDate ? `${t.propertySidebar.createdOn} ${formattedDate}` : ""}
            </span>
          </div>
        </div>

        {/* Renovator Name */}
        {renovatorName && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Reformista
            </h4>
            <p className="text-sm text-foreground">{renovatorName}</p>
          </div>
        )}

        {/* Responsible Owner */}
        {responsibleOwner && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Analista de reno
            </h4>
            <p className="text-sm text-foreground">{responsibleOwner}</p>
          </div>
        )}

        {/* Tipo de Reforma */}
        {renoType && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Tipo de reforma
            </h4>
            <p className="text-sm text-foreground">{renoType}</p>
          </div>
        )}

        {/* Ubicación de las llaves */}
        {keysLocation && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              Ubicación de las llaves
            </h4>
            <p className="text-sm text-foreground">{keysLocation}</p>
          </div>
        )}

        {/* Days Information with Delay Flag */}
        {daysInfo && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {daysInfo.label}
              </h4>
              {isDelayed && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  <Flag className="h-3 w-3" />
                  Atrasado
                </span>
              )}
            </div>
            <p className={cn(
              "text-sm font-medium",
              isDelayed ? "text-red-600 dark:text-red-400" : "text-foreground"
            )}>
              {daysInfo.value} días
            </p>
          </div>
        )}

        {/* Drive Folder Link */}
        {driveFolderUrl && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              Carpeta Drive
            </h4>
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Abrir carpeta
            </a>
          </div>
        )}

        {/* Notas Precheck - solo fase Reno in progress */}
        {renoPhase === "reno-in-progress" && (supabaseProperty?.reno_precheck_comments || (supabaseProperty?.reno_precheck_checks && typeof supabaseProperty.reno_precheck_checks === "object" && (Object.keys((supabaseProperty.reno_precheck_checks as any).categoryChecks || {}).length > 0 || Object.keys((supabaseProperty.reno_precheck_checks as any).itemChecks || {}).length > 0))) && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Notas Precheck
            </h4>
            {supabaseProperty?.reno_precheck_comments ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{supabaseProperty.reno_precheck_comments}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Precheck guardado (sin comentarios).</p>
            )}
          </div>
        )}

        {/* Property Creation Date */}
        {formattedDate && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t.propertySidebar.propertyCreatedOn} {formattedDate}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
