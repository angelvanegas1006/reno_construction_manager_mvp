"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { 
  getAllSettlementProperties, 
  SettlementProperty,
  createSettlementProperty,
  saveSettlementProperty,
  updateSettlementProperty,
} from "@/lib/settlements-storage";
import { 
  SETTLEMENTS_KANBAN_COLUMNS, 
  SettlementKanbanPhase,
  getSettlementPhaseLabel 
} from "@/lib/settlements-kanban-config";
import { useI18n } from "@/lib/i18n";

interface SettlementsKanbanBoardProps {
  searchQuery: string;
}

export function SettlementsKanbanBoard({ searchQuery }: SettlementsKanbanBoardProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const [settlements, setSettlements] = useState<SettlementProperty[]>([]);

  // Load settlements
  useEffect(() => {
    const loadSettlements = () => {
      const allSettlements = getAllSettlementProperties();
      setSettlements(allSettlements);
      
      // Initialize test data if empty (only once)
      if (allSettlements.length === 0 && typeof window !== "undefined") {
        const hasInitialized = localStorage.getItem("settlements_test_data_initialized");
        if (!hasInitialized) {
          // Import and initialize test data
          import("@/scripts/init-settlements-test-data").then(({ initSettlementsTestData }) => {
            initSettlementsTestData();
            localStorage.setItem("settlements_test_data_initialized", "true");
            setSettlements(getAllSettlementProperties());
          });
        }
      }
    };

    loadSettlements();
    
    // Refresh data periodically
    const interval = setInterval(loadSettlements, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter settlements by search query
  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const query = searchQuery.toLowerCase();
    return settlements.filter(s => 
      s.fullAddress.toLowerCase().includes(query) ||
      s.address?.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  }, [settlements, searchQuery]);

  // Group settlements by phase
  const settlementsByPhase = useMemo(() => {
    const grouped: Record<SettlementKanbanPhase, SettlementProperty[]> = {
      "verificacion-documentacion": [],
      "aprobacion-hipoteca": [],
      "coordinacion-firma-escritura": [],
      "aguardando-firma-compraventa": [],
      "finalizadas": [],
      "canceladas": [],
    };

    filteredSettlements.forEach(settlement => {
      if (grouped[settlement.currentStage]) {
        grouped[settlement.currentStage].push(settlement);
      }
    });

    return grouped;
  }, [filteredSettlements]);

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent, targetPhase: SettlementKanbanPhase) => {
    e.preventDefault();
    const settlementId = e.dataTransfer.getData("settlementId");
    if (settlementId) {
      updateSettlementProperty(settlementId, { currentStage: targetPhase });
      // Reload settlements
      setSettlements(getAllSettlementProperties());
    }
  };

  const handleDragStart = (e: React.DragEvent, settlementId: string) => {
    e.dataTransfer.setData("settlementId", settlementId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Create new settlement
  const handleCreateSettlement = () => {
    const newSettlement = createSettlementProperty(
      `prop-${Date.now()}`,
      "Nueva Escrituración",
      "Nueva Escrituración"
    );
    saveSettlementProperty(newSettlement);
    setSettlements(getAllSettlementProperties());
    router.push(`/settlements/${newSettlement.id}`);
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-4 min-w-max h-full pb-4">
        {SETTLEMENTS_KANBAN_COLUMNS.map((column) => {
          const columnSettlements = settlementsByPhase[column.id];
          const label = language === "es" ? column.label : column.labelEn;

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 flex flex-col"
              onDrop={(e) => handleDrop(e, column.id)}
              onDragOver={handleDragOver}
            >
              <Card className="h-full flex flex-col">
                <CardContent className="p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnSettlements.length}
                      </Badge>
                    </div>
                    {column.id === "verificacion-documentacion" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCreateSettlement}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                  {columnSettlements.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No hay escrituraciones
                    </div>
                  ) : (
                    columnSettlements.map((settlement) => (
                      <Card
                        key={settlement.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, settlement.id)}
                        className="cursor-move hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/settlements/${settlement.id}`)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="font-medium text-sm line-clamp-2">
                              {settlement.fullAddress}
                            </div>
                            {settlement.estimatedSigningDate && (
                              <div className="text-xs text-muted-foreground">
                                Firma estimada: {new Date(settlement.estimatedSigningDate).toLocaleDateString()}
                              </div>
                            )}
                            {settlement.notaryName && (
                              <div className="text-xs text-muted-foreground">
                                Notaría: {settlement.notaryName}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {settlement.timeInStage}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

