"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  FolderOpen,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectRow } from "@/hooks/useSupabaseProject";

const PdfViewer = dynamic(
  () =>
    import("@/components/reno/pdf-viewer").then((mod) => ({
      default: mod.PdfViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center"
        style={{ minHeight: "400px" }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Cargando visor de PDF...
          </p>
        </div>
      </div>
    ),
  }
);

type DocEntry = {
  label: string;
  attachments?: { url: string; filename: string }[];
  externalUrl?: string;
};

type DocCategory = {
  title: string;
  entries: DocEntry[];
};

function parseAtts(value: unknown): { url: string; filename: string }[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value.filter((v) => v && typeof v === "object" && v.url);
  return [];
}

const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

function buildCategories(project: ProjectRow): DocCategory[] {
  const p = project as any;

  return [
    {
      title: "Anteproyecto",
      entries: [
        { label: "Planos de Anteproyecto", attachments: parseAtts(p.architect_attachments) },
        { label: "Informe Check Pro", externalUrl: (p.check_pro_report_url as string) || undefined },
        { label: "Mediciones", attachments: parseAtts(p.arch_measurements_doc) },
        { label: "Plano de Borrador", attachments: parseAtts(p.draft_plan) },
      ],
    },
    {
      title: "Proyecto Técnico",
      entries: [
        { label: "Proyecto (PDF)", attachments: parseAtts(p.arch_project_doc) },
        { label: "Proyecto CAD", attachments: parseAtts(p.arch_project_cad_doc) },
        { label: "Documento del Proyecto Técnico", attachments: parseAtts(p.technical_project_doc) },
      ],
    },
    {
      title: "Correcciones / Ajustes",
      entries: [
        { label: "Proyecto Corregido", attachments: parseAtts(p.arch_corrected_project_doc) },
        { label: "Mediciones Corregidas", attachments: parseAtts(p.arch_corrected_measurements_doc) },
      ],
    },
    {
      title: "ECU / Ayuntamiento",
      entries: [
        { label: "Documento Final ECU", attachments: parseAtts(p.ecu_final_delivery_doc) },
        { label: "Documento de Reparos ECU", attachments: parseAtts(p.ecu_reparos_doc) },
        { label: "Licencias Ayuntamiento", attachments: parseAtts(p.license_docs_ayto) },
        { label: "Justificante Ayuntamiento", attachments: parseAtts(p.town_hall_receipt) },
        { label: "Tasas Ayuntamiento", attachments: parseAtts(p.town_hall_fees) },
        { label: "Licencia", attachments: parseAtts(p.license_attachment) },
      ],
    },
    {
      title: "Presupuesto",
      entries: [
        { label: "Presupuesto del Reformista", attachments: parseAtts(p.renovator_budget_doc) },
        { label: "Plan Final", attachments: parseAtts(p.final_plan) },
      ],
    },
    {
      title: "Seguridad / Aprobación",
      entries: [
        { label: "Documento de Seguridad", attachments: parseAtts(p.arch_safety_doc) },
        { label: "Documento de Aprobación", attachments: parseAtts(p.arch_approval_doc) },
      ],
    },
  ];
}

function entryHasContent(e: DocEntry): boolean {
  return (e.attachments != null && e.attachments.length > 0) || !!e.externalUrl;
}

export function ProjectDocumentationTab({ project }: { project: ProjectRow }) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const categories = buildCategories(project);
  const visibleCategories = categories
    .map((cat) => ({ ...cat, entries: cat.entries.filter(entryHasContent) }))
    .filter((cat) => cat.entries.length > 0);

  if (visibleCategories.length === 0) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Sin documentación
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Todavía no se ha subido ningún documento a este proyecto. Los
          documentos aparecerán aquí a medida que se vayan añadiendo en cada
          fase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleCategories.map((cat) => (
        <div
          key={cat.title}
          className="bg-card rounded-lg border shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              {cat.title}
            </h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            {cat.entries.map((entry) => (
              <EntryRenderer
                key={entry.label}
                entry={entry}
                expandedDoc={expandedDoc}
                onToggle={setExpandedDoc}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EntryRenderer({
  entry,
  expandedDoc,
  onToggle,
}: {
  entry: DocEntry;
  expandedDoc: string | null;
  onToggle: (key: string | null) => void;
}) {
  if (entry.externalUrl) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {entry.label}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `/api/proxy-html?url=${encodeURIComponent(entry.externalUrl!)}`,
                "_blank"
              )
            }
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver informe
          </Button>
        </div>
      </div>
    );
  }

  const atts = entry.attachments ?? [];
  if (atts.length === 0) return null;

  const pdfs = atts.filter((a) => isPdf(a.url));
  const nonPdfs = atts.filter((a) => !isPdf(a.url));

  return (
    <div className="space-y-3">
      {pdfs.map((att, idx) => {
        const docKey = `${entry.label}-${idx}`;
        const isExpanded = expandedDoc === docKey;
        const proxyUrl = att.url.startsWith("http")
          ? `/api/proxy-pdf?url=${encodeURIComponent(att.url)}`
          : att.url;

        return (
          <div key={docKey} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => onToggle(isExpanded ? null : docKey)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <h3 className="text-base font-semibold">
                  {pdfs.length === 1
                    ? entry.label
                    : `${entry.label} ${idx + 1}`}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(proxyUrl, "_blank");
                }}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en nueva pestaña
              </Button>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4">
                <PdfViewer fileUrl={proxyUrl} fileName={att.filename} />
              </div>
            )}
          </div>
        );
      })}
      {nonPdfs.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {entry.label}
            {pdfs.length > 0 && " (otros archivos)"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {nonPdfs.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
              >
                {att.filename}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
