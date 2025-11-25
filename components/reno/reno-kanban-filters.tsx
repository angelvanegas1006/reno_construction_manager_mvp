"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

export interface KanbanFilters {
  renovatorNames: string[];
  technicalConstructors: string[];
  areaClusters: string[];
}

interface RenoKanbanFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
}

export function RenoKanbanFilters({
  open,
  onOpenChange,
  properties,
  filters,
  onFiltersChange,
}: RenoKanbanFiltersProps) {
  const { t } = useI18n();

  // Obtener valores únicos de las propiedades
  const uniqueValues = useMemo(() => {
    const renovatorNames = new Set<string>();
    const technicalConstructors = new Set<string>();
    const areaClusters = new Set<string>();

    properties.forEach((property) => {
      // Renovator name - buscar en renovador o en supabaseProperty
      const renovatorName = (property as any).renovador || 
                           (property as any).supabaseProperty?.["Renovator name"];
      if (renovatorName && typeof renovatorName === 'string' && renovatorName.trim()) {
        renovatorNames.add(renovatorName.trim());
      }

      // Technical construction - buscar en supabaseProperty
      const technicalConstructor = (property as any).supabaseProperty?.["Technical construction"];
      if (technicalConstructor && typeof technicalConstructor === 'string' && technicalConstructor.trim()) {
        technicalConstructors.add(technicalConstructor.trim());
      }

      // Area cluster - buscar en region o en supabaseProperty
      const areaCluster = (property as any).region || 
                         (property as any).supabaseProperty?.area_cluster;
      if (areaCluster && typeof areaCluster === 'string' && areaCluster.trim()) {
        areaClusters.add(areaCluster.trim());
      }
    });

    return {
      renovatorNames: Array.from(renovatorNames).sort(),
      technicalConstructors: Array.from(technicalConstructors).sort(),
      areaClusters: Array.from(areaClusters).sort(),
    };
  }, [properties]);

  const handleToggleRenovator = (renovatorName: string) => {
    const newFilters = { ...filters };
    if (newFilters.renovatorNames.includes(renovatorName)) {
      newFilters.renovatorNames = newFilters.renovatorNames.filter(n => n !== renovatorName);
    } else {
      newFilters.renovatorNames = [...newFilters.renovatorNames, renovatorName];
    }
    onFiltersChange(newFilters);
  };

  const handleToggleTechnicalConstructor = (technicalConstructor: string) => {
    const newFilters = { ...filters };
    if (newFilters.technicalConstructors.includes(technicalConstructor)) {
      newFilters.technicalConstructors = newFilters.technicalConstructors.filter(t => t !== technicalConstructor);
    } else {
      newFilters.technicalConstructors = [...newFilters.technicalConstructors, technicalConstructor];
    }
    onFiltersChange(newFilters);
  };

  const handleToggleAreaCluster = (areaCluster: string) => {
    const newFilters = { ...filters };
    if (newFilters.areaClusters.includes(areaCluster)) {
      newFilters.areaClusters = newFilters.areaClusters.filter(a => a !== areaCluster);
    } else {
      newFilters.areaClusters = [...newFilters.areaClusters, areaCluster];
    }
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      renovatorNames: [],
      technicalConstructors: [],
      areaClusters: [],
    });
  };

  const hasActiveFilters = 
    filters.renovatorNames.length > 0 ||
    filters.technicalConstructors.length > 0 ||
    filters.areaClusters.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.kanban.filters || "Filtros"}</DialogTitle>
          <DialogDescription>
            {t.kanban.filtersDescription || "Selecciona uno o más valores para filtrar las propiedades. Los filtros se combinan con OR (cualquiera de los seleccionados)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Renovator Name */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.kanban.renovatorName || "Renovator Name"}</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {uniqueValues.renovatorNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              ) : (
                uniqueValues.renovatorNames.map((name) => (
                  <div key={name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`renovator-${name}`}
                      checked={filters.renovatorNames.includes(name)}
                      onCheckedChange={() => handleToggleRenovator(name)}
                    />
                    <label
                      htmlFor={`renovator-${name}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Technical Constructor */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.kanban.technicalConstructor || "Technical Constructor"}</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {uniqueValues.technicalConstructors.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              ) : (
                uniqueValues.technicalConstructors.map((constructor) => (
                  <div key={constructor} className="flex items-center space-x-2">
                    <Checkbox
                      id={`technical-${constructor}`}
                      checked={filters.technicalConstructors.includes(constructor)}
                      onCheckedChange={() => handleToggleTechnicalConstructor(constructor)}
                    />
                    <label
                      htmlFor={`technical-${constructor}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {constructor}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Area Cluster */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.kanban.areaCluster || "Area Cluster"}</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {uniqueValues.areaClusters.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              ) : (
                uniqueValues.areaClusters.map((cluster) => (
                  <div key={cluster} className="flex items-center space-x-2">
                    <Checkbox
                      id={`area-${cluster}`}
                      checked={filters.areaClusters.includes(cluster)}
                      onCheckedChange={() => handleToggleAreaCluster(cluster)}
                    />
                    <label
                      htmlFor={`area-${cluster}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {cluster}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
          >
            {t.kanban.clearAll || "Limpiar todos"}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t.kanban.applyFilters || "Aplicar filtros"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

