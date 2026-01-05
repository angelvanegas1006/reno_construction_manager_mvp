"use client";

import { RentProperty } from "@/lib/rent/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { IdealistaStatusBadge } from "@/components/rent/idealista-status-badge";
import { getListingByPropertyId } from "@/lib/rent/dummy-data";

interface PropertiesTableProps {
  properties: RentProperty[];
}

export function PropertiesTable({ properties }: PropertiesTableProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'rented':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'rented':
        return 'Alquilada';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No hay propiedades registradas</p>
        <Link href="/rent/properties/new" className="mt-4 inline-block">
          <Button variant="outline">Agregar primera propiedad</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dirección</TableHead>
            <TableHead>Habitaciones</TableHead>
            <TableHead>Baños</TableHead>
            <TableHead>m²</TableHead>
              <TableHead>Alquiler Mensual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Idealista</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="font-medium">{property.address}</TableCell>
              <TableCell>{property.bedrooms || '-'}</TableCell>
              <TableCell>{property.bathrooms || '-'}</TableCell>
              <TableCell>{property.square_meters || '-'}</TableCell>
              <TableCell>{formatCurrency(property.monthly_rent)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(property.status)}>
                  {getStatusLabel(property.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {(() => {
                  const listing = getListingByPropertyId(property.id);
                  return listing ? (
                    <IdealistaStatusBadge status={listing.status} />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  );
                })()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/rent/properties/${property.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/rent/properties/${property.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

