"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // ISO datetime string (YYYY-MM-DDTHH:mm)
  onChange: (datetime: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  errorMessage?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY HH:mm",
  className,
  disabled = false,
  errorMessage,
}: DateTimePickerProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Convert ISO datetime (YYYY-MM-DDTHH:mm) to DD/MM/YYYY HH:mm for display
  const formatDateTimeForDisplay = (isoDateTime?: string): string => {
    if (!isoDateTime) return "";
    try {
      const date = new Date(isoDateTime);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Convert DD/MM/YYYY HH:mm to ISO datetime (YYYY-MM-DDTHH:mm)
  const parseDateTimeFromDisplay = (displayDateTime: string): string | null => {
    const parts = displayDateTime.trim().split(" ");
    if (parts.length !== 2) return null;
    
    const datePart = parts[0];
    const timePart = parts[1];
    
    // Parse date
    const dateParts = datePart.split("/");
    if (dateParts.length !== 3) return null;
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    
    // Parse time
    const timeParts = timePart.split(":");
    if (timeParts.length !== 2) return null;
    
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    if (
      isNaN(day) || isNaN(month) || isNaN(year) ||
      isNaN(hours) || isNaN(minutes)
    ) return null;
    
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    try {
      const date = new Date(year, month - 1, day, hours, minutes);
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year ||
        date.getHours() !== hours ||
        date.getMinutes() !== minutes
      ) {
        return null; // Invalid datetime
      }
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    } catch {
      return null;
    }
  };

  // Validate that datetime is in the future
  const isFutureDateTime = (isoDateTime: string): boolean => {
    const date = new Date(isoDateTime);
    const now = new Date();
    return date > now;
  };

  // Initialize display value from ISO datetime
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDateTimeForDisplay(value));
      // Validate on mount
      if (!isFutureDateTime(value)) {
        setError(errorMessage || "La fecha y hora deben ser futuras");
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
    const isoDateTime = parseDateTimeFromDisplay(input);
    if (isoDateTime) {
      if (isFutureDateTime(isoDateTime)) {
        setError(null);
        onChange(isoDateTime);
      } else {
        setError(errorMessage || "La fecha y hora deben ser futuras");
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
    const currentTime = timeInputRef.current?.value || "09:00";
    const isoDateTime = `${isoDate}T${currentTime}`;
    
    if (isoDate && currentTime) {
      if (isFutureDateTime(isoDateTime)) {
        setError(null);
        onChange(isoDateTime);
        setDisplayValue(formatDateTimeForDisplay(isoDateTime));
      } else {
        setError(errorMessage || "La fecha y hora deben ser futuras");
        onChange(undefined);
      }
    }
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value; // Already in HH:mm format
    const currentDate = dateInputRef.current?.value || "";
    const isoDateTime = currentDate ? `${currentDate}T${time}` : undefined;
    
    if (currentDate && time) {
      if (isFutureDateTime(isoDateTime!)) {
        setError(null);
        onChange(isoDateTime);
        setDisplayValue(formatDateTimeForDisplay(isoDateTime));
      } else {
        setError(errorMessage || "La fecha y hora deben ser futuras");
        onChange(undefined);
      }
    }
  };

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      // Set min date to today
      const today = new Date();
      dateInputRef.current.min = today.toISOString().split("T")[0];
      dateInputRef.current.showPicker();
    }
  };

  const handleTimeClick = () => {
    if (timeInputRef.current) {
      timeInputRef.current.showPicker();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Validate on blur
    if (displayValue && !error) {
      const isoDateTime = parseDateTimeFromDisplay(displayValue);
      if (isoDateTime && !isFutureDateTime(isoDateTime)) {
        setError(errorMessage || "La fecha y hora deben ser futuras");
      }
    }
  };

  // Extract date and time from value for native inputs
  const dateValue = value ? value.split("T")[0] : "";
  const timeValue = value ? value.split("T")[1]?.slice(0, 5) : "";

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
          "pr-20",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      
      {/* Hidden date input for native date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={dateValue}
        onChange={handleDateInputChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        disabled={disabled}
        min={(() => {
          const today = new Date();
          return today.toISOString().split("T")[0];
        })()}
      />
      
      {/* Hidden time input for native time picker */}
      <input
        ref={timeInputRef}
        type="time"
        value={timeValue}
        onChange={handleTimeInputChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        disabled={disabled}
      />
      
      {/* Calendar icon button */}
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        className={cn(
          "absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
          "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isFocused && "bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
        )}
        aria-label="Abrir calendario"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Clock icon button */}
      <button
        type="button"
        onClick={handleTimeClick}
        disabled={disabled}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
          "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isFocused && "bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
        )}
        aria-label="Abrir selector de hora"
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
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


