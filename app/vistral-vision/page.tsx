"use client";

import { useState, useEffect, useMemo } from "react";
import { VistralVisionSidebar } from "@/components/vistral-vision/vistral-vision-sidebar";
import { VistralVisionPipelineEnhanced } from "@/components/vistral-vision/vistral-vision-pipeline-enhanced";
import { VistralVisionIndicators } from "@/components/vistral-vision/vistral-vision-indicators";
import { VistralVisionTransactions } from "@/components/vistral-vision/vistral-vision-transactions";
import { VistralVisionRentals } from "@/components/vistral-vision/vistral-vision-rentals";
import { VistralVisionSales } from "@/components/vistral-vision/vistral-vision-sales";
import { VistralVisionReporting } from "@/components/vistral-vision/vistral-vision-reporting";
import { VistralVisionPeople } from "@/components/vistral-vision/vistral-vision-people";
import { VistralVisionDocumentCompliance } from "@/components/vistral-vision/vistral-vision-document-compliance";
import { VistralVisionAIIntegrations } from "@/components/vistral-vision/vistral-vision-ai-integrations";
import { VistralVisionAdmin } from "@/components/vistral-vision/vistral-vision-admin";
import { VistralVisionAIChat } from "@/components/vistral-vision/vistral-vision-ai-chat";
import { getAllProperties, Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

export type VistralVisionTab = 
  | "home"
  | "transactions"
  | "rentals"
  | "sales"
  | "reporting"
  | "people"
  | "document-compliance"
  | "ai-integrations"
  | "admin";

export default function VistralVisionPage() {
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<VistralVisionTab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Initialize dummy properties if needed
  useEffect(() => {
    const initializeDummyProperties = () => {
      if (typeof window === "undefined") return;
      
      const existingProps = getAllProperties();
      
      // Only initialize if we have less than 20 properties
      if (existingProps.length < 20) {
        const dummyProperties: Property[] = [
          {
            id: "4463801",
            fullAddress: "Calle Provenza 123, 08013 - Barcelona",
            propertyType: "Piso",
            currentStage: "draft",
            address: "Calle Provenza 123, 08013 - Barcelona",
            price: 285000,
            analyst: "María García",
            completion: 0,
            timeInStage: "2 días",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 1 },
          },
          {
            id: "4463802",
            fullAddress: "Avenida de la Constitución 456, 28009 - Madrid",
            propertyType: "Casa",
            currentStage: "review",
            address: "Avenida de la Constitución 456, 28009 - Madrid",
            price: 420000,
            analyst: "Carlos Martínez",
            completion: 45,
            timeInStage: "5 días",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463803",
            fullAddress: "Calle Colón 789, 46004 - Valencia",
            propertyType: "Ático",
            currentStage: "needs-correction",
            address: "Calle Colón 789, 46004 - Valencia",
            price: 350000,
            analyst: "Ana López",
            completion: 60,
            correctionsCount: 2,
            timeInStage: "3 días",
            createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463804",
            fullAddress: "Calle Gran Vía 234, 28013 - Madrid",
            propertyType: "Piso",
            currentStage: "negotiation",
            address: "Calle Gran Vía 234, 28013 - Madrid",
            price: 380000,
            analyst: "Pedro Sánchez",
            completion: 85,
            timeInStage: "12 días",
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 1 },
          },
          {
            id: "4463805",
            fullAddress: "Calle Rambla Catalunya 567, 08008 - Barcelona",
            propertyType: "Dúplex",
            currentStage: "pending-arras",
            address: "Calle Rambla Catalunya 567, 08008 - Barcelona",
            price: 550000,
            analyst: "Laura Fernández",
            completion: 95,
            timeInStage: "8 días",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 4, banos: 3 },
          },
          {
            id: "4463806",
            fullAddress: "Calle Serrano 890, 28006 - Madrid",
            propertyType: "Piso",
            currentStage: "settlement",
            address: "Calle Serrano 890, 28006 - Madrid",
            price: 475000,
            analyst: "Javier Ruiz",
            completion: 100,
            timeInStage: "15 días",
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463807",
            fullAddress: "Calle Muntaner 321, 08021 - Barcelona",
            propertyType: "Casa",
            currentStage: "sold",
            address: "Calle Muntaner 321, 08021 - Barcelona",
            price: 680000,
            analyst: "Sofia Martínez",
            completion: 100,
            timeInStage: "0 días",
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 4, banos: 3 },
          },
          {
            id: "4463808",
            fullAddress: "Calle Príncipe de Vergara 654, 28006 - Madrid",
            propertyType: "Ático",
            currentStage: "sold",
            address: "Calle Príncipe de Vergara 654, 28006 - Madrid",
            price: 520000,
            analyst: "Roberto Silva",
            completion: 100,
            timeInStage: "0 días",
            createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463809",
            fullAddress: "Calle Diagonal 987, 08008 - Barcelona",
            propertyType: "Piso",
            currentStage: "draft",
            address: "Calle Diagonal 987, 08008 - Barcelona",
            price: 295000,
            analyst: "Elena Moreno",
            completion: 10,
            timeInStage: "1 día",
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 1 },
          },
          {
            id: "4463810",
            fullAddress: "Calle Velázquez 147, 28001 - Madrid",
            propertyType: "Casa",
            currentStage: "review",
            address: "Calle Velázquez 147, 28001 - Madrid",
            price: 445000,
            analyst: "David Torres",
            completion: 50,
            timeInStage: "4 días",
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463811",
            fullAddress: "Calle Passeig de Gràcia 258, 08008 - Barcelona",
            propertyType: "Loft",
            currentStage: "negotiation",
            address: "Calle Passeig de Gràcia 258, 08008 - Barcelona",
            price: 425000,
            analyst: "María García",
            completion: 80,
            timeInStage: "10 días",
            createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 1, banos: 1 },
          },
          {
            id: "4463812",
            fullAddress: "Calle Claudio Coello 369, 28006 - Madrid",
            propertyType: "Piso",
            currentStage: "pending-arras",
            address: "Calle Claudio Coello 369, 28006 - Madrid",
            price: 395000,
            analyst: "Carlos Martínez",
            completion: 92,
            timeInStage: "7 días",
            createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 2 },
          },
          {
            id: "4463813",
            fullAddress: "Calle Gracia 741, 08012 - Barcelona",
            propertyType: "Estudio",
            currentStage: "settlement",
            address: "Calle Gracia 741, 08012 - Barcelona",
            price: 185000,
            analyst: "Ana López",
            completion: 100,
            timeInStage: "18 días",
            createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 1, banos: 1 },
          },
          {
            id: "4463814",
            fullAddress: "Calle Gran Vía 852, 28013 - Madrid",
            propertyType: "Piso",
            currentStage: "sold",
            address: "Calle Gran Vía 852, 28013 - Madrid",
            price: 310000,
            analyst: "Pedro Sánchez",
            completion: 100,
            timeInStage: "0 días",
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 1 },
          },
          {
            id: "4463815",
            fullAddress: "Calle Rambla Catalunya 963, 08008 - Barcelona",
            propertyType: "Dúplex",
            currentStage: "draft",
            address: "Calle Rambla Catalunya 963, 08008 - Barcelona",
            price: 625000,
            analyst: "Laura Fernández",
            completion: 5,
            timeInStage: "3 días",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 4, banos: 3 },
          },
          {
            id: "4463816",
            fullAddress: "Calle Serrano 159, 28006 - Madrid",
            propertyType: "Ático",
            currentStage: "review",
            address: "Calle Serrano 159, 28006 - Madrid",
            price: 485000,
            analyst: "Javier Ruiz",
            completion: 55,
            timeInStage: "6 días",
            createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
          {
            id: "4463817",
            fullAddress: "Calle Muntaner 753, 08021 - Barcelona",
            propertyType: "Casa",
            currentStage: "negotiation",
            address: "Calle Muntaner 753, 08021 - Barcelona",
            price: 595000,
            analyst: "Sofia Martínez",
            completion: 75,
            timeInStage: "14 días",
            createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 4, banos: 3 },
          },
          {
            id: "4463818",
            fullAddress: "Calle Príncipe de Vergara 456, 28006 - Madrid",
            propertyType: "Piso",
            currentStage: "pending-arras",
            address: "Calle Príncipe de Vergara 456, 28006 - Madrid",
            price: 365000,
            analyst: "Roberto Silva",
            completion: 90,
            timeInStage: "9 días",
            createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 2 },
          },
          {
            id: "4463819",
            fullAddress: "Calle Diagonal 357, 08008 - Barcelona",
            propertyType: "Loft",
            currentStage: "settlement",
            address: "Calle Diagonal 357, 08008 - Barcelona",
            price: 335000,
            analyst: "Elena Moreno",
            completion: 100,
            timeInStage: "20 días",
            createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 2, banos: 1 },
          },
          {
            id: "4463820",
            fullAddress: "Calle Velázquez 741, 28001 - Madrid",
            propertyType: "Casa",
            currentStage: "sold",
            address: "Calle Velázquez 741, 28001 - Madrid",
            price: 540000,
            analyst: "David Torres",
            completion: 100,
            timeInStage: "0 días",
            createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
            data: { habitaciones: 3, banos: 2 },
          },
        ];

        // Filter out properties that already exist
        const existingIds = new Set(existingProps.map(p => p.id));
        const newDummyProperties = dummyProperties.filter(p => !existingIds.has(p.id));

        // Save new dummy properties to localStorage
        if (newDummyProperties.length > 0) {
          const allProperties = [...existingProps, ...newDummyProperties];
          localStorage.setItem("vistral_properties", JSON.stringify(allProperties));
          // Immediately update state after saving
          setProperties(allProperties);
        }
      }
    };

    initializeDummyProperties();
  }, []);

  // Load properties from localStorage
  useEffect(() => {
    const loadProperties = () => {
      const props = getAllProperties();
      setProperties(props);
    };
    
    // Load immediately
    loadProperties();
    
    // Then set up interval for updates
    const interval = setInterval(loadProperties, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter((p) => 
      p.id.toLowerCase().includes(query) ||
      p.fullAddress.toLowerCase().includes(query) ||
      (p.price && p.price.toString().includes(query))
    );
  }, [properties, searchQuery]);

  const renderActiveContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            <VistralVisionIndicators properties={properties} />
            <VistralVisionPipelineEnhanced properties={properties} searchQuery={searchQuery} />
          </div>
        );
      case "transactions":
        return <VistralVisionTransactions properties={filteredProperties} />;
      case "rentals":
        return <VistralVisionRentals properties={filteredProperties} />;
      case "sales":
        return <VistralVisionSales properties={filteredProperties} />;
      case "reporting":
        return <VistralVisionReporting properties={filteredProperties} />;
      case "people":
        return <VistralVisionPeople />;
      case "document-compliance":
        return <VistralVisionDocumentCompliance properties={filteredProperties} />;
      case "ai-integrations":
        return <VistralVisionAIIntegrations />;
      case "admin":
        return <VistralVisionAdmin />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <VistralVisionSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Header */}
        {activeTab === "home" && (
          <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Vistral Vision</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete property pipeline - From new to rented
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by ID, address, price..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-input bg-background dark:bg-[var(--prophero-gray-900)] text-foreground dark:text-foreground text-sm w-64"
                />
                <button
                  onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                  className="px-4 py-2 rounded-lg bg-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-600)] text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Assistant
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-7xl mx-auto">
            {renderActiveContent()}
          </div>
        </div>
      </div>

      {/* AI Chat */}
      <VistralVisionAIChat 
        isOpen={isAIChatOpen}
        onOpenChange={setIsAIChatOpen}
        properties={properties}
      />
    </div>
  );
}

