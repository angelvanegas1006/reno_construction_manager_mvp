"use client";

import { useState, useEffect } from "react";
import { SettlementsSidebar } from "@/components/settlements/settlements-sidebar";
import { SettlementsKanbanBoard } from "@/components/settlements/settlements-kanban-board";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SettlementsKanbanPage() {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user has settlements_analyst role
  useEffect(() => {
    if (!isLoading) {
      if (!user || !hasRole("settlements_analyst")) {
        router.push("/");
      }
    }
  }, [user, isLoading, hasRole, router]);

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
        {/* Navbar L1: Navegación secundaria con buscador */}
        <NavbarL1
          classNameTitle="Escrituración"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        
        {/* Kanban Board */}
        <div 
          className={cn(
            "flex-1 p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000] overflow-y-auto"
          )}
          data-scroll-container
        >
          <SettlementsKanbanBoard searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}

