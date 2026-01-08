"use client";

import { Calendar, CheckCircle2, Clock, FileText, Download, ExternalLink, Image, Mail, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";
import { extractNameFromEmail } from "@/lib/supabase/user-name-utils";

interface ChecklistHistory {
  id: string;
  inspection_type: 'initial' | 'final';
  inspection_status: string;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  pdf_url: string | null;
}

interface ProgressSaveHistory {
  saveDate: string;
  updates: Array<{
    id: string;
    category_id: string;
    category_name: string;
    category_text: string | null;
    photos: string[];
    videos: string[];
    notes: string | null;
    previous_percentage: number | null;
    new_percentage: number;
    created_by: string | null;
  }>;
}

interface ClientUpdateEmail {
  id: string;
  html_content: string;
  client_email: string | null;
  subject: string | null;
  sent_at: string;
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
  const [progressHistory, setProgressHistory] = useState<ProgressSaveHistory[]>([]);
  const [clientUpdates, setClientUpdates] = useState<ClientUpdateEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const { property: supabaseProperty } = useSupabaseProperty(propertyId);

  // Calcular fase actual de la propiedad de forma estable
  const currentPhase = supabaseProperty 
    ? getPropertyRenoPhaseFromSupabase(supabaseProperty) 
    : null;

  // Verificar si la fase es "reno-in-progress" o posterior (para mostrar historial)
  const shouldShowProgressHistory = (() => {
    if (!currentPhase) return false;
    const phasesWithHistory = [
      'reno-in-progress', // Incluir también reno-in-progress
      'furnishing',
      'final-check',
      'cleaning',
      'furnishing-cleaning',
      'reno-fixes',
      'done'
    ];
    return phasesWithHistory.includes(currentPhase);
  })();

  useEffect(() => {
    const fetchChecklists = async () => {
      if (!propertyId) return;

      const supabase = createClient();
      
      let rawData: any[] | null = null;
      
      // Try to fetch with inspection_type first
      let { data, error } = await supabase
        .from('property_inspections')
        .select('id, inspection_type, inspection_status, created_at, completed_at, created_by, pdf_url')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      // If the error is that the column doesn't exist, try without inspection_type
      if (error && (error.code === '42883' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn('Campo inspection_type no existe aún, buscando sin filtro:', error);
        const { data: allData, error: allError } = await supabase
          .from('property_inspections')
          .select('id, inspection_status, created_at, completed_at, created_by, pdf_url')
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
      
      // Log para debugging
      if (rawData && rawData.length > 0) {
        console.log('[PropertyStatusTab] Fetched inspections:', rawData.map(item => ({
          id: item.id,
          inspection_type: item.inspection_type,
          inspection_status: item.inspection_status,
          completed_at: item.completed_at,
          created_at: item.created_at,
        })));
      }

      // Type guard to ensure data is an array and handle potential type issues
      if (Array.isArray(rawData)) {
        // Primero, identificar cuáles tienen inspection_type válido y cuáles no
        const validInspections = rawData.filter((item: any) => 
          item.inspection_type === 'initial' || item.inspection_type === 'final'
        );
        const invalidInspections = rawData.filter((item: any) => 
          !item.inspection_type || (item.inspection_type !== 'initial' && item.inspection_type !== 'final')
        );
        
        // Si hay inspecciones sin tipo válido, intentar inferirlas
        if (invalidInspections.length > 0) {
          console.warn('[PropertyStatusTab] ⚠️ Inspecciones sin inspection_type válido:', {
            count: invalidInspections.length,
            currentPhase,
            totalInspections: rawData.length,
            validInspections: validInspections.length,
          });
        }
        
        // Convert to ChecklistHistory format, defaulting inspection_type if missing
        const checklists: ChecklistHistory[] = rawData.map((item: any, index: number) => {
          // IMPORTANTE: Si inspection_type existe pero está vacío o es null, tratarlo como faltante
          const hasInspectionType = item.inspection_type && 
            (item.inspection_type === 'initial' || item.inspection_type === 'final');
          
          // Si falta inspection_type o es inválido, intentar inferirlo de forma más inteligente
          let inferredType: 'initial' | 'final' = 'initial';
          if (!hasInspectionType) {
            // Estrategia de inferencia mejorada:
            // 1. Si la propiedad está en cleaning/final-check, la más reciente probablemente es 'final'
            // 2. Si hay múltiples inspecciones, verificar si alguna ya tiene tipo válido
            // 3. Si hay dos inspecciones y una tiene completed_at más reciente, podría ser 'final'
            if (currentPhase === 'cleaning' || currentPhase === 'final-check') {
              // Si estamos en cleaning o final-check, la inspección más reciente probablemente es final
              inferredType = index === 0 ? 'final' : 'initial';
            } else if (rawData.length === 2) {
              // Si hay exactamente 2 inspecciones, la más reciente (index 0) probablemente es 'final'
              // y la más antigua (index 1) probablemente es 'initial'
              inferredType = index === 0 ? 'final' : 'initial';
            } else if (rawData.length > 1) {
              // Si hay más de 2, usar la fase actual como guía
              // Si la fase indica que debería haber un final check completado, la más reciente es 'final'
              if (currentPhase && (currentPhase.includes('final') || currentPhase.includes('cleaning'))) {
                inferredType = index === 0 ? 'final' : 'initial';
              } else {
                // Por defecto, la más reciente es 'initial' si no hay más contexto
                inferredType = 'initial';
              }
            }
            
            console.warn('[PropertyStatusTab] ⚠️ Inspection sin inspection_type válido, inferido:', {
              id: item.id,
              inspection_type_original: item.inspection_type,
              inspection_type_inferred: inferredType,
              index,
              currentPhase,
              totalInspections: rawData.length,
              completed_at: item.completed_at,
            });
          }
          
          const finalType = hasInspectionType ? item.inspection_type : inferredType;
          
          // Log para debugging del tipo final asignado
          if (finalType === 'final') {
            console.log('[PropertyStatusTab] ✅ Final checklist identificado:', {
              id: item.id,
              inspection_type_original: item.inspection_type,
              inspection_type_final: finalType,
              was_inferred: !hasInspectionType,
              completed_at: item.completed_at,
            });
          }
          
          return {
            id: item.id,
            inspection_type: finalType as 'initial' | 'final',
            inspection_status: item.inspection_status || 'in_progress',
            created_at: item.created_at,
            completed_at: item.completed_at,
            created_by: item.created_by,
            pdf_url: item.pdf_url || null,
          };
        });
        
        // Log final de los checklists procesados
        console.log('[PropertyStatusTab] ✅ Checklists procesados:', checklists.map(c => ({
          id: c.id,
          inspection_type: c.inspection_type,
          isCompleted: c.completed_at !== null || c.inspection_status === 'completed',
        })));
        
        setChecklists(checklists);
        
        // Obtener nombres de usuarios únicos
        const uniqueUserIds = [...new Set(checklists.map(c => c.created_by).filter(Boolean))] as string[];
        if (uniqueUserIds.length > 0) {
          const namesMap: Record<string, string> = {};
          
          // Obtener usuarios desde la API
          try {
            const response = await fetch('/api/users');
            if (response.ok) {
              const { users } = await response.json();
              const usersMap = new Map(users.map((u: any) => [u.id, u]));
              
              uniqueUserIds.forEach(userId => {
                const user = usersMap.get(userId) as any;
                if (user) {
                  // Intentar obtener nombre de user_metadata, sino del email
                  const name = (user.name as string | undefined) || 
                               user.user_metadata?.name || 
                               user.user_metadata?.full_name ||
                               (user.email ? extractNameFromEmail(user.email) : null) ||
                               userId;
                  namesMap[userId] = name;
                } else {
                  // Si no se encuentra, usar el ID como fallback
                  namesMap[userId] = userId;
                }
              });
              
              setUserNames(namesMap);
            }
          } catch (error) {
            console.error('[PropertyStatusTab] Error fetching user names:', error);
            // Si falla, usar IDs como fallback
            uniqueUserIds.forEach(userId => {
              namesMap[userId] = userId;
            });
            setUserNames(namesMap);
          }
        }
      } else {
        setChecklists([]);
      }
      setLoading(false);
    };

    fetchChecklists();
  }, [propertyId, currentPhase]);

  // Cargar historial de progreso y updates enviados (solo si fase >= reno-in-progress)
  useEffect(() => {
    const fetchProgressHistory = async () => {
      if (!propertyId || !shouldShowProgressHistory) {
        setProgressHistory([]);
        setClientUpdates([]);
        return;
      }

      const supabase = createClient();

      // 1. Cargar category_updates
      const { data: categoryUpdates, error: updatesError } = await supabase
        .from('category_updates')
        .select('id, category_id, category_text, photos, videos, notes, previous_percentage, new_percentage, created_at, created_by')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      // Obtener nombres de categorías
      const categoryIds = categoryUpdates ? [...new Set(categoryUpdates.map((u: any) => u.category_id))] : [];
      const categoryNamesMap: Record<string, string> = {};
      
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('property_dynamic_categories')
          .select('id, category_name')
          .in('id', categoryIds);
        
        if (categories) {
          categories.forEach((cat: any) => {
            categoryNamesMap[cat.id] = cat.category_name;
          });
        }
      }

      if (updatesError) {
        console.error('[PropertyStatusTab] Error fetching category updates:', updatesError);
        setProgressHistory([]);
      } else if (categoryUpdates) {
        // Agrupar por fecha (mismo día = mismo guardado)
        const groupedByDate = new Map<string, ProgressSaveHistory['updates']>();
        
        categoryUpdates.forEach((update: any) => {
          const date = new Date(update.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
          if (!groupedByDate.has(date)) {
            groupedByDate.set(date, []);
          }
          groupedByDate.get(date)!.push({
            id: update.id,
            category_id: update.category_id,
            category_name: categoryNamesMap[update.category_id] || 'Categoría desconocida',
            category_text: update.category_text,
            photos: update.photos || [],
            videos: update.videos || [],
            notes: update.notes,
            previous_percentage: update.previous_percentage,
            new_percentage: update.new_percentage,
            created_by: update.created_by,
          });
        });

        // Convertir a array y ordenar por fecha (más reciente primero)
        const history: ProgressSaveHistory[] = Array.from(groupedByDate.entries())
          .map(([saveDate, updates]) => ({
            saveDate,
            updates: updates.sort((a, b) => {
              // Ordenar updates dentro del mismo día por created_at
              const aTime = categoryUpdates.find((u: any) => u.id === a.id)?.created_at || '';
              const bTime = categoryUpdates.find((u: any) => u.id === b.id)?.created_at || '';
              return bTime.localeCompare(aTime);
            }),
          }))
          .sort((a, b) => b.saveDate.localeCompare(a.saveDate));

        setProgressHistory(history);
      }

      // 2. Cargar client_update_emails
      const { data: updateEmails, error: emailsError } = await supabase
        .from('client_update_emails')
        .select('id, html_content, client_email, subject, sent_at, created_by')
        .eq('property_id', propertyId)
        .order('sent_at', { ascending: false });

      if (emailsError) {
        console.error('[PropertyStatusTab] Error fetching client update emails:', emailsError);
        setClientUpdates([]);
      } else if (updateEmails) {
        setClientUpdates(updateEmails as ClientUpdateEmail[]);
      }

      // Actualizar nombres de usuarios si hay nuevos
      const allUserIds = [
        ...new Set([
          ...categoryUpdates?.map((u: any) => u.created_by).filter(Boolean) || [],
          ...updateEmails?.map((e: any) => e.created_by).filter(Boolean) || [],
        ])
      ] as string[];

      if (allUserIds.length > 0) {
        const newUserIds = allUserIds.filter(id => !userNames[id]);
        if (newUserIds.length > 0) {
          try {
            const response = await fetch('/api/users');
            if (response.ok) {
              const { users } = await response.json();
              const usersMap = new Map(users.map((u: any) => [u.id, u]));
              
              const newNames: Record<string, string> = {};
              newUserIds.forEach(userId => {
                const user = usersMap.get(userId) as any;
                if (user) {
                  const name = (user.name as string | undefined) || 
                               user.user_metadata?.name || 
                               user.user_metadata?.full_name ||
                               (user.email ? extractNameFromEmail(user.email) : null) ||
                               userId;
                  newNames[userId] = name;
                } else {
                  newNames[userId] = userId;
                }
              });
              
              setUserNames(prev => ({ ...prev, ...newNames }));
            }
          } catch (error) {
            console.error('[PropertyStatusTab] Error fetching user names:', error);
          }
        }
      }
    };

    fetchProgressHistory();
  }, [propertyId, shouldShowProgressHistory, userNames]);

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

  const locale = language === "es" ? "es-ES" : "en-US";

  return (
    <div className="space-y-4">
      {/* Checklists (siempre visible) */}
      {checklists.map((checklist) => {
        // Considerar completado si tiene completed_at O si inspection_status es 'completed'
        const isCompleted = checklist.completed_at !== null || checklist.inspection_status === 'completed';
        
        // Debug log para ver qué valores tiene
        if (checklist.inspection_type === 'final') {
          console.log('[PropertyStatusTab] Final checklist status:', {
            id: checklist.id,
            inspection_type: checklist.inspection_type,
            inspection_status: checklist.inspection_status,
            completed_at: checklist.completed_at,
            isCompleted,
          });
        }
        
        const checklistType = checklist.inspection_type === 'initial' 
          ? t.kanban.initialCheck 
          : t.kanban.finalCheck;
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
                      <span>{t.propertyStatusTab.createdBy}: {userNames[checklist.created_by] || checklist.created_by}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center">
                {isCompleted && (() => {
                  const linkType = checklist.inspection_type === 'initial' ? 'reno_initial' : 'reno_final';
                  const linkHref = `/reno/construction-manager/property/${propertyId}/checklist/pdf?type=${linkType}&from=status`;
                  
                  // Log para debugging del link generado
                  console.log('[PropertyStatusTab] 🔗 Generando link para checklist:', {
                    checklistId: checklist.id,
                    inspection_type: checklist.inspection_type,
                    linkType,
                    linkHref,
                    isCompleted,
                  });
                  
                  return (
                    <Link
                      href={linkHref}
                      className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Ver informe
                    </Link>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })}

      {/* Historial de progreso guardado (solo si fase >= reno-in-progress) */}
      {shouldShowProgressHistory && progressHistory.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">Historial de Progreso Guardado</h2>
          {progressHistory.map((save, index) => {
            const saveDate = new Date(save.saveDate).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <div key={index} className="bg-card rounded-lg border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">{saveDate}</h3>
                </div>

                <div className="space-y-4">
                  {save.updates.map((update) => (
                    <div key={update.id} className="border-l-2 border-primary/30 pl-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{update.category_name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {update.previous_percentage !== null 
                            ? `${update.previous_percentage}% → ${update.new_percentage}%`
                            : `${update.new_percentage}%`
                          }
                        </span>
                      </div>

                      {update.category_text && (
                        <p className="text-sm text-muted-foreground">{update.category_text}</p>
                      )}

                      {update.notes && (
                        <p className="text-sm text-muted-foreground italic">Nota: {update.notes}</p>
                      )}

                      {update.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {update.photos.map((photoUrl, photoIndex) => (
                            <a
                              key={photoIndex}
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group"
                            >
                              <img
                                src={photoUrl}
                                alt={`Foto ${photoIndex + 1}`}
                                className="w-20 h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                                <Image className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historial de updates enviados a cliente (solo si fase >= reno-in-progress) */}
      {shouldShowProgressHistory && clientUpdates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">Updates Enviados a Cliente</h2>
          {clientUpdates.map((update) => {
            const sentDate = new Date(update.sent_at).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={update.id} className="bg-card rounded-lg border p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {update.subject || 'Update de Progreso'}
                      </h3>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Enviado: {sentDate}</span>
                      </div>
                      {update.client_email && (
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span>Para: {update.client_email}</span>
                        </div>
                      )}
                      {update.created_by && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Enviado por: {userNames[update.created_by] || update.created_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <Link
                      href={`/reno/construction-manager/property/${propertyId}/update-email/${update.id}`}
                      target="_blank"
                      className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Ver email
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

