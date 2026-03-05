"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, ExternalLink, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttachmentMeta {
  url: string;
  filename: string;
  type: string;
  size?: number;
}

function parseAttachments(value: unknown): AttachmentMeta[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is AttachmentMeta =>
        typeof item === "object" && item !== null && "url" in item
    );
  }
  if (typeof value === "string" && value.trim()) {
    return [{ url: value.trim(), filename: "attachment", type: "unknown" }];
  }
  return [];
}

function isPdf(att: AttachmentMeta): boolean {
  if (att.type?.includes("pdf")) return true;
  return /\.pdf(\?|$)/i.test(att.url) || /\.pdf$/i.test(att.filename);
}

function isImage(att: AttachmentMeta): boolean {
  if (att.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(att.url) ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename);
}

function FileIcon({ att }: { att: AttachmentMeta }) {
  if (isPdf(att)) return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (isImage(att)) return <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  return <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InlinePreview({ att, onClose }: { att: AttachmentMeta; onClose: () => void }) {
  if (isPdf(att)) {
    return (
      <div className="mt-2 border rounded-lg overflow-hidden bg-white relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1 hover:bg-gray-100 shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>
        <iframe
          src={att.url}
          className="w-full h-[500px]"
          title={att.filename}
        />
      </div>
    );
  }

  if (isImage(att)) {
    return (
      <div className="mt-2 border rounded-lg overflow-hidden bg-white relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1 hover:bg-gray-100 shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={att.url}
          alt={att.filename}
          className="max-w-full max-h-[500px] object-contain mx-auto p-2"
        />
      </div>
    );
  }

  return null;
}

interface AttachmentViewerProps {
  value: unknown;
  className?: string;
}

export function AttachmentViewer({ value, className }: AttachmentViewerProps) {
  const attachments = parseAttachments(value);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (attachments.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic">Sin documentos</span>
    );
  }

  const visible = showAll ? attachments : attachments.slice(0, 3);

  return (
    <div className={cn("space-y-1", className)}>
      {visible.map((att, idx) => {
        const key = `${att.filename}-${idx}`;
        const isExpanded = expanded === key;
        const canPreview = isPdf(att) || isImage(att);

        return (
          <div key={key}>
            <div className="flex items-center gap-2 group">
              <FileIcon att={att} />
              <button
                onClick={() => {
                  if (canPreview) {
                    setExpanded(isExpanded ? null : key);
                  } else {
                    window.open(att.url, "_blank");
                  }
                }}
                className="flex-1 min-w-0 text-left text-sm text-[var(--prophero-blue-500)] hover:underline truncate"
                title={att.filename}
              >
                {att.filename}
              </button>
              {att.size != null && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatFileSize(att.size)}
                </span>
              )}
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
              {canPreview && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
            {isExpanded && (
              <InlinePreview att={att} onClose={() => setExpanded(null)} />
            )}
          </div>
        );
      })}
      {attachments.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-[var(--prophero-blue-500)] hover:underline"
        >
          +{attachments.length - 3} más
        </button>
      )}
    </div>
  );
}
