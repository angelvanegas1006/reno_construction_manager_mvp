"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check, Globe, KeyRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EQA_URL = "https://licencias.eqa.es/Home/Login?ReturnUrl=%2FExpedients%2FIndex";
const EQA_USER = "Prophero";
const EQA_PASS = "Pr0ph3r0";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
      title={`Copiar ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function EcuPageTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Portal EQA</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            EQA no permite integrarse en aplicaciones externas. Accede directamente con las credenciales de PropHero.
          </p>
        </div>

        {/* Credentials card */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Credenciales de acceso
            </p>
          </div>

          <div className="divide-y">
            {/* Username */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    Usuario
                  </p>
                  <p className="text-sm font-mono font-semibold text-foreground">{EQA_USER}</p>
                </div>
              </div>
              <CopyButton value={EQA_USER} label="usuario" />
            </div>

            {/* Password */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    Contraseña
                  </p>
                  <p className="text-sm font-mono font-semibold text-foreground">{EQA_PASS}</p>
                </div>
              </div>
              <CopyButton value={EQA_PASS} label="contraseña" />
            </div>
          </div>
        </div>

        {/* CTA button */}
        <Button
          size="lg"
          className="w-full text-sm font-medium"
          onClick={() => window.open(EQA_URL, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir EQA en nueva pestaña
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Se abrirá en una nueva pestaña del navegador
        </p>
      </div>
    </div>
  );
}
