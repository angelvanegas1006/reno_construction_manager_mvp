"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ContractsTable } from "@/components/rent/contracts-table";
import { useRentContracts } from "@/hooks/useRentContracts";

export default function ContractsPage() {
  const { t } = useI18n();
  const { contracts, loading, error } = useRentContracts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Gestiona los contratos de alquiler
          </p>
        </div>
        <Link href="/rent/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Contrato
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando contratos...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error al cargar contratos: {error}
        </div>
      )}

      {!loading && !error && (
        <ContractsTable contracts={contracts || []} />
      )}
    </div>
  );
}
















