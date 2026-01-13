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
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
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

  // Calcular posición del dropdown (arriba o abajo) basado en espacio disponible
  useEffect(() => {
    if (open && containerRef.current && inputRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240; // max-h-60 = 240px
      
      // Si hay menos espacio abajo que arriba, mostrar hacia arriba
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [open]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Si hay texto escrito que no está en la lista, guardarlo como nuevo renovador
        if (searchQuery.trim() && searchQuery.trim() !== (value || "")) {
          onValueChange(searchQuery.trim());
        }
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      // Usar timeout para permitir que los clicks en el dropdown funcionen
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open, searchQuery, value, onValueChange]);

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
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filteredRenovators[selectedIndex]) {
        // Si hay una opción seleccionada, usarla
        handleSelect(filteredRenovators[selectedIndex]);
      } else if (searchQuery.trim()) {
        // Si hay texto escrito pero no hay coincidencias, guardar el texto escrito como nuevo renovador
        onValueChange(searchQuery.trim());
        setOpen(false);
        setSearchQuery("");
        inputRef.current?.blur();
      }
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
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setOpen(true);
    // No guardar aquí, solo actualizar el estado local
    // El guardado se hará cuando se seleccione o se pierda el foco
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
          onBlur={(e) => {
            // Solo procesar si el siguiente elemento no es parte del dropdown
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!containerRef.current?.contains(relatedTarget)) {
              // Si hay texto escrito que no está en la lista, guardarlo como nuevo renovador
              if (searchQuery.trim() && searchQuery.trim() !== (value || "")) {
                onValueChange(searchQuery.trim());
              }
              // Pequeño delay para permitir que el click en el dropdown funcione
              setTimeout(() => {
                setOpen(false);
                setSearchQuery("");
              }, 200);
            }
          }}
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
          className={cn(
            "absolute z-[100] w-full bg-card dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] rounded-md shadow-lg max-h-60 overflow-y-auto",
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
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
        <div className={cn(
          "absolute z-[100] w-full bg-card dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] rounded-md shadow-md",
          dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        )}>
          <button
            type="button"
            onClick={() => {
              if (searchQuery.trim()) {
                onValueChange(searchQuery.trim());
                setOpen(false);
                setSearchQuery("");
                inputRef.current?.blur();
              }
            }}
            className="w-full text-left px-3 py-2 transition-colors flex items-center justify-between hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)]"
          >
            <span className="text-sm text-foreground">
              Crear nuevo: <span className="font-medium">"{searchQuery}"</span>
            </span>
            <span className="text-xs text-muted-foreground">Presiona Enter</span>
          </button>
        </div>
      )}
    </div>
  );
}

