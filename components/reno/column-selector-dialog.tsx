"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, X, GripVertical, Hash, MapPin, User, Wrench, Calendar, Clock, BarChart3, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";

type SortColumn = "id" | "address" | "region" | "renovador" | "renoType" | "estimatedVisit" | "proximaActualizacion" | "progress" | "status";

interface ColumnConfig {
  key: SortColumn;
  label: string;
  defaultVisible: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  category?: "shown" | "popular" | "hidden";
}

interface ColumnSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnConfig[];
  visibleColumns: Set<SortColumn>;
  phase: RenoKanbanPhase;
  phaseLabel: string;
  onSave: (visibleColumns: Set<SortColumn>) => void;
}

export function ColumnSelectorDialog({
  open,
  onOpenChange,
  columns,
  visibleColumns,
  phase,
  phaseLabel,
  onSave,
}: ColumnSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<SortColumn>>(visibleColumns);
  const [columnOrder, setColumnOrder] = useState<SortColumn[]>(() => {
    // Initialize order: visible columns first (in their original order), then hidden
    const visible = columns.filter(col => visibleColumns.has(col.key));
    const hidden = columns.filter(col => !visibleColumns.has(col.key));
    return [...visible.map(col => col.key), ...hidden.map(col => col.key)];
  });

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const query = searchQuery.toLowerCase();
    return columns.filter(col => 
      col.label.toLowerCase().includes(query)
    );
  }, [columns, searchQuery]);

  // Group columns by category
  const groupedColumns = useMemo(() => {
    const shown: ColumnConfig[] = [];
    const popular: ColumnConfig[] = [];
    const hidden: ColumnConfig[] = [];

    filteredColumns.forEach(col => {
      const isVisible = localVisibleColumns.has(col.key);
      if (isVisible) {
        shown.push(col);
      } else if (col.category === "popular") {
        popular.push(col);
      } else {
        hidden.push(col);
      }
    });

    return { shown, popular, hidden };
  }, [filteredColumns, localVisibleColumns]);

  const toggleColumn = (columnKey: SortColumn) => {
    setLocalVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave(localVisibleColumns);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleCancel = () => {
    setLocalVisibleColumns(visibleColumns);
    setSearchQuery("");
    onOpenChange(false);
  };

  const hasChanges = useMemo(() => {
    if (localVisibleColumns.size !== visibleColumns.size) return true;
    for (const col of localVisibleColumns) {
      if (!visibleColumns.has(col)) return true;
    }
    for (const col of visibleColumns) {
      if (!localVisibleColumns.has(col)) return true;
    }
    return false;
  }, [localVisibleColumns, visibleColumns]);

  const renderColumnItem = (column: ColumnConfig, isDraggable = false) => {
    const isVisible = localVisibleColumns.has(column.key);
    
    return (
      <div
        key={column.key}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          "hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)]",
          isVisible && "bg-accent/50 dark:bg-[var(--prophero-gray-800)]/50"
        )}
      >
        {isDraggable && isVisible && (
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
        )}
        {!isDraggable && (
          <div className="w-4 flex-shrink-0" /> // Spacer for alignment
        )}
        {column.icon && (
          <div className="flex-shrink-0 text-muted-foreground">
            <column.icon className="h-4 w-4" />
          </div>
        )}
        <Label
          htmlFor={`column-${column.key}`}
          className={cn(
            "flex-1 cursor-pointer text-sm font-medium",
            isVisible ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {column.label}
        </Label>
        <Switch
          checked={isVisible}
          onCheckedChange={() => toggleColumn(column.key)}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">Columnas</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {phaseLabel}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar columnas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Column List */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Shown Section */}
            {groupedColumns.shown.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    Mostradas
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setLocalVisibleColumns(new Set());
                    }}
                  >
                    Ocultar todas
                  </Button>
                </div>
                <div className="space-y-1">
                  {groupedColumns.shown.map(column => renderColumnItem(column, true))}
                </div>
              </div>
            )}

            {/* Popular Section */}
            {groupedColumns.popular.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Populares
                  </Label>
                  <div className="space-y-1">
                    {groupedColumns.popular.map(column => renderColumnItem(column))}
                  </div>
                </div>
              </>
            )}

            {/* Hidden Section */}
            {groupedColumns.hidden.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Ocultas
                  </Label>
                  <div className="space-y-1">
                    {groupedColumns.hidden.map(column => renderColumnItem(column))}
                  </div>
                </div>
              </>
            )}

            {/* No results */}
            {filteredColumns.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No se encontraron columnas
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Save Button */}
        <div className="px-6 py-4 border-t bg-accent/50 dark:bg-[var(--prophero-gray-800)]/50">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full"
          >
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

