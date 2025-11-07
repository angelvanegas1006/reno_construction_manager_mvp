"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Building2, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface RenoHomeIndicatorsProps {
  obrasActivas: number;
  visitasParaHoy: number;
  totalVisitasMes: number;
  obrasActivasDelta: { value: number; isPositive: boolean };
  visitasParaHoyDelta: { value: number; isPositive: boolean };
  totalVisitasMesDelta: { value: number; isPositive: boolean };
}

export function RenoHomeIndicators({
  obrasActivas,
  visitasParaHoy,
  totalVisitasMes,
  obrasActivasDelta,
  visitasParaHoyDelta,
  totalVisitasMesDelta,
}: RenoHomeIndicatorsProps) {
  const { t } = useI18n();

  const IndicatorCard = ({ 
    title, 
    value, 
    delta, 
    description, 
    icon: Icon 
  }: { 
    title: string; 
    value: number; 
    delta: { value: number; isPositive: boolean }; 
    description: string;
    icon: typeof Building2;
  }) => (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </div>
        {delta && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            delta.isPositive ? "text-[var(--prophero-success)]" : "text-[var(--prophero-danger)]"
          )}>
            {delta.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {delta.value}%
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <IndicatorCard
        title="Obras Activas"
        value={obrasActivas}
        delta={obrasActivasDelta}
        description="Propiedades en fase de renovación"
        icon={Building2}
      />
      <IndicatorCard
        title="Visitas para Hoy"
        value={visitasParaHoy}
        delta={visitasParaHoyDelta}
        description="Actualizaciones o checks programados"
        icon={Calendar}
      />
      <IndicatorCard
        title="Total de visitas hechas en el mes"
        value={totalVisitasMes}
        delta={totalVisitasMesDelta}
        description="Visitas completadas este mes"
        icon={CheckCircle}
      />
    </div>
  );
}
