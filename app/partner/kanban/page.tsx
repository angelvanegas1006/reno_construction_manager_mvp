"use client";

import { useState } from "react";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { KanbanHeader } from "@/components/partner/kanban-header";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FloatingAddButton } from "@/components/partner/floating-add-button";
import { AddPropertyModal } from "@/components/partner/add-property-modal";

export default function PartnerKanbanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <PartnerSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <KanbanHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onAddProperty={() => setIsAddPropertyModalOpen(true)}
        />
        
        {/* Kanban Board */}
        <div 
          className="flex-1 overflow-y-auto md:overflow-hidden p-3 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]"
          data-scroll-container
        >
          <KanbanBoard searchQuery={searchQuery} />
        </div>

        {/* Floating Add Button - Mobile only */}
        <FloatingAddButton onAddProperty={() => setIsAddPropertyModalOpen(true)} />

        {/* Add Property Modal */}
        <AddPropertyModal 
          open={isAddPropertyModalOpen} 
          onOpenChange={setIsAddPropertyModalOpen}
        />
      </div>
    </div>
  );
}

