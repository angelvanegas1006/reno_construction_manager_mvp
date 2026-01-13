"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { TrendingUp, User, Phone, Mail, MapPin, Calendar, Euro, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VistralVisionSalesProps {
  properties: Property[];
}

type LeadStage = "new" | "contacted" | "qualified" | "viewing" | "negotiation" | "offer" | "closed" | "lost";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: "Purchase" | "Rental";
  propertyInterest: string;
  stage: LeadStage;
  value: number;
  source: string;
  firstContact: string;
  lastContact: string;
  notes: string;
  nextAction: string;
}

const mockLeads: Lead[] = [
  {
    id: "LEAD-001",
    name: "Ana Rodríguez",
    email: "ana.rodriguez@email.com",
    phone: "+34 612 345 678",
    interest: "Purchase",
    propertyInterest: "Apartment in Barcelona, 2-3 bedrooms",
    stage: "qualified",
    value: 250000,
    source: "Website",
    firstContact: "2024-01-10",
    lastContact: "2024-01-15",
    notes: "Interested in properties in Eixample area",
    nextAction: "Schedule property viewing",
  },
  {
    id: "LEAD-002",
    name: "José López",
    email: "jose.lopez@email.com",
    phone: "+34 623 456 789",
    interest: "Rental",
    propertyInterest: "House in Madrid, 3+ bedrooms",
    stage: "viewing",
    value: 1200,
    source: "Referral",
    firstContact: "2024-01-05",
    lastContact: "2024-01-18",
    notes: "Looking for long-term rental, family with 2 children",
    nextAction: "Send rental agreement draft",
  },
  {
    id: "LEAD-003",
    name: "Laura Sánchez",
    email: "laura.sanchez@email.com",
    phone: "+34 634 567 890",
    interest: "Purchase",
    propertyInterest: "Penthouse in Valencia",
    stage: "negotiation",
    value: 380000,
    source: "Social Media",
    firstContact: "2023-12-20",
    lastContact: "2024-01-20",
    notes: "Budget flexible, wants to close quickly",
    nextAction: "Finalize offer details",
  },
  {
    id: "LEAD-004",
    name: "Miguel Torres",
    email: "miguel.torres@email.com",
    phone: "+34 645 678 901",
    interest: "Purchase",
    propertyInterest: "Investment property in Barcelona",
    stage: "new",
    value: 200000,
    source: "Website",
    firstContact: "2024-01-22",
    lastContact: "2024-01-22",
    notes: "First contact, needs more information",
    nextAction: "Send property portfolio",
  },
  {
    id: "LEAD-005",
    name: "Elena Moreno",
    email: "elena.moreno@email.com",
    phone: "+34 656 789 012",
    interest: "Purchase",
    propertyInterest: "Apartment in Madrid center, 1-2 bedrooms",
    stage: "contacted",
    value: 180000,
    source: "Website",
    firstContact: "2024-01-20",
    lastContact: "2024-01-21",
    notes: "First-time buyer, needs guidance",
    nextAction: "Send first-time buyer guide",
  },
  {
    id: "LEAD-006",
    name: "Roberto Silva",
    email: "roberto.silva@email.com",
    phone: "+34 667 890 123",
    interest: "Rental",
    propertyInterest: "Studio or 1-bedroom in Barcelona",
    stage: "qualified",
    value: 850,
    source: "Social Media",
    firstContact: "2024-01-15",
    lastContact: "2024-01-19",
    notes: "Moving for work, needs quick solution",
    nextAction: "Schedule virtual tour",
  },
  {
    id: "LEAD-007",
    name: "Patricia López",
    email: "patricia.lopez@email.com",
    phone: "+34 678 901 234",
    interest: "Purchase",
    propertyInterest: "Luxury apartment in Barcelona, 3+ bedrooms",
    stage: "offer",
    value: 750000,
    source: "Referral",
    firstContact: "2023-11-15",
    lastContact: "2024-01-22",
    notes: "High-value client, very interested",
    nextAction: "Review and respond to offer",
  },
  {
    id: "LEAD-008",
    name: "David Martín",
    email: "david.martin@email.com",
    phone: "+34 689 012 345",
    interest: "Rental",
    propertyInterest: "House with garden in Madrid suburbs",
    stage: "viewing",
    value: 1800,
    source: "Website",
    firstContact: "2024-01-08",
    lastContact: "2024-01-17",
    notes: "Family relocating, needs space for kids",
    nextAction: "Follow up after viewing",
  },
  {
    id: "LEAD-009",
    name: "Isabel Torres",
    email: "isabel.torres@email.com",
    phone: "+34 690 123 456",
    interest: "Purchase",
    propertyInterest: "Investment property portfolio",
    stage: "closed",
    value: 1200000,
    source: "Referral",
    firstContact: "2023-10-01",
    lastContact: "2024-01-10",
    notes: "Closed deal for 3 properties",
    nextAction: "Post-sale follow-up",
  },
  {
    id: "LEAD-010",
    name: "Miguel Ángel Pérez",
    email: "miguel.perez@email.com",
    phone: "+34 601 234 567",
    interest: "Purchase",
    propertyInterest: "Apartment in Valencia, 2 bedrooms",
    stage: "negotiation",
    value: 195000,
    source: "Website",
    firstContact: "2024-01-12",
    lastContact: "2024-01-21",
    notes: "Negotiating price, very motivated",
    nextAction: "Present counter-offer",
  },
  {
    id: "LEAD-011",
    name: "Sandra Jiménez",
    email: "sandra.jimenez@email.com",
    phone: "+34 612 345 678",
    interest: "Rental",
    propertyInterest: "Temporary rental, 6 months",
    stage: "new",
    value: 1400,
    source: "Social Media",
    firstContact: "2024-01-23",
    lastContact: "2024-01-23",
    notes: "Short-term rental needed",
    nextAction: "Check availability",
  },
  {
    id: "LEAD-012",
    name: "Francisco Ruiz",
    email: "francisco.ruiz@email.com",
    phone: "+34 623 456 789",
    interest: "Purchase",
    propertyInterest: "Commercial space in Madrid",
    stage: "lost",
    value: 450000,
    source: "Website",
    firstContact: "2023-09-10",
    lastContact: "2023-12-15",
    notes: "Found property elsewhere",
    nextAction: "Archive lead",
  },
];

const getStageColor = (stage: LeadStage) => {
  switch (stage) {
    case "new":
      return "bg-[var(--prophero-blue-50)] text-[var(--prophero-blue-700)] dark:bg-[var(--prophero-blue-950)] dark:text-[var(--prophero-blue-400)]";
    case "contacted":
      return "bg-[var(--prophero-info)]/10 text-[var(--prophero-info)] dark:bg-[var(--prophero-info)]/20 dark:text-[var(--prophero-info)]";
    case "qualified":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "viewing":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    case "negotiation":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    case "offer":
      return "bg-[var(--prophero-blue-500)]/10 text-[var(--prophero-blue-700)] dark:bg-[var(--prophero-blue-500)]/20 dark:text-[var(--prophero-blue-400)]";
    case "closed":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "lost":
      return "bg-[var(--prophero-danger)]/10 text-[var(--prophero-danger)] dark:bg-[var(--prophero-danger)]/20 dark:text-[var(--prophero-danger)]";
    default:
      return "bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]";
  }
};

export function VistralVisionSales({ properties }: VistralVisionSalesProps) {
  const [selectedStage, setSelectedStage] = useState<LeadStage | "all">("all");

  const filteredLeads = selectedStage === "all"
    ? mockLeads
    : mockLeads.filter(l => l.stage === selectedStage);

  const stages: LeadStage[] = ["new", "contacted", "qualified", "viewing", "negotiation", "offer", "closed", "lost"];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const totalPipelineValue = mockLeads
    .filter(l => !["closed", "lost"].includes(l.stage))
    .reduce((sum, l) => sum + l.value, 0);

  const conversionRate = ((mockLeads.filter(l => l.stage === "closed").length / mockLeads.length) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Sales</h1>
        <p className="text-muted-foreground">
          Lead mgmt., client engagement
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{mockLeads.length}</p>
              </div>
              <User className="h-8 w-8 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {(totalPipelineValue / 1000).toFixed(0)}K€
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--prophero-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--prophero-info)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStage("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedStage === "all"
              ? "bg-[var(--prophero-blue-500)] text-white"
              : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
          )}
        >
          All ({mockLeads.length})
        </button>
        {stages.map((stage) => {
          const count = mockLeads.filter(l => l.stage === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                selectedStage === stage
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              {stage} ({count})
            </button>
          );
        })}
      </div>

      {/* Leads List */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLeads.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No leads found</p>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors bg-card dark:bg-[var(--prophero-gray-900)]"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] flex items-center justify-center">
                      <User className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{lead.name}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {lead.propertyInterest}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Source: {lead.source}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Last contact: {formatDate(lead.lastContact)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next action: {lead.nextAction}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {lead.interest === "Purchase" ? "€" : ""}
                        {lead.value.toLocaleString("en-US")}
                        {lead.interest === "Rental" ? "/month" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{lead.interest}</p>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize", getStageColor(lead.stage))}>
                      {lead.stage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
