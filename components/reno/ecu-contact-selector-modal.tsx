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

interface EcuContact {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

interface EcuContactSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContact: string | null;
  airtableProjectId: string | null;
  onSelect: (contact: { id: string; name: string }) => void;
}

type ModalView = "list" | "create";

export function EcuContactSelectorModal({
  open,
  onOpenChange,
  currentContact,
  airtableProjectId,
  onSelect,
}: EcuContactSelectorModalProps) {
  const [view, setView] = useState<ModalView>("list");
  const [contacts, setContacts] = useState<EcuContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/airtable/ecu-contacts");
      if (!res.ok) throw new Error("Error fetching ECU contacts");
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar contactos ECU");
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
      fetchContacts();
    }
  }, [open, fetchContacts]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCompany("");
    setFormPhone("");
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  const writeBackToAirtable = async (contactRecordId: string) => {
    if (!airtableProjectId) return;
    try {
      await fetch("/api/airtable/projects/update-ecu-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airtable_project_id: airtableProjectId,
          ecu_contact_record_id: contactRecordId,
        }),
      });
    } catch {
      console.warn("Write-back to Airtable failed (non-blocking)");
    }
  };

  const handleSelect = async (contact: EcuContact) => {
    setSelecting(contact.id);
    try {
      onSelect({ id: contact.id, name: contact.name });
      await writeBackToAirtable(contact.id);
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

    setCreating(true);
    try {
      const res = await fetch("/api/airtable/ecu-contacts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          company: formCompany.trim() || undefined,
          phone: formPhone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear contacto ECU");
      }

      const data = await res.json();
      toast.success(`Contacto ECU "${data.name}" creado correctamente`);
      onSelect({ id: data.id, name: data.name });
      await writeBackToAirtable(data.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al crear contacto ECU");
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
            {view === "list" ? "Seleccionar Contacto ECU" : "Nuevo Contacto ECU"}
          </DialogTitle>
        </DialogHeader>

        {view === "list" ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, empresa o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando contactos ECU...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <User className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No se encontraron contactos" : "No hay contactos ECU disponibles"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((contact) => {
                    const isCurrent =
                      currentContact &&
                      contact.name.toLowerCase() === currentContact.toLowerCase();
                    const isSelecting = selecting === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelect(contact)}
                        disabled={!!selecting}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3",
                          isCurrent && "bg-blue-50 dark:bg-blue-950/30"
                        )}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {contact.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {contact.name}
                            {isCurrent && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(actual)</span>
                            )}
                          </div>
                          {(contact.company || contact.email) && (
                            <div className="text-xs text-muted-foreground truncate">
                              {[contact.company, contact.email].filter(Boolean).join(" · ")}
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

            <Button variant="outline" className="w-full" onClick={() => setView("create")}>
              <Plus className="h-4 w-4 mr-2" />
              Crear nuevo contacto ECU
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ecu-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ecu-name"
                placeholder="Nombre completo del contacto ECU"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ecu-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="ecu-email"
                type="email"
                placeholder="email@ejemplo.com (opcional)"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ecu-company" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Empresa
              </Label>
              <Input
                id="ecu-company"
                placeholder="Nombre de la empresa (opcional)"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ecu-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Teléfono
              </Label>
              <Input
                id="ecu-phone"
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
                disabled={creating || !formName.trim()}
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
