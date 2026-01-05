"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { Filter } from "lucide-react";

interface RenoHomeTechnicalConstructorFilterProps {
  properties: Property[];
  selectedConstructors: string[];
  onSelectionChange: (constructors: string[]) => void;
}

export function RenoHomeTechnicalConstructorFilter({
  properties,
  selectedConstructors,
  onSelectionChange,
}: RenoHomeTechnicalConstructorFilterProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  // Obtener valores únicos de technical constructors
  const technicalConstructors = useMemo(() => {
    const constructors = new Set<string>();

    properties.forEach((property) => {
      const technicalConstructor = (property as any).supabaseProperty?.["Technical construction"] ||
                                   (property as any).supabaseProperty?.["Technical Constructor"];
      if (technicalConstructor && typeof technicalConstructor === 'string' && technicalConstructor.trim()) {
        constructors.add(technicalConstructor.trim());
      }
    });

    return Array.from(constructors).sort();
  }, [properties]);

  const handleToggleConstructor = (constructor: string) => {
    if (selectedConstructors.includes(constructor)) {
      onSelectionChange(selectedConstructors.filter(c => c !== constructor));
    } else {
      onSelectionChange([...selectedConstructors, constructor]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const hasActiveFilters = selectedConstructors.length > 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        <Filter className="h-4 w-4 mr-2" />
        Jefe de obra
        {hasActiveFilters && (
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
            {selectedConstructors.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtrar por Jefe de obra</DialogTitle>
            <DialogDescription>
              Selecciona uno o más jefes de obra para filtrar las propiedades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {technicalConstructors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay jefes de obra disponibles</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {technicalConstructors.map((constructor) => (
                  <div key={constructor} className="flex items-center space-x-2 min-w-0">
                    <Checkbox
                      id={`home-technical-${constructor}`}
                      checked={selectedConstructors.includes(constructor)}
                      onCheckedChange={() => handleToggleConstructor(constructor)}
                      className="flex-shrink-0"
                    />
                    <label
                      htmlFor={`home-technical-${constructor}`}
                      className="text-sm font-medium leading-none cursor-pointer flex-1 break-words min-w-0"
                    >
                      {constructor}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={!hasActiveFilters}
              className="w-full sm:w-auto"
            >
              Limpiar
            </Button>
            <Button onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

