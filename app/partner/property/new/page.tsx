"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { AddPropertyForm } from "@/components/partner/add-property-form";

export default function NewPropertyPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden">
      <PartnerSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/partner/kanban")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Añadir una nueva propiedad
            </h1>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]"
          data-scroll-container
        >
          <div className="max-w-2xl mx-auto">
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <AddPropertyForm 
                showTitle={false}
                onSuccess={(propertyId) => {
                  console.log("Page onSuccess called with propertyId:", propertyId);
                  console.log("Navigating to:", `/partner/property/${propertyId}/edit`);
                  // Use window.location for hard navigation to avoid RSC fetch issues
                  window.location.href = `/partner/property/${propertyId}/edit`;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


