"use client";

import { useState } from "react";
import { CheckCircle2, Clock, User, Building2, MessageSquare, ClipboardList, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";
import { PropertyRemindersSection } from "@/components/reno/property-reminders-section";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePropertyComments } from "@/hooks/usePropertyComments";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

interface PropertyStatusSidebarProps {
  property: Property;
  supabaseProperty?: any;
  propertyId?: string | null;
  progress?: number; // Progress percentage (0-100)
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
  progress = 0,
  pendingItems = [],
}: PropertyStatusSidebarProps) {
  const { t, language } = useI18n();
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState(0);

  // Extract data from Supabase
  const renoPhase = supabaseProperty?.reno_phase || "upcoming-settlements";
  const technicalConstructor = supabaseProperty?.['Technical construction'] || supabaseProperty?.technical_construction;
  const responsibleOwner = supabaseProperty?.responsible_owner;
  const createdAt = supabaseProperty?.created_at || property.createdAt;

  // Check if property has checklist
  useEffect(() => {
    const checkChecklist = async () => {
      if (!propertyId) return;
      
      const supabase = createClient();
      const checklistType = renoPhase === "final-check" ? "final" : "initial";
      
      if (renoPhase === "initial-check" || renoPhase === "final-check") {
        const { data, error } = await supabase
          .from("property_inspections")
          .select("id, inspection_status, completed_at")
          .eq("property_id", propertyId)
          .eq("inspection_type", checklistType)
          .single();

        if (data && !error) {
          setHasChecklist(true);
          // Calculate progress (simplified - could be improved)
          if (data.completed_at) {
            setChecklistProgress(100);
          } else {
            setChecklistProgress(25); // Placeholder
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
      "reno-in-progress": t.kanban.renoInProgress,
      "final-check": t.kanban.finalCheck,
      "done": t.kanban.done,
    };
    return phaseLabels[renoPhase] || renoPhase;
  };

  const getChecklistLabel = () => {
    return renoPhase === "final-check" ? t.kanban.finalCheck : t.kanban.initialCheck;
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

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{t.propertySidebar.dataCompleted}</span>
                <span className="text-xs font-medium">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--prophero-gray-200)] dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t.propertySidebar.pending}
            </h4>
            <div className="space-y-2">
              {pendingItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={cn(
                    "w-full text-left flex items-center justify-between p-2 rounded-md text-sm",
                    item.onClick
                      ? "hover:bg-accent hover:text-accent-foreground transition-colors"
                      : "text-muted-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  {item.onClick && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Roles */}
        <div className="space-y-4">
          {technicalConstructor && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t.propertySidebar.technicalConstructor}
              </h4>
              <p className="text-sm text-foreground">{technicalConstructor}</p>
            </div>
          )}

          {responsibleOwner && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {t.propertySidebar.siteManager}
              </h4>
              <p className="text-sm text-foreground">{responsibleOwner}</p>
            </div>
          )}
        </div>

        {/* Checklist Section - Collapsable */}
        {(renoPhase === "initial-check" || renoPhase === "final-check") && (
          <div className="border-t pt-4">
            <button
              onClick={() => setChecklistExpanded(!checklistExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold mb-3 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                {getChecklistLabel()}
                {hasChecklist && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {checklistProgress}%
                  </span>
                )}
              </div>
              {checklistExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {checklistExpanded && (
              <div className="space-y-3">
                {hasChecklist ? (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t.propertySidebar.checklistInProgress}
                    </div>
                    <div className="w-full h-2 bg-[var(--prophero-gray-200)] dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (propertyId) {
                          window.location.href = `/reno/construction-manager/property/${propertyId}/checklist`;
                        }
                      }}
                      className="w-full text-left p-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {t.propertySidebar.continueChecklist} →
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground mb-2">
                    {t.propertySidebar.noChecklistStarted}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (propertyId) {
                      window.location.href = `/reno/construction-manager/property/${propertyId}/checklist`;
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {hasChecklist ? t.propertySidebar.openChecklist : t.propertySidebar.startChecklist}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reminders Section - Collapsable */}
        {propertyId && (
          <Collapsible open={true} onOpenChange={() => {}} className="space-y-3 pt-4 border-t">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full cursor-pointer py-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  {t.propertySidebar.reminders}
                </h4>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="max-h-60 overflow-y-auto">
                <PropertyRemindersSection propertyId={propertyId} limit={3} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Comments Section - Collapsable */}
        {propertyId && (
          <div className="border-t pt-4">
            <button
              onClick={() => setCommentsExpanded(!commentsExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold mb-3 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {t.propertySidebar.comments}
              </div>
              {commentsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {commentsExpanded && (
              <div className="max-h-[400px] overflow-y-auto">
                <PropertyCommentsSection propertyId={propertyId} property={property} supabaseProperty={supabaseProperty} />
              </div>
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
