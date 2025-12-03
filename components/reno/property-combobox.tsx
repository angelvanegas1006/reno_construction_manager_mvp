"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Check } from "lucide-react";
import type { Property } from "@/lib/property-storage";

interface PropertyComboboxProps {
  properties: Property[];
  value?: Property | null;
  onValueChange: (property: Property | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PropertyCombobox({
  properties,
  value,
  onValueChange,
  placeholder = "Buscar propiedad...",
  disabled = false,
}: PropertyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter properties based on search query
  const filteredProperties = properties.filter((property) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const address = (property.fullAddress || property.address || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const id = (property.id || "").toLowerCase();
    return address.includes(query) || id.includes(query);
  });

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredProperties.length, searchQuery]);

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
      setSelectedIndex((prev) => (prev < filteredProperties.length - 1 ? prev + 1 : prev));
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
    } else if (e.key === "Enter" && open && filteredProperties[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredProperties[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (property: Property) => {
    onValueChange(property);
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

  const displayValue = value ? (value.fullAddress || value.address || value.id) : "";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={open ? searchQuery : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
        {value && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onValueChange(null);
              setSearchQuery("");
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {open && filteredProperties.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-800)] border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] rounded-md shadow-md max-h-60 overflow-y-auto"
        >
          {filteredProperties.map((property, index) => {
            const address = property.fullAddress || property.address || property.id;
            const isSelected = value?.id === property.id;
            const isHighlighted = index === selectedIndex;

            return (
              <button
                key={property.id}
                type="button"
                onClick={() => handleSelect(property)}
                className={cn(
                  "w-full text-left px-3 py-2 transition-colors",
                  "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)]",
                  isHighlighted && "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20",
                  isSelected && "bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{address}</p>
                    {property.uniqueIdFromEngagements && (
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {property.uniqueIdFromEngagements}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && searchQuery && filteredProperties.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-md p-3">
          <p className="text-sm text-muted-foreground">No se encontraron propiedades</p>
        </div>
      )}
    </div>
  );
}

