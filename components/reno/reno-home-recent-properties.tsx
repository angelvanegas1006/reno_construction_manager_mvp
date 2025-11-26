"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Trophy, Medal, Award, ChevronRight, ArrowLeft, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface RenoHomeRecentPropertiesProps {
  properties: Property[];
  propertiesByPhase?: Record<string, Property[]>;
}

export function RenoHomeRecentProperties({ properties, propertiesByPhase }: RenoHomeRecentPropertiesProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRenovator, setSelectedRenovator] = useState<string | null>(null);

  // Filter active works: from reno-in-progress to final-check
  const activeWorks = useMemo(() => {
    if (!propertiesByPhase) return [];
    
    const activePhases = ['reno-in-progress', 'furnishing-cleaning', 'final-check'];
    const activeProperties: Property[] = [];
    
    activePhases.forEach(phase => {
      const phaseProperties = propertiesByPhase[phase] || [];
      activeProperties.push(...phaseProperties);
    });
    
    return activeProperties;
  }, [propertiesByPhase]);

  // Group by renovator name with properties
  const renovatorGroups = useMemo(() => {
    const grouped: Record<string, Property[]> = {};
    
    activeWorks.forEach(property => {
      const renovatorName = property.renovador || (language === 'es' ? 'Sin renovator' : 'No renovator');
      if (!grouped[renovatorName]) {
        grouped[renovatorName] = [];
      }
      grouped[renovatorName].push(property);
    });
    
    return grouped;
  }, [activeWorks, language]);

  // Create ranking from groups
  const fullRanking = useMemo(() => {
    return Object.entries(renovatorGroups)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([renovatorName, properties], index) => ({
        position: index + 1,
        renovatorName,
        count: properties.length,
        properties,
      }));
  }, [renovatorGroups]);

  // Top 5 only for widget
  const top5Ranking = useMemo(() => {
    return fullRanking.slice(0, 5);
  }, [fullRanking]);

  // Get properties for selected renovator
  const selectedRenovatorProperties = useMemo(() => {
    if (!selectedRenovator) return [];
    return renovatorGroups[selectedRenovator] || [];
  }, [selectedRenovator, renovatorGroups]);

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (position === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const handleRenovatorClick = (renovatorName: string) => {
    setSelectedRenovator(renovatorName);
  };

  const handleBackToRanking = () => {
    setSelectedRenovator(null);
  };

  const handlePropertyClick = (property: Property) => {
    router.push(`/reno/construction-manager/property/${property.id}`);
    setIsModalOpen(false);
    setSelectedRenovator(null);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedRenovator(null);
    }
  };

  const handleRenovatorClickInWidget = (renovatorName: string) => {
    setSelectedRenovator(renovatorName);
    setIsModalOpen(true);
  };

  const renderRankingItem = (item: { position: number; renovatorName: string; count: number }) => (
    <div
      key={item.renovatorName}
      onClick={() => handleRenovatorClick(item.renovatorName)}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Ranking position */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex-shrink-0">
          {getRankIcon(item.position) || (
            <span className="text-xs font-semibold text-muted-foreground">
              {item.position}
            </span>
          )}
        </div>
        
        {/* Renovator name */}
        <p className="text-sm font-medium text-foreground truncate flex-1">
          {item.renovatorName}
        </p>
      </div>
      
      {/* Count */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-lg font-bold text-foreground">
          {item.count}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.count === 1 ? (language === 'es' ? 'obra' : 'work') : (language === 'es' ? 'obras' : 'works')}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
      </div>
    </div>
  );

  const renderPropertyItem = (property: Property) => (
    <div
      key={property.id}
      onClick={() => handlePropertyClick(property)}
      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {property.address || property.fullAddress || property.id}
        </p>
        {property.renoPhase && (
          <p className="text-xs text-muted-foreground mt-1">
            {property.renoPhase}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );

  return (
    <>
      <Card className="bg-card h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg font-semibold">{t.dashboard.activeWorksByRenovator}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.activeWorksByRenovatorDescription}
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-2 flex-1">
            {top5Ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.messages.notFound}
              </p>
            ) : (
              <>
                {top5Ranking.map((item) => (
                  <div
                    key={item.renovatorName}
                    onClick={() => handleRenovatorClickInWidget(item.renovatorName)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Ranking position */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex-shrink-0">
                        {getRankIcon(item.position) || (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {item.position}
                          </span>
                        )}
                      </div>
                      
                      {/* Renovator name */}
                      <p className="text-sm font-medium text-foreground truncate flex-1">
                        {item.renovatorName}
                      </p>
                    </div>
                    
                    {/* Count */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-lg font-bold text-foreground">
                        {item.count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.count === 1 ? (language === 'es' ? 'obra' : 'work') : (language === 'es' ? 'obras' : 'works')}
                      </span>
                      <span className="ml-2 flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </div>
                  </div>
                ))}
                {fullRanking.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      setSelectedRenovator(null);
                      setIsModalOpen(true);
                    }}
                  >
                    {t.dashboard.viewMore}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Ranking Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            {selectedRenovator ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToRanking}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>
                  {t.dashboard.worksByPartner} {selectedRenovator}
                </DialogTitle>
              </div>
            ) : (
              <DialogTitle>{t.dashboard.fullRanking}</DialogTitle>
            )}
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedRenovator ? (
              selectedRenovatorProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.messages.notFound}
                </p>
              ) : (
                selectedRenovatorProperties.map(renderPropertyItem)
              )
            ) : (
              fullRanking.map(renderRankingItem)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}






