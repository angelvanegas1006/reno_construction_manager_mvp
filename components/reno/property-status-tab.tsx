"use client";

import { Calendar, CheckCircle2, Clock, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ChecklistHistory {
  id: string;
  inspection_type: 'initial' | 'final';
  inspection_status: string;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
}

interface PropertyStatusTabProps {
  propertyId: string;
}

/**
 * PropertyStatusTab Component
 * 
 * Muestra el historial de checklists realizados para la propiedad
 */
export function PropertyStatusTab({ propertyId }: PropertyStatusTabProps) {
  const { t, language } = useI18n();
  const [checklists, setChecklists] = useState<ChecklistHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChecklists = async () => {
      if (!propertyId) return;

      const supabase = createClient();
      
      let rawData: any[] | null = null;
      
      // Try to fetch with inspection_type first
      const { data, error } = await supabase
        .from('property_inspections')
        .select('id, inspection_type, inspection_status, created_at, completed_at, created_by')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      // If the error is that the column doesn't exist, try without inspection_type
      if (error && (error.code === '42883' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn('Campo inspection_type no existe aún, buscando sin filtro:', error);
        const { data: allData, error: allError } = await supabase
          .from('property_inspections')
          .select('id, inspection_status, created_at, completed_at, created_by')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false });
        
        if (allError) {
          console.error('Error fetching checklists:', allError);
          setChecklists([]);
          setLoading(false);
          return;
        }
        rawData = allData;
      } else if (error) {
        console.error('Error fetching checklists:', error);
        setChecklists([]);
        setLoading(false);
        return;
      } else {
        rawData = data;
      }

      // Type guard to ensure data is an array and handle potential type issues
      if (Array.isArray(rawData)) {
        // Convert to ChecklistHistory format, defaulting inspection_type if missing
        const checklists: ChecklistHistory[] = rawData.map((item: any) => ({
          id: item.id,
          inspection_type: item.inspection_type || 'initial', // Default to 'initial' if missing
          inspection_status: item.inspection_status || 'in_progress',
          created_at: item.created_at,
          completed_at: item.completed_at,
          created_by: item.created_by,
        }));
        setChecklists(checklists);
      } else {
        setChecklists([]);
      }
      setLoading(false);
    };

    fetchChecklists();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground">{t.propertyStatusTab.loadingHistory}</p>
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground">{t.propertyStatusTab.noChecklistsYet}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const isCompleted = checklist.completed_at !== null;
        const checklistType = checklist.inspection_type === 'initial' 
          ? t.kanban.initialCheck 
          : t.kanban.finalCheck;
        const locale = language === "es" ? "es-ES" : "en-US";
        const createdDate = new Date(checklist.created_at).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const completedDate = checklist.completed_at
          ? new Date(checklist.completed_at).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null;

        return (
          <div
            key={checklist.id}
            className="bg-card bg-card rounded-lg border p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{checklistType}</h3>
                  <span
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      isCompleted
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    )}
                  >
                    {isCompleted ? t.propertyStatusTab.completed : t.propertyStatusTab.inProgress}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{t.propertyStatusTab.created}: {createdDate}</span>
                  </div>
                  {completedDate && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t.propertyStatusTab.completedOn}: {completedDate}</span>
                    </div>
                  )}
                  {checklist.created_by && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{t.propertyStatusTab.createdBy}: {checklist.created_by}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                onClick={() => {
                  // Navigate to checklist view
                  window.location.href = `/reno/construction-manager/property/${propertyId}/checklist?type=${checklist.inspection_type}`;
                }}
              >
                {t.propertyStatusTab.viewDetails} →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

