"use client";

import { useState } from 'react';
import { PdfViewer } from './pdf-viewer';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MultiBudgetViewerProps {
  budgetUrls: string[];
  pdfErrors?: Record<number, string | null>;
  onRetry?: (index: number) => void;
}

export function MultiBudgetViewer({ 
  budgetUrls, 
  pdfErrors = {},
  onRetry 
}: MultiBudgetViewerProps) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  // Si solo hay un PDF, mostrar sin colapsar
  const isSinglePdf = budgetUrls.length === 1;

  const toggleBudget = (index: number) => {
    setOpenIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Si hay múltiples PDFs, inicializar todos colapsados excepto el primero
  if (budgetUrls.length > 1 && openIndices.size === 0) {
    // No hacer nada aquí, se inicializará en el primer render
  }

  return (
    <div className="space-y-4">
      {budgetUrls.map((url, index) => {
        const budgetNumber = index + 1;
        const proxyPdfUrl = url && url.startsWith('http')
          ? `/api/proxy-pdf?url=${encodeURIComponent(url)}`
          : null;
        const isOpen = isSinglePdf || openIndices.has(index);
        const error = pdfErrors[index];

        const budgetContent = (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isSinglePdf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBudget(index)}
                    className="h-8 w-8 p-0"
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <h3 className="text-lg font-semibold">
                  Presupuesto {budgetNumber}
                </h3>
              </div>
              {proxyPdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(proxyPdfUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir en nueva pestaña
                </Button>
              )}
            </div>
            {error ? (
              <div className="w-full border rounded-lg p-6 bg-muted/50">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                  <div className="text-center">
                    <p className="font-semibold text-lg">Error al cargar el PDF</p>
                    <p className="text-sm text-muted-foreground mt-2">{error}</p>
                    <p className="text-xs text-muted-foreground mt-4 break-all">
                      URL: {url.substring(0, 100)}...
                    </p>
                  </div>
                  {onRetry && (
                    <Button
                      variant="outline"
                      onClick={() => onRetry(index)}
                    >
                      Reintentar
                    </Button>
                  )}
                </div>
              </div>
            ) : proxyPdfUrl ? (
              <PdfViewer 
                fileUrl={proxyPdfUrl} 
                fileName={url?.split('/').pop() || `budget-${budgetNumber}.pdf`} 
              />
            ) : (
              <div className="w-full border rounded-lg p-6 bg-muted/50 text-center">
                <p className="text-muted-foreground">URL de presupuesto no válida</p>
              </div>
            )}
          </div>
        );

        if (isSinglePdf) {
          return <div key={index}>{budgetContent}</div>;
        }

        return (
          <Collapsible
            key={index}
            open={isOpen}
            onOpenChange={(open) => {
              if (open) {
                setOpenIndices(prev => new Set(prev).add(index));
              } else {
                setOpenIndices(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(index);
                  return newSet;
                });
              }
            }}
          >
            <div className="border rounded-lg p-4">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                    <h3 className="text-lg font-semibold">
                      Presupuesto {budgetNumber}
                    </h3>
                  </div>
                  {proxyPdfUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(proxyPdfUrl, '_blank');
                      }}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {error ? (
                  <div className="w-full border rounded-lg p-6 bg-muted/50">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <AlertTriangle className="h-12 w-12 text-destructive" />
                      <div className="text-center">
                        <p className="font-semibold text-lg">Error al cargar el PDF</p>
                        <p className="text-sm text-muted-foreground mt-2">{error}</p>
                      </div>
                      {onRetry && (
                        <Button
                          variant="outline"
                          onClick={() => onRetry(index)}
                        >
                          Reintentar
                        </Button>
                      )}
                    </div>
                  </div>
                ) : proxyPdfUrl ? (
                  <PdfViewer 
                    fileUrl={proxyPdfUrl} 
                    fileName={url?.split('/').pop() || `budget-${budgetNumber}.pdf`} 
                  />
                ) : (
                  <div className="w-full border rounded-lg p-6 bg-muted/50 text-center mt-4">
                    <p className="text-muted-foreground">URL de presupuesto no válida</p>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
