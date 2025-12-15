"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface RenoHomeIndicatorsProps {
  obrasActivas: number;
  visitasParaHoy: number;
  totalVisitasMes: number;
}

export function RenoHomeIndicators({
  obrasActivas,
  visitasParaHoy,
  totalVisitasMes,
}: RenoHomeIndicatorsProps) {
  const { t } = useI18n();

  const IndicatorCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon 
  }: { 
    title: string; 
    value: number; 
    description: string;
    icon: typeof Building2;
  }) => (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      <IndicatorCard
        title={t.dashboard.activeWorks}
        value={obrasActivas}
        description={t.dashboard.activeWorksDescription}
        icon={Building2}
      />
      <IndicatorCard
        title={t.dashboard.visitsToday}
        value={visitasParaHoy}
        description={t.dashboard.visitsTodayDescription}
        icon={Calendar}
      />
      <IndicatorCard
        title={t.dashboard.totalVisitsMonth}
        value={totalVisitasMes}
        description={t.dashboard.totalVisitsMonthDescription}
        icon={CheckCircle}
      />
    </div>
  );
}
