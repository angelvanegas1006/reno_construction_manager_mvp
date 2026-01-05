"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseUsers, AppUser } from "@/hooks/useSupabaseUsers";
import { cn } from "@/lib/utils";

interface MentionsTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * MentionsTextarea Component
 * 
 * Textarea con soporte para @mentions
 * - Detecta cuando el usuario escribe @
 * - Muestra lista de usuarios disponibles
 * - Permite seleccionar usuario con teclado o mouse
 */
export function MentionsTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  disabled,
}: MentionsTextareaProps) {
  const { users, loading } = useSupabaseUsers();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AppUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filtrar usuarios basado en el texto después de @
  const filterUsers = (query: string) => {
    if (!query) return users.slice(0, 5);
    
    const lowerQuery = query.toLowerCase();
    return users
      .filter(
        (user) =>
          user.email.toLowerCase().includes(lowerQuery) ||
          user.name?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  };

  // Manejar cambios en el texto
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    onChange(newValue);

    // Buscar @ antes del cursor
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Verificar que no hay espacio entre @ y cursor
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        // Estamos escribiendo un mention
        setMentionStart(lastAtIndex);
        const query = textAfterAt;
        const filtered = filterUsers(query);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
        return;
      }
    }

    // No estamos en un mention
    setShowSuggestions(false);
    setMentionStart(null);
  };

  // Insertar mention seleccionado
  const insertMention = (user: AppUser) => {
    if (mentionStart === null || !textareaRef.current) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(textareaRef.current.selectionStart);
    const mentionText = `@${user.email.split("@")[0]}`;
    const newValue = `${beforeMention}${mentionText} ${afterMention}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);

    // Restaurar focus y cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Manejar teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setMentionStart(null);
    }
  };

  // Obtener posición del cursor para mostrar sugerencias
  useEffect(() => {
    if (!showSuggestions || !textareaRef.current || !suggestionsRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1 && mentionStart !== null) {
      // Calcular posición aproximada del @
      const textBeforeAt = value.substring(0, lastAtIndex);
      const lines = textBeforeAt.split("\n");
      const lineNumber = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;

      // Posicionar sugerencias (simplificado - podría mejorarse)
      // Por ahora las mostramos debajo del textarea
    }
  }, [showSuggestions, value, mentionStart]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "resize-none",
          "border-[var(--prophero-gray-200)] dark:border-[#333333]",
          "bg-[var(--prophero-gray-50)] dark:bg-[#1a1a1a]",
          "focus:border-[var(--prophero-blue-400)] dark:focus:border-[var(--prophero-blue-500)]",
          "focus:ring-1 focus:ring-[var(--prophero-blue-400)] dark:focus:ring-[var(--prophero-blue-500)]",
          "focus:ring-opacity-20",
          "transition-colors",
          className
        )}
        disabled={disabled}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-card dark:bg-[#1a1a1a] border border-[var(--prophero-gray-200)] dark:border-[#333333] rounded-md shadow-md max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={cn(
                "w-full text-left px-3 py-2 transition-colors",
                "hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#262626]",
                index === selectedIndex && "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg p-2">
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        </div>
      )}
    </div>
  );
}

