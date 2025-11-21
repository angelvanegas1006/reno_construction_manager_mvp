"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { TrendingUp, TrendingDown } from "lucide-react";

interface VistralVisionIndicatorsProps {
  properties: Property[];
}

export function VistralVisionIndicators({ properties }: VistralVisionIndicatorsProps) {
  const indicators = useMemo(() => {
    const total = properties.length;
    const sold = properties.filter(p => p.currentStage === "sold").length;
    const rented = properties.filter(p => p.currentStage === "settlement" || p.currentStage === "pending-arras").length;
    const inPipeline = properties.filter(p => 
      !["sold", "rejected"].includes(p.currentStage)
    ).length;
    
    const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const soldValue = properties
      .filter(p => p.currentStage === "sold")
      .reduce((sum, p) => sum + (p.price || 0), 0);

    return {
      totalProperties: total,
      soldProperties: sold,
      rentedProperties: rented,
      inPipeline,
      totalValue,
      soldValue,
      conversionRate: total > 0 ? ((sold / total) * 100).toFixed(1) : "0",
    };
  }, [properties]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Properties</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{indicators.totalProperties}</p>
              <p className="text-xs text-[var(--prophero-success)] mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12 this month
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sold</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{indicators.soldProperties}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {indicators.conversionRate}% conversion
              </p>
              <p className="text-xs text-[var(--prophero-success)] mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8% vs last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[var(--prophero-success)]/10 dark:bg-[var(--prophero-success)]/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[var(--prophero-success)]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Pipeline</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{indicators.inPipeline}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Active
              </p>
              <p className="text-xs text-[var(--prophero-warning)] mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                5 pending actions
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[var(--prophero-warning)]/10 dark:bg-[var(--prophero-warning)]/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[var(--prophero-warning)]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {(indicators.totalValue / 1000000).toFixed(1)}M€
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Portfolio
              </p>
              <p className="text-xs text-[var(--prophero-success)] mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +15.2% growth
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

