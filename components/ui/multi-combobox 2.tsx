"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MultiComboboxProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function MultiCombobox({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Buscar...",
  disabled = false,
  label,
}: MultiComboboxProps) {
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

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length, searchQuery]);

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
      setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
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
    } else if (e.key === "Enter" && open && filteredOptions[selectedIndex]) {
      e.preventDefault();
      handleToggle(filteredOptions[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    }
  };

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newValues);
    setSearchQuery("");
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedValues.filter((v) => v !== value));
  };

  const handleInputFocus = () => {
    // No abrir automáticamente al hacer focus, solo cuando el usuario empiece a escribir
    if (!disabled && searchQuery.trim()) {
      setOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Solo abrir cuando el usuario empiece a escribir
    if (value.trim()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {label && <label className="text-base font-semibold text-foreground">{label}</label>}
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          />
        </div>

        {/* Selected badges */}
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedValues.map((value) => (
              <Badge
                key={value}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs">{value}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(value, e)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {open && filteredOptions.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md max-h-60 overflow-y-auto"
          >
            {filteredOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option);
              const isHighlighted = index === selectedIndex;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleToggle(option)}
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
          </div>
        )}

        {open && searchQuery && filteredOptions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md p-3">
            <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

