"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";

type SortColumn = "id" | "address" | "region" | "renovador" | "renoType" | "estimatedVisit" | "proximaActualizacion" | "progress" | "status" | "daysToVisit" | "daysToStartRenoSinceRSD" | "renoDuration" | "daysToPropertyReady" | "budgetPhReadyDate" | "renovatorBudgetApprovalDate" | "initialVisitDate" | "estRenoStartDate" | "renoStartDate" | "renoEstimatedEndDate" | "renoEndDate";

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
  onSave: (visibleColumns: Set<SortColumn>, columnOrder?: SortColumn[]) => void;
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
  const [draggedColumn, setDraggedColumn] = useState<SortColumn | null>(null);
  const [columnOrder, setColumnOrder] = useState<SortColumn[]>(() => {
    // Initialize order: visible columns first (in their original order), then hidden
    const visible = columns.filter(col => visibleColumns.has(col.key));
    const hidden = columns.filter(col => !visibleColumns.has(col.key));
    return [...visible.map(col => col.key), ...hidden.map(col => col.key)];
  });

  // Reset order when dialog opens or visibleColumns change
  useEffect(() => {
    if (open) {
      const visible = columns.filter(col => visibleColumns.has(col.key));
      const hidden = columns.filter(col => !visibleColumns.has(col.key));
      setColumnOrder([...visible.map(col => col.key), ...hidden.map(col => col.key)]);
      setLocalVisibleColumns(visibleColumns);
      setSearchQuery("");
    }
  }, [open, visibleColumns, columns]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const query = searchQuery.toLowerCase();
    return columns.filter(col => 
      col.label.toLowerCase().includes(query)
    );
  }, [columns, searchQuery]);

  // Group columns by category, respecting the order
  const groupedColumns = useMemo(() => {
    const shown: ColumnConfig[] = [];
    const popular: ColumnConfig[] = [];
    const hidden: ColumnConfig[] = [];

    // Use columnOrder to maintain order
    const orderedColumns = columnOrder
      .map(key => columns.find(col => col.key === key))
      .filter((col): col is ColumnConfig => col !== undefined);

    orderedColumns.forEach(col => {
      // Only include if it matches the search filter
      if (filteredColumns.find(fc => fc.key === col.key)) {
        const isVisible = localVisibleColumns.has(col.key);
        if (isVisible) {
          shown.push(col);
        } else if (col.category === "popular") {
          popular.push(col);
        } else {
          hidden.push(col);
        }
      }
    });

    return { shown, popular, hidden };
  }, [filteredColumns, localVisibleColumns, columnOrder, columns]);

  const toggleColumn = (columnKey: SortColumn) => {
    setLocalVisibleColumns(prev => {
      const newSet = new Set(prev);
      const wasVisible = newSet.has(columnKey);
      
      if (wasVisible) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      
      // Update order: if making visible, add to visible section; if hiding, move to hidden section
      setColumnOrder(prevOrder => {
        const newOrder = [...prevOrder];
        const currentIndex = newOrder.indexOf(columnKey);
        
        if (currentIndex === -1) return prevOrder;
        
        if (!wasVisible) {
          // Making visible: move to visible section (after last visible)
          const visibleCount = newOrder.filter(key => newSet.has(key)).length;
          newOrder.splice(currentIndex, 1);
          newOrder.splice(visibleCount - 1, 0, columnKey);
        } else {
          // Hiding: move to end
          newOrder.splice(currentIndex, 1);
          newOrder.push(columnKey);
        }
        
        return newOrder;
      });
      
      return newSet;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnKey: SortColumn) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnKey);
    // Add a slight delay to make drag feel more responsive
    setTimeout(() => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: SortColumn) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      return;
    }
    
    // Only allow reordering within visible columns
    if (!localVisibleColumns.has(draggedColumn) || !localVisibleColumns.has(targetColumnKey)) {
      setDraggedColumn(null);
      return;
    }

    setColumnOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Remove dragged item and insert at target position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);
      
      return newOrder;
    });
    
    setDraggedColumn(null);
  };

  const handleSave = () => {
    // Save both visibility and order
    onSave(localVisibleColumns, columnOrder);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleCancel = () => {
    setLocalVisibleColumns(visibleColumns);
    setSearchQuery("");
    onOpenChange(false);
  };

  const hasChanges = useMemo(() => {
    // Check if visibility changed
    if (localVisibleColumns.size !== visibleColumns.size) return true;
    for (const col of localVisibleColumns) {
      if (!visibleColumns.has(col)) return true;
    }
    for (const col of visibleColumns) {
      if (!localVisibleColumns.has(col)) return true;
    }
    
    // Check if order changed (only for visible columns)
    const visibleOrder = columnOrder.filter(key => localVisibleColumns.has(key));
    const originalVisibleOrder = columns
      .filter(col => visibleColumns.has(col.key))
      .map(col => col.key);
    
    if (visibleOrder.length !== originalVisibleOrder.length) return true;
    for (let i = 0; i < visibleOrder.length; i++) {
      if (visibleOrder[i] !== originalVisibleOrder[i]) return true;
    }
    
    return false;
  }, [localVisibleColumns, visibleColumns, columnOrder, columns]);

  const renderColumnItem = (column: ColumnConfig, isDraggable = false) => {
    const isVisible = localVisibleColumns.has(column.key);
    const isDragging = draggedColumn === column.key;
    
    return (
      <div
        key={column.key}
        draggable={isDraggable && isVisible}
        onDragStart={(e) => isDraggable && isVisible && handleDragStart(e, column.key)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          if (isDraggable && isVisible) {
            handleDragOver(e);
          }
        }}
        onDrop={(e) => isDraggable && isVisible && handleDrop(e, column.key)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          "hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)]",
          isVisible && "bg-accent/50 dark:bg-[var(--prophero-gray-800)]/50",
          isDragging && "opacity-50 cursor-grabbing",
          isDraggable && isVisible && "cursor-grab active:cursor-grabbing"
        )}
      >
        {isDraggable && isVisible && (
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
        )}
        {!isDraggable && (
          <div className="w-4 flex-shrink-0" /> // Spacer for alignment
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
          <div>
            <DialogTitle className="text-lg font-semibold">Columnas</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {phaseLabel}
            </DialogDescription>
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

