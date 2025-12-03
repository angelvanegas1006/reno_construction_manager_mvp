"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Property } from "@/lib/property-storage";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useRouter } from "next/navigation";
import { TodoWidgetModal } from "./todo-widget-modal";

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
    // Propiedades en fase 1 (upcoming-settlements) y fase 2 (initial-check) que no tengan estimated visit date
    const pendingEstimatedVisitProps = [
      ...(propertiesByPhase['upcoming-settlements'] || [])
        .filter(prop => !prop.estimatedVisitDate || prop.estimatedVisitDate.trim() === ''),
      ...(propertiesByPhase['initial-check'] || [])
        .filter(prop => !prop.estimatedVisitDate || prop.estimatedVisitDate.trim() === '')
    ];

    // 2. Check Inicial
    // Propiedades en la fase 2 (initial-check) del kanban
    const pendingInitialCheckProps = (propertiesByPhase['initial-check'] || []);

    // 3. Rellenar Renovador
    // Propiedades en fase 3 (reno-budget-renovator) y fase 4 (reno-budget-client) que tengan renovator name vacío
    const pendingRenovatorProps = [
      ...(propertiesByPhase['reno-budget-renovator'] || [])
        .filter(prop => !prop.renovador || prop.renovador.trim() === ''),
      ...(propertiesByPhase['reno-budget-client'] || [])
        .filter(prop => !prop.renovador || prop.renovador.trim() === '')
    ];

    // 4. Actualizacion de obra
    // Se definirá más adelante - por ahora mantener la lógica actual
    const pendingWorkUpdateProps = (propertiesByPhase['reno-in-progress'] || [])
      .filter(prop => {
        // Si tiene próxima actualización y ya pasó la fecha
        if (prop.proximaActualizacion) {
          const nextUpdateDate = new Date(prop.proximaActualizacion);
          nextUpdateDate.setHours(0, 0, 0, 0);
          if (nextUpdateDate <= today) {
            return true;
          }
        }
        // Si no tiene última actualización o es muy antigua (más de 7 días)
        if (!prop.ultimaActualizacion) {
          return true;
        }
        const lastUpdateDate = new Date(prop.ultimaActualizacion);
        const daysSinceUpdate = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7;
      });

    // 5. Check Final
    // Propiedades en la fase final-check del kanban
    const pendingFinalCheckProps = (propertiesByPhase['final-check'] || []);

    const widgets: TodoWidget[] = [
      {
        id: 'estimated-visit',
        title: 'Definir Visita Estimada',
        count: pendingEstimatedVisitProps.length,
        properties: pendingEstimatedVisitProps,
        phaseFilter: ['upcoming-settlements', 'initial-check'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=upcoming-settlements');
        },
      },
      {
        id: 'initial-check',
        title: 'Check Inicial',
        count: pendingInitialCheckProps.length,
        properties: pendingInitialCheckProps,
        phaseFilter: ['initial-check'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=initial-check');
        },
      },
      {
        id: 'renovator',
        title: 'Rellenar Renovador',
        count: pendingRenovatorProps.length,
        properties: pendingRenovatorProps,
        phaseFilter: ['reno-budget-renovator', 'reno-budget-client'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=reno-budget-renovator');
        },
      },
      {
        id: 'work-update',
        title: 'Actualizacion de obra',
        count: pendingWorkUpdateProps.length,
        properties: pendingWorkUpdateProps,
        phaseFilter: ['reno-in-progress'],
        onClick: () => {
          router.push('/reno/construction-manager/kanban?phase=reno-in-progress');
        },
      },
      {
        id: 'final-check',
        title: 'Check Final',
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
    
    // Mapear widgetId a widgetType
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

  // Componente para card individual (desktop)
  const WidgetCard = ({ widget }: { widget: TodoWidget }) => {
    return (
      <Card className="bg-card hover:shadow-md transition-shadow h-full flex flex-col">
        <CardHeader 
          className="flex flex-row items-start justify-between space-y-0 pb-3 cursor-pointer flex-shrink-0 min-h-[60px]"
          onClick={widget.onClick}
        >
          <CardTitle className="text-sm md:text-base font-semibold text-foreground flex-1 leading-tight pt-1">
            {widget.title}
          </CardTitle>
          <div className={cn(
            "text-sm md:text-base font-medium ml-3 flex-shrink-0 px-2 py-1 rounded-md mt-0",
            widget.count > 0 ? "bg-muted text-muted-foreground" : "text-muted-foreground"
          )}>
            {widget.count}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-0">
          {/* Lista de propiedades pendientes */}
          {widget.count > 0 && widget.properties.length > 0 && (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {widget.properties.slice(0, 5).map((property) => (
                <div
                  key={property.id}
                  onClick={(e) => handlePropertyClick(e, property, widget.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a]",
                    "border border-border"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground line-clamp-2">
                      {property.address || property.fullAddress}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              ))}
              {widget.properties.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{widget.properties.length - 5} más
                </div>
              )}
            </div>
          )}
          {widget.count === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Completado</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Título general */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tareas Pendientes</h2>
      </div>
      
      {/* Desktop: Grid de cards en columnas */}
      <div className="hidden md:grid md:grid-cols-5 gap-3 md:gap-4">
        {todoWidgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>

      {/* Mobile: Card única con acordeón */}
      <Card className="bg-card md:hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {todoWidgets.map((widget, index) => {
              const isOpen = openItems.has(widget.id);
              const isLast = index === todoWidgets.length - 1;
              
              return (
                <Collapsible
                  key={widget.id}
                  open={isOpen}
                  onOpenChange={() => toggleItem(widget.id)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "w-full flex items-start justify-between p-4 hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors min-h-[60px]",
                      isOpen && "bg-[var(--prophero-gray-50)] dark:bg-[#1a1a1a]",
                      !isLast && "border-b border-border"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0 pt-1">
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded transition-transform mt-0.5",
                        isOpen && "rotate-90"
                      )}>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground text-left leading-tight">
                        {widget.title}
                      </span>
                    </div>
                    <div className={cn(
                      "text-sm font-medium ml-4 flex-shrink-0 px-2 py-1 rounded-md mt-0",
                      widget.count > 0 ? "bg-muted text-muted-foreground" : "text-muted-foreground"
                    )}>
                      {widget.count}
                    </div>
                  </CollapsibleTrigger>
                  
                  {widget.count > 0 && widget.properties.length > 0 && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 space-y-2">
                        {widget.properties.map((property) => (
                          <div
                            key={property.id}
                            onClick={(e) => handlePropertyClick(e, property, widget.id)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                              "hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a]",
                              "border border-border"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground line-clamp-2">
                                {property.address || property.fullAddress}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                  
                  {widget.count === 0 && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 text-center py-4">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Completado</span>
                        </div>
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

