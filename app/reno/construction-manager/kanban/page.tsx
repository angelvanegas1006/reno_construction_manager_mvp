"use client";

import { useState } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoKanbanHeader } from "@/components/reno/reno-kanban-header";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";

export default function RenoConstructionManagerKanbanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <RenoSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <RenoKanbanHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Kanban Board */}
        <div 
          className="flex-1 overflow-y-auto md:overflow-hidden p-3 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]"
          data-scroll-container
        >
          <RenoKanbanBoard searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}








