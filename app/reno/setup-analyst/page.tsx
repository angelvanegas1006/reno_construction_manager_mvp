"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { RenoHomeIndicators } from "@/components/reno/reno-home-indicators";
import { RenoHomeUpdateRequests } from "@/components/reno/reno-home-update-requests";
import { RenoHomePortfolio } from "@/components/reno/reno-home-portfolio";
import { RenoHomeRecentProperties } from "@/components/reno/reno-home-recent-properties";
import { VisitsCalendar } from "@/components/reno/visits-calendar";
import { UpdateEmailInbox } from "@/components/reno/update-email-inbox";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Property } from "@/lib/property-storage";
import { trackEventWithDevice } from "@/lib/mixpanel";

export default function SetUpAnalystHomePage() {
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();

  const { propertiesByPhase, loading: propertiesLoading } = useRenoProperties();

  const [updatesForThisWeek, setUpdatesForThisWeek] = useState(0);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  useEffect(() => {
    if (!propertiesLoading) {
      trackEventWithDevice("Setup Analyst Home Viewed");
    }
  }, [propertiesLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "set_up_analyst" && role !== "admin") {
      router.push("/reno/construction-manager");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  // Actualizaciones de esta semana (igual que en construction-manager)
  useEffect(() => {
    const fetch = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("properties")
          .select("id, next_update, reno_phase")
          .eq("reno_phase", "reno-in-progress")
          .not("next_update", "is", null)
          .gte("next_update", today.toISOString().split("T")[0])
          .lte("next_update", endOfWeek.toISOString().split("T")[0]);

        if (!error) setUpdatesForThisWeek(data?.length || 0);
      } finally {
        setLoadingUpdates(false);
      }
    };
    fetch();
  }, [supabase]);

  const properties = useMemo<Property[]>(() => {
    if (!propertiesByPhase) return [];
    return Object.values(propertiesByPhase).flat();
  }, [propertiesByPhase]);

  // Calcular KPIs
  const indicators = useMemo(() => {
    const obrasActivas =
      (propertiesByPhase?.["reno-in-progress"]?.length || 0) +
      (propertiesByPhase?.["furnishing"]?.length || 0) +
      (propertiesByPhase?.["final-check"]?.length || 0) +
      (propertiesByPhase?.["cleaning"]?.length || 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    let viviendasQueSeFirmanEstaSemana = 0;
    if (propertiesByPhase) {
      Object.values(propertiesByPhase)
        .flat()
        .forEach((p) => {
          if (p.realSettlementDate) {
            const d = new Date(p.realSettlementDate);
            d.setHours(0, 0, 0, 0);
            if (d >= today && d <= endOfWeek) viviendasQueSeFirmanEstaSemana++;
          }
        });
    }

    return { obrasActivas, actualizacionesParaEstaSemana: updatesForThisWeek, viviendasQueSeFirmanEstaSemana };
  }, [propertiesByPhase, updatesForThisWeek]);

  if (isLoading || propertiesLoading || loadingUpdates) {
    return (
      <div className="flex h-screen items-center justify-center">
        <VistralLogoLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Header reutilizado */}
        <RenoHomeHeader />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 px-4 lg:px-8">

            {/* KPIs */}
            <RenoHomeIndicators
              obrasActivas={indicators.obrasActivas}
              actualizacionesParaEstaSemana={indicators.actualizacionesParaEstaSemana}
              viviendasQueSeFirmanEstaSemana={indicators.viviendasQueSeFirmanEstaSemana}
            />

            {/* Bandeja de emails */}
            <UpdateEmailInbox />

            {/* Solicitar actualizaciones de obra */}
            <RenoHomeUpdateRequests propertiesByPhase={propertiesByPhase ?? undefined} />

            {/* Portfolio + Ranking reformistas en la misma fila */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
              <RenoHomeRecentProperties properties={properties} propertiesByPhase={propertiesByPhase ?? undefined} />
              <RenoHomePortfolio properties={properties} propertiesByPhase={propertiesByPhase ?? undefined} />
            </div>

            {/* Calendario de visitas — al fondo del todo */}
            <VisitsCalendar
              propertiesByPhase={propertiesByPhase ?? undefined}
              onPropertyClick={(p) => router.push(`/reno/construction-manager/property/${p.id}?from=home`)}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
