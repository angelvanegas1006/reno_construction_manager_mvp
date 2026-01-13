"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PropertiesTable } from "@/components/rent/properties-table";
import { dummyProperties } from "@/lib/rent/dummy-data";

export default function PropertiesPage() {
  const { t } = useI18n();
  // Usar datos dummy para desarrollo
  const properties = dummyProperties;
  const loading = false;
  const error = null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propiedades</h1>
          <p className="text-muted-foreground">
            Gestiona las propiedades disponibles para alquiler
          </p>
        </div>
        <Link href="/rent/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Propiedad
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando propiedades...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error al cargar propiedades: {error}
        </div>
      )}

      {!loading && !error && (
        <PropertiesTable properties={properties || []} />
      )}
    </div>
  );
}

