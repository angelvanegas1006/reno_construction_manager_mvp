"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapPin, Euro, Calendar, TrendingUp } from "lucide-react";

interface VistralVisionPipelineProps {
  properties: Property[];
  searchQuery: string;
}

const pipelineStages = [
  { key: "new", label: "New", color: "bg-[var(--prophero-blue-500)] dark:bg-[var(--prophero-blue-600)]" },
  { key: "evaluation", label: "Evaluation", color: "bg-[var(--prophero-warning)] dark:bg-[var(--prophero-warning-hover)]" },
  { key: "negotiation", label: "Negotiation", color: "bg-[var(--prophero-info)] dark:bg-[var(--prophero-info-hover)]" },
  { key: "contract", label: "Contract", color: "bg-[var(--prophero-blue-600)] dark:bg-[var(--prophero-blue-700)]" },
  { key: "renovation", label: "Renovation", color: "bg-[var(--prophero-blue-400)] dark:bg-[var(--prophero-blue-500)]" },
  { key: "ready", label: "Ready", color: "bg-[var(--prophero-success)] dark:bg-[var(--prophero-success-hover)]" },
  { key: "rented", label: "Rented", color: "bg-[var(--prophero-success-hover)] dark:bg-[var(--prophero-success)]" },
];

export function VistralVisionPipeline({ properties, searchQuery }: VistralVisionPipelineProps) {
  const router = useRouter();

  // Categorize properties into pipeline stages
  const categorizedProperties = useMemo(() => {
    const categorized: Record<string, Property[]> = {
      new: [],
      evaluation: [],
      negotiation: [],
      contract: [],
      renovation: [],
      ready: [],
      rented: [],
    };

    properties.forEach((prop) => {
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = 
          prop.id.toLowerCase().includes(query) ||
          prop.fullAddress.toLowerCase().includes(query) ||
          (prop.price && prop.price.toString().includes(query));
        if (!matches) return;
      }

      // Categorize based on stage
      if (prop.currentStage === "draft") {
        categorized.new.push(prop);
      } else if (prop.currentStage === "review" || prop.currentStage === "needs-correction") {
        categorized.evaluation.push(prop);
      } else if (prop.currentStage === "negotiation") {
        categorized.negotiation.push(prop);
      } else if (prop.currentStage === "pending-arras") {
        categorized.contract.push(prop);
      } else if (prop.currentStage === "settlement") {
        categorized.renovation.push(prop);
      } else if (prop.currentStage === "sold") {
        categorized.ready.push(prop);
      }
    });

    // Add some mock rented properties for demo
    if (categorized.ready.length > 0) {
      categorized.rented = categorized.ready.slice(0, Math.min(3, categorized.ready.length)).map(p => ({
        ...p,
        id: `${p.id}-rented`,
      }));
    }

    return categorized;
  }, [properties, searchQuery]);

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
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
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">Property Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Complete flow from new properties to rented properties
          </p>
        </div>

        {/* Pipeline Stages */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageProperties = categorizedProperties[stage.key] || [];
            
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-80 flex flex-col"
              >
                {/* Stage Header */}
                <div className={cn(
                  "rounded-t-lg px-4 py-3 text-white font-semibold flex items-center justify-between",
                  stage.color
                )}>
                  <span>{stage.label}</span>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs">
                    {stageProperties.length}
                  </span>
                </div>

                {/* Properties List */}
                <div className="bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-800)] rounded-b-lg p-3 space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto">
                  {stageProperties.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No properties
                    </div>
                  ) : (
                    stageProperties.map((property) => (
                      <div
                        key={property.id}
                        onClick={() => handlePropertyClick(property)}
                        className="bg-white dark:bg-[var(--prophero-gray-900)] rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              ID: {property.id}
                            </p>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm font-semibold text-foreground line-clamp-2">
                                {property.fullAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(property.price)}
                            </span>
                          </div>
                          {property.propertyType && (
                            <span className="text-xs text-muted-foreground">
                              {property.propertyType}
                            </span>
                          )}
                        </div>

                        {property.data?.habitaciones && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{property.data.habitaciones} bed</span>
                            {property.data.banos && <span>{property.data.banos} bath</span>}
                            {property.data.superficieConstruida && (
                              <span>{property.data.superficieConstruida}m²</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

