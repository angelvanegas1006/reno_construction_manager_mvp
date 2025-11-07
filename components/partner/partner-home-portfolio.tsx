"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property, PropertyStage } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";

interface PartnerHomePortfolioProps {
  properties: Property[];
}

const STAGES: PropertyStage[] = [
  "draft",
  "review",
  "needs-correction",
  "negotiation",
  "pending-arras",
  "settlement",
  "sold",
  "rejected",
];

export function PartnerHomePortfolio({ properties }: PartnerHomePortfolioProps) {
  const { t, language } = useI18n();
  const router = useRouter();

  const stageCounts = useMemo(() => {
    const counts: Record<PropertyStage, number> = {
      draft: 0,
      review: 0,
      "needs-correction": 0,
      negotiation: 0,
      "pending-arras": 0,
      settlement: 0,
      sold: 0,
      rejected: 0,
    };

    properties.forEach((p) => {
      if (p.currentStage in counts) {
        counts[p.currentStage as PropertyStage]++;
      }
    });

    return counts;
  }, [properties]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);
  const maxHeight = 200; // Max height in pixels for the bars

  const getStageLabel = (stage: PropertyStage) => {
    const stageMap: Record<PropertyStage, string> = {
      draft: language === "es" ? "Borrador" : "Draft",
      review: language === "es" ? "En Revisión" : "In Review",
      "needs-correction": language === "es" ? "Necesita Corrección" : "Needs Correction",
      negotiation: language === "es" ? "Negociación" : "Negotiation",
      "pending-arras": language === "es" ? "Pendiente Arras" : "Pending Arras",
      settlement: language === "es" ? "Liquidación" : "Settlement",
      sold: language === "es" ? "Vendido" : "Sold",
      rejected: language === "es" ? "Rechazado" : "Rejected",
    };
    return stageMap[stage];
  };

  const getBarHeight = (count: number) => {
    return (count / maxCount) * maxHeight;
  };

  const handleBarClick = (stage: PropertyStage) => {
    router.push(`/partner/kanban?stage=${stage}`);
  };

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t.dashboard.portfolio}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.portfolioDescription}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div className="flex items-end justify-between gap-2 h-[220px]">
            {STAGES.map((stage) => {
              const count = stageCounts[stage];
              const height = getBarHeight(count);
              
              return (
                <div
                  key={stage}
                  className="flex-1 flex flex-col items-center group cursor-pointer"
                  onClick={() => handleBarClick(stage)}
                >
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      className="w-full bg-[var(--prophero-blue-500)] dark:bg-[var(--prophero-blue-600)] rounded-t transition-all hover:opacity-80"
                      style={{ height: `${height}px`, minHeight: count > 0 ? "4px" : "0" }}
                      title={`${getStageLabel(stage)}: ${count}`}
                    />
                    {count > 0 && (
                      <span className="absolute -top-5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center leading-tight">
                    {getStageLabel(stage)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


