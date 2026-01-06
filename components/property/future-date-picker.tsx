"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FutureDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  errorMessage?: string;
}

export function FutureDatePicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className,
  disabled = false,
  errorMessage,
}: FutureDatePickerProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY for display
  const formatDateForDisplay = (isoDate?: string): string => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  // Convert DD/MM/YYYY to ISO date (YYYY-MM-DD)
  const parseDateFromDisplay = (displayDate: string): string | null => {
    const parts = displayDate.split("/");
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    
    try {
      const date = new Date(year, month - 1, day);
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year
      ) {
        return null; // Invalid date
      }
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    } catch {
      return null;
    }
  };

  // Validate that date is in the future
  const isFutureDate = (isoDate: string): boolean => {
    const date = new Date(isoDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  // Initialize display value from ISO date
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDateForDisplay(value));
      // Validate on mount
      if (!isFutureDate(value)) {
        setError(errorMessage || "La fecha debe ser futura");
      } else {
        setError(null);
      }
    } else {
      setDisplayValue("");
      setError(null);
    }
  }, [value, errorMessage]);

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);
    
    // Try to parse as user types
    const isoDate = parseDateFromDisplay(input);
    if (isoDate) {
      if (isFutureDate(isoDate)) {
        setError(null);
        onChange(isoDate);
      } else {
        setError(errorMessage || "La fecha debe ser futura");
        onChange(undefined);
      }
    } else if (input === "") {
      setError(null);
      onChange(undefined);
    } else {
      // Invalid format but not empty - don't show error while typing
      setError(null);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value; // Already in YYYY-MM-DD format
    if (isoDate) {
      if (isFutureDate(isoDate)) {
        setError(null);
        onChange(isoDate);
        setDisplayValue(formatDateForDisplay(isoDate));
      } else {
        setError(errorMessage || "La fecha debe ser futura");
        onChange(undefined);
      }
    } else {
      setError(null);
      onChange(undefined);
    }
  };

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      // Set min date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInputRef.current.min = tomorrow.toISOString().split("T")[0];
      dateInputRef.current.showPicker();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Validate on blur
    if (displayValue && !error) {
      const isoDate = parseDateFromDisplay(displayValue);
      if (isoDate && !isFutureDate(isoDate)) {
        setError(errorMessage || "La fecha debe ser futura");
      }
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleDisplayChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pr-10",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      
      {/* Hidden date input for native date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={value || ""}
        onChange={handleDateInputChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        disabled={disabled}
        min={(() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split("T")[0];
        })()}
      />
      
      {/* Calendar icon button */}
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
          "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isFocused && "bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
        )}
        aria-label="Abrir calendario"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

