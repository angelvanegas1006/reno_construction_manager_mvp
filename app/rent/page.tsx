"use client";

import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function RentHomePage() {
  const { t } = useI18n();

  const stats = [
    {
      title: "Inquilinos Activos",
      value: "0",
      description: "Inquilinos con contratos activos",
      icon: Users,
      href: "/rent/tenants",
      color: "text-blue-600",
    },
    {
      title: "Propiedades Disponibles",
      value: "0",
      description: "Propiedades disponibles para alquiler",
      icon: Building2,
      href: "/rent/properties",
      color: "text-green-600",
    },
    {
      title: "Contratos Activos",
      value: "0",
      description: "Contratos de alquiler vigentes",
      icon: FileText,
      href: "/rent/contracts",
      color: "text-purple-600",
    },
    {
      title: "Tasa de Ocupación",
      value: "0%",
      description: "Porcentaje de propiedades ocupadas",
      icon: TrendingUp,
      href: "/rent/properties",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Alquileres</h1>
        <p className="text-muted-foreground">
          Administra propiedades, inquilinos y contratos de alquiler
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/rent/tenants/new"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Agregar Inquilino</div>
                <div className="text-sm text-muted-foreground">
                  Registrar un nuevo inquilino
                </div>
              </div>
            </Link>
            <Link
              href="/rent/properties/new"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Agregar Propiedad</div>
                <div className="text-sm text-muted-foreground">
                  Registrar una nueva propiedad
                </div>
              </div>
            </Link>
            <Link
              href="/rent/contracts/new"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Crear Contrato</div>
                <div className="text-sm text-muted-foreground">
                  Generar un nuevo contrato de alquiler
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}














