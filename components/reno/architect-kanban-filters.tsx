"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PHASES_KANBAN_ARCHITECT, ARCHITECT_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { trackEventWithDevice } from "@/lib/mixpanel";

export interface ArchitectFilters {
  architectNames: string[];
  ecuStatus: "all" | "con-ecu" | "sin-ecu";
  investmentType: "all" | "flip" | "yield";
  phase: string | null;
}

export const DEFAULT_ARCHITECT_FILTERS: ArchitectFilters = {
  architectNames: [],
  ecuStatus: "all",
  investmentType: "all",
  phase: null,
};

export function getArchitectFilterBadgeCount(f: ArchitectFilters): number {
  return (
    (f.architectNames.length > 0 ? 1 : 0) +
    (f.ecuStatus !== "all" ? 1 : 0) +
    (f.investmentType !== "all" ? 1 : 0) +
    (f.phase !== null ? 1 : 0)
  );
}

interface ArchitectKanbanFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allProjects: ProjectRow[];
  filters: ArchitectFilters;
  onFiltersChange: (filters: ArchitectFilters) => void;
}

export function ArchitectKanbanFilters({
  open,
  onOpenChange,
  allProjects,
  filters,
  onFiltersChange,
}: ArchitectKanbanFiltersProps) {
  const [local, setLocal] = useState<ArchitectFilters>(filters);

  const availableArchitects = useMemo(() => {
    const names = new Set<string>();
    for (const p of allProjects) {
      const arch = ((p as any).architect ?? "").toString().trim();
      if (arch) names.add(arch);
    }
    return Array.from(names).sort();
  }, [allProjects]);

  const handleApply = () => {
    onFiltersChange(local);
    trackEventWithDevice("Architect Filters Applied", {
      architects: local.architectNames.length,
      ecu: local.ecuStatus,
      investment: local.investmentType,
      phase: local.phase,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared = { ...DEFAULT_ARCHITECT_FILTERS };
    setLocal(cleared);
    onFiltersChange(cleared);
    trackEventWithDevice("Architect Filters Cleared");
    onOpenChange(false);
  };

  // Sync local state when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setLocal(filters);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtrar proyectos</DialogTitle>
          <DialogDescription>Selecciona los filtros que deseas aplicar</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Arquitecto */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Arquitecto</Label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {availableArchitects.map((name) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={local.architectNames.includes(name)}
                    onCheckedChange={(checked) => {
                      setLocal((prev) => ({
                        ...prev,
                        architectNames: checked
                          ? [...prev.architectNames, name]
                          : prev.architectNames.filter((n) => n !== name),
                      }));
                    }}
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
              {availableArchitects.length === 0 && (
                <span className="text-sm text-muted-foreground italic">Sin arquitectos disponibles</span>
              )}
            </div>
          </div>

          {/* ECU */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">ECU</Label>
            <div className="flex flex-wrap gap-3">
              {(["all", "con-ecu", "sin-ecu"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={local.ecuStatus === opt}
                    onCheckedChange={(checked) => {
                      if (checked) setLocal((prev) => ({ ...prev, ecuStatus: opt }));
                    }}
                  />
                  <span className="text-sm">
                    {opt === "all" ? "Todos" : opt === "con-ecu" ? "Con ECU" : "Sin ECU"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipo de inversión */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tipo de Inversión</Label>
            <div className="flex flex-wrap gap-3">
              {(["all", "flip", "yield"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={local.investmentType === opt}
                    onCheckedChange={(checked) => {
                      if (checked) setLocal((prev) => ({ ...prev, investmentType: opt }));
                    }}
                  />
                  <span className="text-sm">
                    {opt === "all" ? "Todos" : opt === "flip" ? "Flip" : "Yield"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fase */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Fase</Label>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={local.phase === null}
                  onCheckedChange={(checked) => {
                    if (checked) setLocal((prev) => ({ ...prev, phase: null }));
                  }}
                />
                <span className="text-sm">Todas</span>
              </label>
              {PHASES_KANBAN_ARCHITECT.map((phase) => (
                <label key={phase} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={local.phase === phase}
                    onCheckedChange={(checked) => {
                      if (checked) setLocal((prev) => ({ ...prev, phase }));
                    }}
                  />
                  <span className="text-sm">{ARCHITECT_PHASE_LABELS[phase]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Limpiar filtros
          </Button>
          <Button onClick={handleApply}>
            Aplicar filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
