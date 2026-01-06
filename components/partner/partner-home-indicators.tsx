"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Building2, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface PartnerHomeIndicatorsProps {
  activeProperties: number;
  conversionRate: number;
  averageTime: number; // in days
  activePropertiesDelta: { value: number; isPositive: boolean };
  conversionRateDelta: { value: number; isPositive: boolean };
  averageTimeDelta: { value: number; isPositive: boolean };
}

export function PartnerHomeIndicators({
  activeProperties,
  conversionRate,
  averageTime,
  activePropertiesDelta,
  conversionRateDelta,
  averageTimeDelta,
}: PartnerHomeIndicatorsProps) {
  const { t } = useI18n();

  const IndicatorCard = ({ 
    title, 
    value, 
    delta, 
    description, 
    icon: Icon 
  }: { 
    title: string; 
    value: number | string; 
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
        title={t.dashboard.activeProperties}
        value={activeProperties}
        delta={activePropertiesDelta}
        description={t.dashboard.activePropertiesDescription}
        icon={Building2}
      />
      <IndicatorCard
        title={t.dashboard.conversionRate}
        value={`${conversionRate}%`}
        delta={conversionRateDelta}
        description={t.dashboard.conversionRateDescription}
        icon={TrendingUp}
      />
      <IndicatorCard
        title={t.dashboard.averageTime}
        value={`${averageTime} días`}
        delta={averageTimeDelta}
        description={t.dashboard.averageTimeDescription}
        icon={Clock}
      />
    </div>
  );
}






