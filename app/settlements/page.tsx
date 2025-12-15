"use client";

import { useState, useEffect, useMemo } from "react";
import { SettlementsSidebar } from "@/components/settlements/settlements-sidebar";
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
    };

    loadSettlements();
    
    // Refresh data periodically
    const interval = setInterval(loadSettlements, 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = settlements.length;
    const pendingDocuments = settlements.filter(s => s.currentStage === "pending-documents").length;
    const inReview = settlements.filter(s => s.currentStage === "document-review").length;
    const signing = settlements.filter(s => s.currentStage === "signing").length;
    const completed = settlements.filter(s => s.currentStage === "completed").length;

    return {
      total,
      pendingDocuments,
      inReview,
      signing,
      completed,
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
    <div className="flex h-screen overflow-hidden bg-background">
      <SettlementsSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[64px] border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-muted"
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Escrituración</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    Documentos Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.pendingDocuments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    En Revisión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.inReview}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    En Firma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.signing}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.completed}</div>
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

