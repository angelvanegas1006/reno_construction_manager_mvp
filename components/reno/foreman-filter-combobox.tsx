"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown } from "lucide-react";
import { FOREMAN_NAME_TO_EMAIL } from "@/lib/supabase/user-name-utils";
import type { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

interface ForemanFilterComboboxProps {
  properties: Property[];
  selectedForemanEmails: string[];
  onSelectionChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Componente para filtrar propiedades por foreman
 * Muestra un combobox con checkboxes para seleccionar múltiples foreman
 */
export function ForemanFilterCombobox({
  properties,
  selectedForemanEmails,
  onSelectionChange,
  placeholder,
  disabled = false,
  label,
}: ForemanFilterComboboxProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obtener lista única de foreman desde las propiedades
  const availableForemen = useMemo(() => {
    const foremanSet = new Set<string>();
    
    properties.forEach((property) => {
      const technicalConstruction = (property as any).supabaseProperty?.["Technical construction"];
      if (technicalConstruction) {
        // Buscar el email del foreman usando el mapeo
        for (const [name, email] of Object.entries(FOREMAN_NAME_TO_EMAIL)) {
          const normalizedName = name.toLowerCase();
          const normalizedConstruction = technicalConstruction.toLowerCase();
          
          // Matching parcial
          if (
            normalizedName === normalizedConstruction ||
            normalizedName.includes(normalizedConstruction) ||
            normalizedConstruction.includes(normalizedName) ||
            normalizedName.split(' ').some(part => 
              part.length > 2 && normalizedConstruction.includes(part)
            )
          ) {
            foremanSet.add(email);
            break;
          }
        }
      }
    });
    
    // Convertir a array y ordenar por nombre
    return Array.from(foremanSet)
      .map(email => {
        // Encontrar el nombre del foreman desde el email
        const nameEntry = Object.entries(FOREMAN_NAME_TO_EMAIL).find(([, e]) => e === email);
        return {
          email,
          name: nameEntry ? nameEntry[0] : email.split('@')[0],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [properties]);

  // Filtrar opciones basado en la búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return availableForemen;
    
    const query = searchQuery.toLowerCase();
    return availableForemen.filter(foreman =>
      foreman.name.toLowerCase().includes(query) ||
      foreman.email.toLowerCase().includes(query)
    );
  }, [availableForemen, searchQuery]);

  // Manejar click fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Manejar selección/deselección
  const handleToggle = (email: string) => {
    const newSelection = selectedForemanEmails.includes(email)
      ? selectedForemanEmails.filter(e => e !== email)
      : [...selectedForemanEmails, email];
    
    onSelectionChange(newSelection);
  };

  // Manejar remover badge
  const handleRemove = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedForemanEmails.filter(e => e !== email));
  };

  // Obtener nombre del foreman desde email
  const getForemanName = (email: string) => {
    const foreman = availableForemen.find(f => f.email === email);
    return foreman?.name || email.split('@')[0];
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim() || filteredOptions.length > 0) {
                setOpen(true);
              }
            }}
            onClick={() => {
              if (filteredOptions.length > 0) {
                setOpen(true);
              }
            }}
            placeholder={placeholder || t.dashboard?.foremanFilter?.filterByForeman || "Filtrar por jefe de obra..."}
            disabled={disabled}
            className="pl-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <ChevronDown 
            className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>

        {/* Badges de seleccionados */}
        {selectedForemanEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedForemanEmails.map((email) => (
              <Badge
                key={email}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs">{getForemanName(email)}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(email, e)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Dropdown con checkboxes */}
        {open && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-800)] border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.map((foreman) => {
              const isSelected = selectedForemanEmails.includes(foreman.email);
              
              return (
                <div
                  key={foreman.email}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleToggle(foreman.email)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(foreman.email)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{foreman.name}</p>
                    <p className="text-xs text-muted-foreground">{foreman.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {open && searchQuery && filteredOptions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-800)] border border-border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
            {t.dashboard?.foremanFilter?.noForemenFound || "No se encontraron jefes de obra"}
          </div>
        )}
      </div>
    </div>
  );
}

