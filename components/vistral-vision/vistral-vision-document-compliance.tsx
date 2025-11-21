"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { FileCheck, AlertCircle, CheckCircle2, Clock, FileText, Calendar, Building2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VistralVisionDocumentComplianceProps {
  properties: Property[];
}

type DocumentStatus = "valid" | "expiring" | "expired" | "missing";
type ComplianceStatus = "compliant" | "non-compliant" | "pending";

interface Document {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: string;
  name: string;
  status: DocumentStatus;
  issueDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

interface ComplianceItem {
  id: string;
  propertyId: string;
  propertyAddress: string;
  requirement: string;
  status: ComplianceStatus;
  lastCheck: string;
  nextCheck: string;
}

const mockDocuments: Document[] = [
  {
    id: "DOC-001",
    propertyId: "4463763",
    propertyAddress: "Calle Aragó 234, 08007 - Barcelona",
    type: "Energy Certificate",
    name: "Energy Efficiency Certificate",
    status: "expiring",
    issueDate: "2023-01-15",
    expiryDate: "2024-02-15",
    daysUntilExpiry: 25,
  },
  {
    id: "DOC-002",
    propertyId: "4463764",
    propertyAddress: "Calle Claudio Coello 89, 28006 - Madrid",
    type: "Insurance",
    name: "Property Insurance Policy",
    status: "valid",
    issueDate: "2024-01-01",
    expiryDate: "2025-01-01",
    daysUntilExpiry: 345,
  },
  {
    id: "DOC-003",
    propertyId: "4463765",
    propertyAddress: "Calle Passeig de Gràcia 92, 08008 - Barcelona",
    type: "License",
    name: "Rental License",
    status: "expired",
    issueDate: "2022-06-01",
    expiryDate: "2023-12-31",
    daysUntilExpiry: -45,
  },
  {
    id: "DOC-004",
    propertyId: "4463766",
    propertyAddress: "Avenida Diagonal 456, 08008 - Barcelona",
    type: "Energy Certificate",
    name: "Energy Efficiency Certificate",
    status: "valid",
    issueDate: "2023-06-01",
    expiryDate: "2025-06-01",
    daysUntilExpiry: 495,
  },
  {
    id: "DOC-005",
    propertyId: "4463767",
    propertyAddress: "Calle Serrano 123, 28006 - Madrid",
    type: "Insurance",
    name: "Property Insurance Policy",
    status: "expiring",
    issueDate: "2023-03-15",
    expiryDate: "2024-03-15",
    daysUntilExpiry: 55,
  },
  {
    id: "DOC-006",
    propertyId: "4463768",
    propertyAddress: "Calle Gran Vía 789, 28013 - Madrid",
    type: "License",
    name: "Rental License",
    status: "valid",
    issueDate: "2024-01-10",
    expiryDate: "2026-01-10",
    daysUntilExpiry: 720,
  },
  {
    id: "DOC-007",
    propertyId: "4463769",
    propertyAddress: "Calle Rambla Catalunya 321, 08008 - Barcelona",
    type: "Energy Certificate",
    name: "Energy Efficiency Certificate",
    status: "expired",
    issueDate: "2022-01-20",
    expiryDate: "2023-12-20",
    daysUntilExpiry: -35,
  },
  {
    id: "DOC-008",
    propertyId: "4463770",
    propertyAddress: "Calle Príncipe de Vergara 567, 28006 - Madrid",
    type: "Insurance",
    name: "Property Insurance Policy",
    status: "valid",
    issueDate: "2023-12-01",
    expiryDate: "2024-12-01",
    daysUntilExpiry: 315,
  },
];

const mockComplianceItems: ComplianceItem[] = [
  {
    id: "COMP-001",
    propertyId: "4463763",
    propertyAddress: "Calle Aragó 234, 08007 - Barcelona",
    requirement: "Fire Safety Inspection",
    status: "compliant",
    lastCheck: "2024-01-10",
    nextCheck: "2025-01-10",
  },
  {
    id: "COMP-002",
    propertyId: "4463764",
    propertyAddress: "Calle Claudio Coello 89, 28006 - Madrid",
    requirement: "Building Safety Certificate",
    status: "non-compliant",
    lastCheck: "2023-12-15",
    nextCheck: "2024-02-15",
  },
  {
    id: "COMP-003",
    propertyId: "4463765",
    propertyAddress: "Calle Passeig de Gràcia 92, 08008 - Barcelona",
    requirement: "Accessibility Compliance",
    status: "pending",
    lastCheck: "2023-11-20",
    nextCheck: "2024-03-20",
  },
  {
    id: "COMP-004",
    propertyId: "4463766",
    propertyAddress: "Avenida Diagonal 456, 08008 - Barcelona",
    requirement: "Fire Safety Inspection",
    status: "compliant",
    lastCheck: "2024-01-05",
    nextCheck: "2025-01-05",
  },
  {
    id: "COMP-005",
    propertyId: "4463767",
    propertyAddress: "Calle Serrano 123, 28006 - Madrid",
    requirement: "Building Safety Certificate",
    status: "compliant",
    lastCheck: "2023-11-30",
    nextCheck: "2024-11-30",
  },
  {
    id: "COMP-006",
    propertyId: "4463768",
    propertyAddress: "Calle Gran Vía 789, 28013 - Madrid",
    requirement: "Accessibility Compliance",
    status: "non-compliant",
    lastCheck: "2023-10-15",
    nextCheck: "2024-02-15",
  },
  {
    id: "COMP-007",
    propertyId: "4463769",
    propertyAddress: "Calle Rambla Catalunya 321, 08008 - Barcelona",
    requirement: "Fire Safety Inspection",
    status: "pending",
    lastCheck: "2023-09-20",
    nextCheck: "2024-03-20",
  },
  {
    id: "COMP-008",
    propertyId: "4463770",
    propertyAddress: "Calle Príncipe de Vergara 567, 28006 - Madrid",
    requirement: "Building Safety Certificate",
    status: "compliant",
    lastCheck: "2023-12-01",
    nextCheck: "2024-12-01",
  },
];

const getDocumentStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case "valid":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "expiring":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    case "expired":
      return "bg-[var(--prophero-danger)]/10 text-[var(--prophero-danger)] dark:bg-[var(--prophero-danger)]/20 dark:text-[var(--prophero-danger)]";
    case "missing":
      return "bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]";
    default:
      return "";
  }
};

const getComplianceStatusColor = (status: ComplianceStatus) => {
  switch (status) {
    case "compliant":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "non-compliant":
      return "bg-[var(--prophero-danger)]/10 text-[var(--prophero-danger)] dark:bg-[var(--prophero-danger)]/20 dark:text-[var(--prophero-danger)]";
    case "pending":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    default:
      return "";
  }
};

export function VistralVisionDocumentCompliance({ properties }: VistralVisionDocumentComplianceProps) {
  const [activeTab, setActiveTab] = useState<"documents" | "compliance">("documents");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const expiringDocuments = mockDocuments.filter(d => d.status === "expiring" || d.status === "expired").length;
  const compliantItems = mockComplianceItems.filter(c => c.status === "compliant").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Document & Compliance</h1>
        <p className="text-muted-foreground">
          Legal documentation, & compliance tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{mockDocuments.length}</p>
              </div>
              <FileText className="h-8 w-8 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring/Expired</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{expiringDocuments}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-[var(--prophero-warning)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliant Items</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {compliantItems}/{mockComplianceItems.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[var(--prophero-success)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("documents")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "documents"
              ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Documents ({mockDocuments.length})
        </button>
        <button
          onClick={() => setActiveTab("compliance")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "compliance"
              ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Compliance ({mockComplianceItems.length})
        </button>
      </div>

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="grid gap-4">
          {mockDocuments.map((doc) => (
            <Card key={doc.id} className="bg-card dark:bg-[var(--prophero-gray-900)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileCheck className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                      <div>
                        <p className="font-semibold text-foreground">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-8">
                      <Building2 className="h-4 w-4" />
                      <span>{doc.propertyAddress}</span>
                    </div>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize", getDocumentStatusColor(doc.status))}>
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Issue: {formatDate(doc.issueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Expiry: {formatDate(doc.expiryDate)}</span>
                  </div>
                  {doc.daysUntilExpiry >= 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{doc.daysUntilExpiry} days remaining</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--prophero-danger)]">
                      <AlertCircle className="h-4 w-4" />
                      <span>Expired {Math.abs(doc.daysUntilExpiry)} days ago</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === "compliance" && (
        <div className="grid gap-4">
          {mockComplianceItems.map((item) => (
            <Card key={item.id} className="bg-card dark:bg-[var(--prophero-gray-900)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileCheck className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                      <div>
                        <p className="font-semibold text-foreground">{item.requirement}</p>
                        <p className="text-sm text-muted-foreground">{item.propertyAddress}</p>
                      </div>
                    </div>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize", getComplianceStatusColor(item.status))}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Last check: {formatDate(item.lastCheck)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Next check: {formatDate(item.nextCheck)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

