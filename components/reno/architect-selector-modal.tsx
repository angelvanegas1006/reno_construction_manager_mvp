"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, ArrowLeft, Loader2, User, Building2, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Architect {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

interface ArchitectSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentArchitect: string | null;
  airtableProjectId: string | null;
  onSelect: (architect: { id: string; name: string }) => void;
}

type ModalView = "list" | "create";

export function ArchitectSelectorModal({
  open,
  onOpenChange,
  currentArchitect,
  airtableProjectId,
  onSelect,
}: ArchitectSelectorModalProps) {
  const [view, setView] = useState<ModalView>("list");
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchArchitects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/airtable/architects");
      if (!res.ok) throw new Error("Error fetching architects");
      const data = await res.json();
      setArchitects(data.architects ?? []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar arquitectos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setView("list");
      setSearchQuery("");
      setSelecting(null);
      resetForm();
      fetchArchitects();
    }
  }, [open, fetchArchitects]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCompany("");
    setFormPhone("");
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return architects;
    const q = searchQuery.toLowerCase();
    return architects.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.company && a.company.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [architects, searchQuery]);

  const writeBackToAirtable = async (architectRecordId: string) => {
    if (!airtableProjectId) return;
    try {
      await fetch("/api/airtable/projects/update-architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airtable_project_id: airtableProjectId,
          architect_record_id: architectRecordId,
        }),
      });
    } catch {
      console.warn("Write-back to Airtable failed (non-blocking)");
    }
  };

  const handleSelect = async (architect: Architect) => {
    setSelecting(architect.id);
    try {
      onSelect({ id: architect.id, name: architect.name });
      await writeBackToAirtable(architect.id);
      onOpenChange(false);
    } finally {
      setSelecting(null);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!formEmail.trim()) {
      toast.error("El email es obligatorio");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/airtable/architects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          company: formCompany.trim() || undefined,
          phone: formPhone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear arquitecto");
      }

      const data = await res.json();
      toast.success(`Arquitecto "${data.name}" creado correctamente`);

      onSelect({ id: data.id, name: data.name });
      await writeBackToAirtable(data.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al crear arquitecto");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "create" && (
              <button
                onClick={() => setView("list")}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {view === "list" ? "Seleccionar Arquitecto" : "Nuevo Arquitecto"}
          </DialogTitle>
        </DialogHeader>

        {view === "list" ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, empresa o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Cargando arquitectos...
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <User className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No se encontraron arquitectos"
                      : "No hay arquitectos disponibles"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((arch) => {
                    const isCurrentArchitect =
                      currentArchitect &&
                      arch.name.toLowerCase() === currentArchitect.toLowerCase();
                    const isSelecting = selecting === arch.id;

                    return (
                      <button
                        key={arch.id}
                        onClick={() => handleSelect(arch)}
                        disabled={!!selecting}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3",
                          isCurrentArchitect && "bg-blue-50 dark:bg-blue-950/30"
                        )}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {arch.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {arch.name}
                            {isCurrentArchitect && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (actual)
                              </span>
                            )}
                          </div>
                          {(arch.company || arch.email) && (
                            <div className="text-xs text-muted-foreground truncate">
                              {[arch.company, arch.email]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                        </div>
                        {isSelecting && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setView("create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear nuevo arquitecto
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="arch-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="arch-name"
                placeholder="Nombre completo del arquitecto"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arch-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="arch-email"
                type="email"
                placeholder="email@ejemplo.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arch-company" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Empresa
              </Label>
              <Input
                id="arch-company"
                placeholder="Nombre de la empresa (opcional)"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arch-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Teléfono
              </Label>
              <Input
                id="arch-phone"
                type="tel"
                placeholder="+34 600 000 000 (opcional)"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setView("list")}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={creating || !formName.trim() || !formEmail.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear y asignar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
