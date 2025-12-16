"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Check, ChevronDown } from "lucide-react";
import { Property } from "@/lib/property-storage";

interface RenovatorComboboxProps {
  properties: Property[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Combobox para seleccionar un renovador de la lista de renovadores disponibles
 * Similar a PropertyCombobox pero para selección de renovadores
 */
export function RenovatorCombobox({
  properties,
  value,
  onValueChange,
  placeholder = "Buscar renovador...",
  disabled = false,
}: RenovatorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Obtener lista única de renovadores desde las propiedades
  const availableRenovators = useMemo(() => {
    const renovatorSet = new Set<string>();
    
    properties.forEach((property) => {
      const renovatorName = (property as any).renovador || 
                           (property as any).supabaseProperty?.["Renovator name"];
      if (renovatorName && typeof renovatorName === 'string' && renovatorName.trim()) {
        renovatorSet.add(renovatorName.trim());
      }
    });
    
    return Array.from(renovatorSet).sort();
  }, [properties]);

  // Filtrar renovadores basado en la búsqueda
  const filteredRenovators = useMemo(() => {
    if (!searchQuery.trim()) return availableRenovators;
    
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return availableRenovators.filter((renovator) => {
      const renovatorNormalized = renovator.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return renovatorNormalized.includes(query);
    });
  }, [availableRenovators, searchQuery]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredRenovators.length, searchQuery]);

  // Handle click outside
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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((prev) => (prev < filteredRenovators.length - 1 ? prev + 1 : prev));
      // Scroll into view
      setTimeout(() => {
        const selectedElement = listRef.current?.children[selectedIndex + 1] as HTMLElement;
        selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      // Scroll into view
      setTimeout(() => {
        const selectedElement = listRef.current?.children[selectedIndex - 1] as HTMLElement;
        selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    } else if (e.key === "Enter" && open && filteredRenovators[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredRenovators[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (renovator: string) => {
    onValueChange(renovator);
    setOpen(false);
    setSearchQuery("");
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setOpen(true);
  };

  // Display value: mostrar el valor seleccionado o la búsqueda
  const displayValue = open ? searchQuery : (value || "");

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        <ChevronDown className={cn(
          "absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform",
          open && "rotate-180"
        )} />
      </div>

      {open && filteredRenovators.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] rounded-md shadow-md max-h-60 overflow-y-auto"
        >
          {filteredRenovators.map((renovator, index) => {
            const isSelected = value === renovator;
            const isHighlighted = index === selectedIndex;

            return (
              <button
                key={renovator}
                type="button"
                onClick={() => handleSelect(renovator)}
                className={cn(
                  "w-full text-left px-3 py-2 transition-colors flex items-center justify-between",
                  "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)]",
                  isHighlighted && "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20",
                  isSelected && "bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/30"
                )}
              >
                <span className="text-sm font-medium text-foreground">{renovator}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {open && searchQuery && filteredRenovators.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] rounded-md shadow-md p-3">
          <p className="text-sm text-muted-foreground">No se encontraron renovadores</p>
        </div>
      )}
    </div>
  );
}

