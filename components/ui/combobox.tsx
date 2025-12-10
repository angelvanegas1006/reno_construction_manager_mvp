"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComboboxProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  allowCreate?: boolean;
  onCreateNew?: (value: string) => void;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Buscar...",
  disabled = false,
  label,
  allowCreate = true,
  onCreateNew,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((option) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const optionNormalized = option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return optionNormalized.includes(query);
  });

  // Check if search query matches an existing option exactly
  const exactMatch = filteredOptions.some(
    (option) => option.toLowerCase().trim() === searchQuery.toLowerCase().trim()
  );
  const canCreateNew = allowCreate && searchQuery.trim() && !exactMatch;

  // Debug: Log cuando cambian las opciones
  useEffect(() => {
    if (open) {
      console.log('[Combobox] Debug:', {
        optionsCount: options.length,
        filteredOptionsCount: filteredOptions.length,
        searchQuery,
        canCreateNew,
        open,
        options: options.slice(0, 5), // Primeros 5 para debug
      });
    }
  }, [open, options.length, filteredOptions.length, searchQuery, canCreateNew]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length, searchQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // Reset search query to current value when closing
        setSearchQuery(value || "");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, value]);

  // Sync search query with value when value changes externally
  useEffect(() => {
    if (!open) {
      setSearchQuery(value || "");
    }
  }, [value, open]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      const maxIndex = canCreateNew ? filteredOptions.length : filteredOptions.length - 1;
      setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
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
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (canCreateNew && selectedIndex === filteredOptions.length) {
        // Create new option
        handleCreateNew(searchQuery.trim());
      } else if (filteredOptions[selectedIndex]) {
        // Select existing option
        handleSelect(filteredOptions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearchQuery(value || "");
    }
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setSearchQuery(selectedValue);
    setOpen(false);
  };

  const handleCreateNew = (newValue: string) => {
    if (onCreateNew) {
      onCreateNew(newValue);
    } else {
      onValueChange(newValue);
    }
    setSearchQuery(newValue);
    setOpen(false);
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
    // No actualizar el valor mientras se escribe, solo actualizar el searchQuery
    // El valor se actualizará cuando se seleccione o cree una opción
  };

  const displayValue = open ? searchQuery : (value || "");

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          />
        </div>

        {open && filteredOptions.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md max-h-60 overflow-y-auto"
          >
            {filteredOptions.map((option, index) => {
              const isSelected = value === option;
              const isHighlighted = index === selectedIndex;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "w-full text-left px-3 py-2 transition-colors flex items-center justify-between",
                    "hover:bg-muted",
                    isHighlighted && "bg-muted",
                    isSelected && "bg-muted/50"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{option}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })}
            
            {canCreateNew && (
              <button
                type="button"
                onClick={() => handleCreateNew(searchQuery.trim())}
                className={cn(
                  "w-full text-left px-3 py-2 transition-colors flex items-center gap-2",
                  "hover:bg-muted border-t",
                  selectedIndex === filteredOptions.length && "bg-muted"
                )}
              >
                <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  Crear nuevo: <span className="font-semibold">{searchQuery.trim()}</span>
                </span>
              </button>
            )}
          </div>
        )}

        {open && canCreateNew && filteredOptions.length === 0 && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md"
          >
            <button
              type="button"
              onClick={() => handleCreateNew(searchQuery.trim())}
              className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2 hover:bg-muted"
            >
              <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">
                Crear nuevo: <span className="font-semibold">{searchQuery.trim()}</span>
              </span>
            </button>
          </div>
        )}

        {open && searchQuery && filteredOptions.length === 0 && !canCreateNew && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md p-3">
            <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

