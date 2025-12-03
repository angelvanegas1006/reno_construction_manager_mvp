"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

export interface KanbanFilters {
  renovatorNames: string[];
  technicalConstructors: string[];
  areaClusters: string[];
  delayedWorks: boolean; // Obras tardías (solo propiedades marcadas en rojo)
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
      const technicalConstructor = (property as any).supabaseProperty?.["Technical construction"] ||
                                   (property as any).supabaseProperty?.["Technical Constructor"];
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

  const handleToggleTechnicalConstructor = (technicalConstructor: string) => {
    const newFilters = { ...filters };
    if (newFilters.technicalConstructors.includes(technicalConstructor)) {
      newFilters.technicalConstructors = newFilters.technicalConstructors.filter(t => t !== technicalConstructor);
    } else {
      newFilters.technicalConstructors = [...newFilters.technicalConstructors, technicalConstructor];
    }
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      renovatorNames: [],
      technicalConstructors: [],
      areaClusters: [],
      delayedWorks: false,
    });
  };

  const hasActiveFilters = 
    filters.renovatorNames.length > 0 ||
    filters.technicalConstructors.length > 0 ||
    filters.areaClusters.length > 0 ||
    filters.delayedWorks === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[80vh] overflow-y-auto w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">{t.kanban.filters || "Filtros"}</DialogTitle>
          <DialogDescription className="text-sm">
            {t.kanban.filtersDescription || "Selecciona uno o más valores para filtrar las propiedades. Los filtros se combinan con OR (cualquiera de los seleccionados)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6 py-4">
          {/* Renovator Name */}
          <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
            {uniqueValues.renovatorNames.length === 0 ? (
              <>
                <Label className="text-sm md:text-base font-semibold">{t.kanban.renovatorName || "Renovator Name"}</Label>
                <p className="text-xs md:text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              </>
            ) : (
              <MultiCombobox
                label={t.kanban.renovatorName || "Renovator Name"}
                options={uniqueValues.renovatorNames}
                selectedValues={filters.renovatorNames}
                onSelectionChange={(values) => {
                  onFiltersChange({ ...filters, renovatorNames: values });
                }}
                placeholder={t.kanban.searchRenovator || "Buscar renovador..."}
              />
            )}
          </div>

          {/* Technical Constructor */}
          <div className="space-y-2 md:space-y-3">
            <Label className="text-sm md:text-base font-semibold">{t.kanban.technicalConstructor || "Technical Constructor"}</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {uniqueValues.technicalConstructors.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              ) : (
                uniqueValues.technicalConstructors.map((constructor) => (
                  <div key={constructor} className="flex items-center space-x-2 min-w-0">
                    <Checkbox
                      id={`technical-${constructor}`}
                      checked={filters.technicalConstructors.includes(constructor)}
                      onCheckedChange={() => handleToggleTechnicalConstructor(constructor)}
                      className="flex-shrink-0"
                    />
                    <label
                      htmlFor={`technical-${constructor}`}
                      className="text-xs md:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 break-words min-w-0"
                    >
                      {constructor}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Area Cluster */}
          <div className="space-y-3 md:space-y-4">
            {uniqueValues.areaClusters.length === 0 ? (
              <>
                <Label className="text-sm md:text-base font-semibold">{t.kanban.areaCluster || "Area Cluster"}</Label>
                <p className="text-xs md:text-sm text-muted-foreground">{t.kanban.noValuesAvailable || "No hay valores disponibles"}</p>
              </>
            ) : (
              <MultiCombobox
                label={t.kanban.areaCluster || "Area Cluster"}
                options={uniqueValues.areaClusters}
                selectedValues={filters.areaClusters}
                onSelectionChange={(values) => {
                  onFiltersChange({ ...filters, areaClusters: values });
                }}
                placeholder={t.kanban.searchAreaCluster || "Buscar área..."}
              />
            )}
          </div>

          {/* Obras Tardías */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Obras Tardías</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delayed-works"
                checked={filters.delayedWorks || false}
                onCheckedChange={(checked) => {
                  onFiltersChange({ ...filters, delayedWorks: checked === true });
                }}
              />
              <label
                htmlFor="delayed-works"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mostrar solo obras tardías (marcadas en rojo)
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
            className="w-full sm:w-auto"
          >
            {t.kanban.clearAll || "Limpiar todos"}
          </Button>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t.kanban.applyFilters || "Aplicar filtros"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}






