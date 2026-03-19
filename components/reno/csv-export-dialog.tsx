"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet } from "lucide-react";

export interface CsvColumn {
  key: string;
  label: string;
}

interface CsvExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: CsvColumn[];
  defaultSelected?: Set<string>;
  rows: Record<string, unknown>[];
  filenamePrefix?: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key])).join(",")
  );
  return [header, ...body].join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CsvExportDialog({
  open,
  onOpenChange,
  columns,
  defaultSelected,
  rows,
  filenamePrefix = "export",
}: CsvExportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    defaultSelected ?? new Set(columns.map((c) => c.key))
  );

  const allSelected = selected.size === columns.length;
  const noneSelected = selected.size === 0;

  const toggleColumn = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(columns.map((c) => c.key)));
    }
  }, [allSelected, columns]);

  const selectedColumns = useMemo(
    () => columns.filter((c) => selected.has(c.key)),
    [columns, selected]
  );

  const handleExport = useCallback(() => {
    if (selectedColumns.length === 0) return;
    const csv = generateCsv(selectedColumns, rows);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `${filenamePrefix}_${date}.csv`);
    onOpenChange(false);
  }, [selectedColumns, rows, filenamePrefix, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-success" />
            Exportar CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Selecciona las columnas que quieres incluir en la exportación ({rows.length} registros).
          </p>

          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="csv-select-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor="csv-select-all" className="text-sm font-medium cursor-pointer">
              Seleccionar todas
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {columns.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`csv-col-${col.key}`}
                  checked={selected.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <Label
                  htmlFor={`csv-col-${col.key}`}
                  className="text-sm cursor-pointer truncate"
                  title={col.label}
                >
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={noneSelected}
            className="bg-success hover:bg-success text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar ({selectedColumns.length} columnas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
