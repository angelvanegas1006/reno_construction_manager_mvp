"use client";

import { useState, useEffect } from "react";
import { SettlementsSidebar } from "@/components/settlements/settlements-sidebar";
import { SettlementsKanbanBoard } from "@/components/settlements/settlements-kanban-board";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SettlementsKanbanPage() {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();
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
    <div className="flex h-screen overflow-hidden bg-background">
      <SettlementsSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[64px] border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
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
            <h1 className="text-2xl font-bold">Kanban - Escrituración</h1>
          </div>
          
          {/* Search */}
          <div className="relative w-full max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden bg-muted/30 p-4 md:p-6">
          <SettlementsKanbanBoard searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}

