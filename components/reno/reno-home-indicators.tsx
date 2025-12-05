"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Building2, Calendar, CheckCircle, TrendingUp } from "lucide-react";
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
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</CardTitle>
        </div>
        {delta && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            delta.isPositive 
              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" 
              : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
          )}>
            <TrendingUp className={cn(
              "h-3 w-3",
              !delta.isPositive && "rotate-180"
            )} />
            <span>{delta.isPositive ? '+' : ''}{delta.value}%</span>
          </div>
        )}
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
        delta={obrasActivasDelta}
        description={t.dashboard.activeWorksDescription}
        icon={Building2}
      />
      <IndicatorCard
        title={t.dashboard.visitsToday}
        value={visitasParaHoy}
        delta={visitasParaHoyDelta}
        description={t.dashboard.visitsTodayDescription}
        icon={Calendar}
      />
      <IndicatorCard
        title={t.dashboard.totalVisitsMonth}
        value={totalVisitasMes}
        delta={totalVisitasMesDelta}
        description={t.dashboard.totalVisitsMonthDescription}
        icon={CheckCircle}
      />
    </div>
  );
}
