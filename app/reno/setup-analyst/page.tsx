"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { UpdateEmailInbox } from "@/components/reno/update-email-inbox";
import { RenoHomeUpdateRequests } from "@/components/reno/reno-home-update-requests";
import { RenoHomePortfolio } from "@/components/reno/reno-home-portfolio";
import { VisitsCalendar } from "@/components/reno/visits-calendar";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { toast } from "sonner";

export default function SetUpAnalystHomePage() {
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { propertiesByPhase, loading: propertiesLoading } = useRenoProperties();

  // Proteger ruta: solo set_up_analyst y admin
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

  if (isLoading || propertiesLoading) {
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
        {/* Header */}
        <header className="border-b bg-card h-[64px] min-h-[64px] flex items-center">
          <div className="pl-14 md:pl-6 pr-3 md:pr-6 w-full">
            <h1 className="text-lg md:text-xl lg:text-2xl font-semibold">Setup Analyst</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-[1600px] mx-auto space-y-6">

            {/* 1. Bandeja de borradores de email */}
            <UpdateEmailInbox />

            {/* 2. Solicitar actualizaciones de obra */}
            <RenoHomeUpdateRequests propertiesByPhase={propertiesByPhase ?? undefined} />

            {/* 3. Portfolio / Obras activas */}
            <RenoHomePortfolio
              properties={Object.values(propertiesByPhase ?? {}).flat()}
              propertiesByPhase={propertiesByPhase ?? undefined}
            />

            {/* 4. Calendario de visitas */}
            <VisitsCalendar propertiesByPhase={propertiesByPhase ?? undefined} />

          </div>
        </div>
      </div>
    </div>
  );
}
