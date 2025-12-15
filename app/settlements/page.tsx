"use client";

import { useState, useEffect, useMemo } from "react";
import { SettlementsSidebar } from "@/components/settlements/settlements-sidebar";
import { SettlementsHomeHeader } from "@/components/settlements/settlements-home-header";
import { getAllSettlementProperties, SettlementProperty } from "@/lib/settlements-storage";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SettlementsHomePage() {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settlements, setSettlements] = useState<SettlementProperty[]>([]);

  // Check if user has settlements_analyst role
  useEffect(() => {
    if (!isLoading) {
      if (!user || !hasRole("settlements_analyst")) {
        router.push("/");
      }
    }
  }, [user, isLoading, hasRole, router]);

  // Load settlements on mount
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

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = settlements.length;
    const verificacionDocumentacion = settlements.filter(s => s.currentStage === "verificacion-documentacion").length;
    const aprobacionHipoteca = settlements.filter(s => s.currentStage === "aprobacion-hipoteca").length;
    const coordinacionFirma = settlements.filter(s => s.currentStage === "coordinacion-firma-escritura").length;
    const aguardandoFirma = settlements.filter(s => s.currentStage === "aguardando-firma-compraventa").length;
    const finalizadas = settlements.filter(s => s.currentStage === "finalizadas").length;
    const canceladas = settlements.filter(s => s.currentStage === "canceladas").length;

    return {
      total,
      verificacionDocumentacion,
      aprobacionHipoteca,
      coordinacionFirma,
      aguardandoFirma,
      finalizadas,
      canceladas,
    };
  }, [settlements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user || !hasRole("settlements_analyst")) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SettlementsSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <SettlementsHomeHeader />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Verificación de documentación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.verificacionDocumentacion}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aprobación de hipoteca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.aprobacionHipoteca}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Coordinación de firma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.coordinacionFirma}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aguardando firma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.aguardandoFirma}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Finalizadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.finalizadas}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Canceladas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.canceladas}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Settlements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Escrituración Reciente</CardTitle>
                  <Button onClick={() => router.push("/settlements/kanban")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ver Kanban
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settlements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay escrituraciones aún. Ve al Kanban para agregar nuevas.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settlements.slice(0, 10).map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                        onClick={() => router.push(`/settlements/${settlement.id}`)}
                      >
                        <div>
                          <div className="font-medium">{settlement.fullAddress}</div>
                          <div className="text-sm text-muted-foreground">
                            {settlement.currentStage}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {settlement.timeInStage}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

