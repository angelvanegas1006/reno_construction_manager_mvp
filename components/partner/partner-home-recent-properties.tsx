"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";

interface PartnerHomeRecentPropertiesProps {
  properties: Property[];
}

export function PartnerHomeRecentProperties({ properties }: PartnerHomeRecentPropertiesProps) {
  const { t, language } = useI18n();
  const router = useRouter();

  // Sort by lastSaved (most recent first) and take first 5
  const recentProperties = [...properties]
    .filter((p) => p.lastSaved)
    .sort((a, b) => {
      const dateA = new Date(a.lastSaved!);
      const dateB = new Date(b.lastSaved!);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (language === "es") {
      if (diffHours < 1) return "Hace menos de 1 hora";
      if (diffHours === 1) return "Hace 1 hora";
      if (diffHours < 24) return `Hace ${diffHours} horas`;
      if (diffDays === 1) return "Hace 1 día";
      return `Hace ${diffDays} días`;
    } else {
      if (diffHours < 1) return "Less than 1 hour ago";
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return "1 day ago";
      return `${diffDays} days ago`;
    }
  };

  const getStageLabel = (stage: string) => {
    const stageMap: Record<string, string> = {
      draft: language === "es" ? "Borrador" : "Draft",
      review: language === "es" ? "En Revisión" : "In Review",
      "needs-correction": language === "es" ? "Necesita Corrección" : "Needs Correction",
      negotiation: language === "es" ? "Negociación" : "Negotiation",
      "pending-arras": language === "es" ? "Pendiente Arras" : "Pending Arras",
      settlement: language === "es" ? "Liquidación" : "Settlement",
      sold: language === "es" ? "Vendido" : "Sold",
      rejected: language === "es" ? "Rechazado" : "Rejected",
    };
    return stageMap[stage] || stage;
  };

  const handlePropertyClick = (property: Property) => {
    if (property.currentStage === "draft") {
      router.push(`/partner/property/${property.id}/edit`);
    } else {
      router.push(`/partner/property/${property.id}`);
    }
  };

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t.dashboard.recentProperties}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.recentPropertiesDescription}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay propiedades recientes
            </p>
          ) : (
            recentProperties.map((property) => (
              <div
                key={property.id}
                onClick={() => handlePropertyClick(property)}
                className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[var(--prophero-gray-800)] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {property.address || property.fullAddress}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getStageLabel(property.currentStage)}
                    </span>
                    {property.price && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
                            style: "currency",
                            currency: "EUR",
                            maximumFractionDigits: 0,
                          }).format(property.price)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {property.lastSaved && (
                  <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {formatTimeAgo(property.lastSaved)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}






