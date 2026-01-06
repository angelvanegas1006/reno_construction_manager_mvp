"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TenantsTable } from "@/components/rent/tenants-table";
import { useRentTenants } from "@/hooks/useRentTenants";

export default function TenantsPage() {
  const { t } = useI18n();
  const { tenants, loading, error } = useRentTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus inquilinos
          </p>
        </div>
        <Link href="/rent/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Inquilino
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando inquilinos...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error al cargar inquilinos: {error}
        </div>
      )}

      {!loading && !error && (
        <TenantsTable tenants={tenants || []} />
      )}
    </div>
  );
}















