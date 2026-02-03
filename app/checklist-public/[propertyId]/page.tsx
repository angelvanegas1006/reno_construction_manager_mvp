"use client";

import { use } from "react";
import Link from "next/link";
import { ClipboardCheck, FileCheck } from "lucide-react";

/**
 * Página pública de selección: un único link por propiedad.
 * El usuario elige "Initial check" o "Final check" y accede a la vista pública correspondiente.
 * URL formato: /checklist-public/{propertyId}
 */
export default function PublicChecklistSelectorPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const { propertyId } = resolvedParams;

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <h1 className="text-2xl font-bold">Parámetros inválidos</h1>
          <p className="text-muted-foreground">Falta el ID de la propiedad.</p>
        </div>
      </div>
    );
  }

  const basePath = `/checklist-public/${propertyId}`;

  return (
    <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground">
          Checklist de inspección
        </h1>
        <p className="text-sm text-muted-foreground">
          Elige el tipo de checklist que quieres ver:
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href={`${basePath}/initial`}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg border-2 border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-white dark:bg-card hover:border-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-50)] dark:hover:bg-[var(--prophero-blue-950)]/20 transition-colors text-foreground font-medium"
          >
            <ClipboardCheck className="h-6 w-6 shrink-0" />
            Ver Initial check
          </Link>
          <Link
            href={`${basePath}/final`}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg border-2 border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-white dark:bg-card hover:border-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-50)] dark:hover:bg-[var(--prophero-blue-950)]/20 transition-colors text-foreground font-medium"
          >
            <FileCheck className="h-6 w-6 shrink-0" />
            Ver Final check
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Si el checklist no está disponible aún, finalízalo primero desde la aplicación.
        </p>
      </div>
    </div>
  );
}
