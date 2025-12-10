"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Property } from "@/lib/property-storage";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useRouter } from "next/navigation";
import { TodoWidgetModal } from "./todo-widget-modal";
import { Badge } from "@/components/ui/badge";

interface RenoHomeTodoWidgetsProps {
  propertiesByPhase?: Record<RenoKanbanPhase, Property[]>;
}

interface TodoWidget {
  id: string;
  title: string;
  count: number;
  properties: Property[];
  phaseFilter?: RenoKanbanPhase[];
  onClick?: () => void;
}

export function RenoHomeTodoWidgets({ propertiesByPhase }: RenoHomeTodoWidgetsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState<'estimated-visit' | 'initial-check' | 'renovator' | 'work-update' | 'final-check' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todoWidgets = useMemo(() => {
    if (!propertiesByPhase) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Definir Visita Estimada
    const pendingEstimatedVisitProps = [
      ...(propertiesByPhase['upcoming-settlements'] || [])
        .filter(prop => !prop.estimatedVisitDate || prop.estimatedVisitDate.trim() === ''),
      ...(propertiesByPhase['initial-check'] || [])
        .filter(prop => !prop.estimatedVisitDate || prop.estimatedVisitDate.trim() === '')
    ];

    // 2. Check Inicial
    const pendingInitialCheckProps = (propertiesByPhase['initial-check'] || []);

    // 3. Rellenar Renovador
    const pendingRenovatorProps = [
      ...(propertiesByPhase['reno-budget-renovator'] || [])
        .filter(prop => !prop.renovador || prop.renovador.trim() === ''),
      ...(propertiesByPhase['reno-budget-client'] || [])
        .filter(prop => !prop.renovador || prop.renovador.trim() === '')
    ];

    // 4. Actualizacion de obra
    const pendingWorkUpdateProps = (propertiesByPhase['reno-in-progress'] || [])
      .filter(prop => {
        if (prop.proximaActualizacion) {
          const nextUpdateDate = new Date(prop.proximaActualizacion);
          nextUpdateDate.setHours(0, 0, 0, 0);
          if (nextUpdateDate <= today) {
            return true;
          }
        }
        if (!prop.ultimaActualizacion) {
          return true;
        }
        const lastUpdateDate = new Date(prop.ultimaActualizacion);
        const daysSinceUpdate = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7;
      });

    // 5. Check Final
    const pendingFinalCheckProps = (propertiesByPhase['final-check'] || []);

    // Ordenar widgets según el orden del kanban: upcoming-settlements, initial-check, reno-budget-renovator, reno-budget-client, reno-budget-start, reno-in-progress, furnishing-cleaning, final-check
    const widgets: TodoWidget[] = [
      {
        id: 'estimated-visit',
        title: t.dashboard?.todoWidgets?.defineEstimatedVisit || "Definir Visita Estimada",
        count: pendingEstimatedVisitProps.length,
        properties: pendingEstimatedVisitProps,
        phaseFilter: ['upcoming-settlements', 'initial-check'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=upcoming-settlements');
        },
      },
      {
        id: 'initial-check',
        title: t.dashboard?.todoWidgets?.initialCheck || "Revisión Inicial",
        count: pendingInitialCheckProps.length,
        properties: pendingInitialCheckProps,
        phaseFilter: ['initial-check'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=initial-check');
        },
      },
      {
        id: 'renovator',
        title: t.dashboard?.todoWidgets?.fillRenovator || "Rellenar Renovador",
        count: pendingRenovatorProps.length,
        properties: pendingRenovatorProps,
        phaseFilter: ['reno-budget-renovator', 'reno-budget-client'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=reno-budget-renovator');
        },
      },
      {
        id: 'work-update',
        title: t.dashboard?.todoWidgets?.workUpdate || "Actualización de Obra",
        count: pendingWorkUpdateProps.length,
        properties: pendingWorkUpdateProps,
        phaseFilter: ['reno-in-progress'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=reno-in-progress');
        },
      },
      {
        id: 'final-check',
        title: t.dashboard?.todoWidgets?.finalCheck || "Revisión Final",
        count: pendingFinalCheckProps.length,
        properties: pendingFinalCheckProps,
        phaseFilter: ['final-check'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=final-check');
        },
      },
    ];

    return widgets;
  }, [propertiesByPhase, router]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handlePropertyClick = (e: React.MouseEvent, property: Property, widgetId: string) => {
    e.stopPropagation();
    
    const widgetTypeMap: Record<string, 'estimated-visit' | 'initial-check' | 'renovator' | 'work-update' | 'final-check'> = {
      'estimated-visit': 'estimated-visit',
      'initial-check': 'initial-check',
      'renovator': 'renovator',
      'work-update': 'work-update',
      'final-check': 'final-check',
    };
    
    const widgetType = widgetTypeMap[widgetId] || null;
    setSelectedProperty(property);
    setSelectedWidgetType(widgetType);
    setIsModalOpen(true);
  };

  // Helper para renderizar información relevante según el tipo de widget
  const renderPropertyInfo = (property: Property, widgetId: string) => {
    const address = property.address || property.fullAddress || '';
    const supabaseProperty = (property as any)?.supabaseProperty;
    
    switch (widgetId) {
      case 'estimated-visit':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {address}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {property.daysToVisit !== null && property.daysToVisit !== undefined && (
                <span>{t.dashboard?.todoWidgets?.daysToVisit || "Días para visitar"}: {property.daysToVisit}</span>
              )}
              {property.region && <span>• {property.region}</span>}
            </div>
          </div>
        );
      
      case 'initial-check':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {address}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {property.daysToVisit !== null && property.daysToVisit !== undefined && (
                <span>{t.dashboard?.todoWidgets?.daysToVisit || "Días para visitar"}: {property.daysToVisit}</span>
              )}
              {property.renovador && <span>• {property.renovador}</span>}
            </div>
          </div>
        );
      
      case 'renovator':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {address}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              {property.daysToStartRenoSinceRSD !== null && property.daysToStartRenoSinceRSD !== undefined && (
                <span className="whitespace-nowrap">{t.dashboard?.todoWidgets?.daysToStart || "Días para empezar"}: {property.daysToStartRenoSinceRSD}</span>
              )}
              {property.renoType && (
                <span className="whitespace-nowrap">• {property.renoType}</span>
              )}
            </div>
          </div>
        );
      
      case 'work-update':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {address}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {property.renovador && <span>{property.renovador}</span>}
              {property.renoDuration !== null && property.renoDuration !== undefined && (
                <span>• {t.dashboard?.todoWidgets?.workDays || "Días de obra"}: {property.renoDuration}</span>
              )}
            </div>
          </div>
        );
      
      case 'final-check':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {address}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {property.renovador && <span>{property.renovador}</span>}
              {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined && (
                <span>• {t.dashboard?.todoWidgets?.daysToReady || "Días para lista"}: {property.daysToPropertyReady}</span>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
            {address}
          </div>
        );
    }
  };

  // Componente para card individual (desktop) - Rediseñado con principios Apple/Revolut
  const WidgetCard = ({ widget }: { widget: TodoWidget }) => {
    const hasItems = widget.count > 0;
    
    return (
      <Card 
        className={cn(
          "relative overflow-hidden border h-full flex flex-col",
          hasItems 
            ? "border-border" 
            : "border-border/50 opacity-75"
        )}
      >
        <CardHeader 
          className={cn(
            "relative z-10 flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer flex-shrink-0",
            "border-b border-border/50"
          )}
          onClick={widget.onClick}
        >
          <CardTitle className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0">
            {widget.title}
          </CardTitle>
          
          {/* Smaller number badge aligned with title */}
          <div className={cn(
            "relative z-10 flex items-center justify-center min-w-[32px] h-7 rounded-md ml-3 flex-shrink-0",
            "font-medium text-sm",
            hasItems 
              ? "bg-muted/50 text-foreground" 
              : "bg-muted/30 text-muted-foreground"
          )}>
            {widget.count}
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 flex-1 flex flex-col pt-4 pb-4">
          {/* Lista de propiedades pendientes */}
          {hasItems && widget.properties.length > 0 && (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {widget.properties.slice(0, 4).map((property, index) => (
                <div
                  key={property.id}
                  onClick={(e) => handlePropertyClick(e, property, widget.id)}
                  className={cn(
                    "p-2.5 rounded-lg cursor-pointer",
                    "hover:bg-muted/30",
                    "border border-border/50"
                  )}
                >
                  {renderPropertyInfo(property, widget.id)}
                </div>
              ))}
              
              {widget.properties.length > 4 && (
                <button
                  onClick={widget.onClick}
                  className="w-full text-xs font-medium text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-muted/30 flex items-center justify-center gap-1"
                >
                  <span>{(t.dashboard?.todoWidgets?.seeMore || "Ver {count} más").replace('{count}', String(widget.properties.length - 4))}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          
          {!hasItems && (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-muted/30">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t.dashboard?.todoWidgets?.allCompleted || "Todo completado"}</p>
                <p className="text-xs text-muted-foreground/70">{t.dashboard?.todoWidgets?.noPendingTasks || "No hay tareas pendientes"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t.dashboard?.todoWidgets?.pendingTasks || "Tareas Pendientes"}</h2>
        </div>
        <Badge variant="secondary" className="text-xs">
          {todoWidgets.reduce((sum, w) => sum + w.count, 0)} {t.dashboard?.todoWidgets?.total || "total"}
        </Badge>
      </div>
      
      {/* Desktop: Grid de cards mejorado */}
      <div className="hidden md:grid md:grid-cols-5 gap-4 lg:gap-5">
        {todoWidgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>

      {/* Mobile: Card única con acordeón mejorado */}
      <Card className="bg-card md:hidden border-2">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {todoWidgets.map((widget, index) => {
              const isOpen = openItems.has(widget.id);
              const isLast = index === todoWidgets.length - 1;
              const hasItems = widget.count > 0;
              
              return (
                <Collapsible
                  key={widget.id}
                  open={isOpen}
                  onOpenChange={() => toggleItem(widget.id)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "w-full flex items-center justify-between p-4",
                      "hover:bg-muted/30",
                      isOpen && "bg-muted/30",
                      !isLast && "border-b border-border/50"
                    )}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-foreground leading-tight">
                        {widget.title}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className={cn(
                        "flex items-center justify-center min-w-[32px] h-7 rounded-md font-medium text-sm",
                        hasItems 
                          ? "bg-muted/50 text-foreground" 
                          : "bg-muted/30 text-muted-foreground"
                      )}>
                        {widget.count}
                      </div>
                      
                      <div className={cn(
                        isOpen && "rotate-90"
                      )}>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  {hasItems && widget.properties.length > 0 && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 space-y-2">
                        {widget.properties.map((property) => (
                          <div
                            key={property.id}
                            onClick={(e) => handlePropertyClick(e, property, widget.id)}
                            className={cn(
                              "p-2.5 rounded-lg cursor-pointer",
                              "hover:bg-muted/30",
                              "border border-border/50"
                            )}
                          >
                            {renderPropertyInfo(property, widget.id)}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                  
                  {!hasItems && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 text-center py-6">
                        <div className="flex justify-center mb-2">
                          <div className="p-3 rounded-full bg-muted/30">
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{t.dashboard?.todoWidgets?.allCompleted || "Todo completado"}</p>
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <TodoWidgetModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedProperty(null);
            setSelectedWidgetType(null);
          }
        }}
        property={selectedProperty}
        widgetType={selectedWidgetType}
      />
    </div>
  );
}
