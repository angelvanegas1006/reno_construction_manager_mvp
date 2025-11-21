"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { FileText, Calendar, Euro, TrendingUp, User, Building2, Clock, CheckCircle2, XCircle, AlertCircle, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VistralVisionTransactionsProps {
  properties: Property[];
}

type TransactionStage = "initiated" | "negotiation" | "contract" | "closing" | "completed" | "cancelled";

interface Transaction {
  id: string;
  propertyId: string;
  propertyAddress: string;
  buyer: string;
  seller: string;
  agent: string;
  stage: TransactionStage;
  price: number;
  initiatedDate: string;
  expectedClosingDate: string;
  documents: number;
  parties: number;
}

const mockTransactions: Transaction[] = [
  {
    id: "TXN-001",
    propertyId: "4463763",
    propertyAddress: "Calle Aragó 234, 08007 - Barcelona",
    buyer: "María González",
    seller: "Carlos Martínez",
    agent: "Ana López",
    stage: "negotiation",
    price: 320000,
    initiatedDate: "2024-01-15",
    expectedClosingDate: "2024-03-15",
    documents: 5,
    parties: 3,
  },
  {
    id: "TXN-002",
    propertyId: "4463764",
    propertyAddress: "Calle Claudio Coello 89, 28006 - Madrid",
    buyer: "José Rodríguez",
    seller: "Laura Sánchez",
    agent: "Pedro García",
    stage: "contract",
    price: 450000,
    initiatedDate: "2024-01-10",
    expectedClosingDate: "2024-02-28",
    documents: 8,
    parties: 3,
  },
  {
    id: "TXN-003",
    propertyId: "4463765",
    propertyAddress: "Calle Passeig de Gràcia 92, 08008 - Barcelona",
    buyer: "Ana Fernández",
    seller: "Miguel Torres",
    agent: "Sofia Ruiz",
    stage: "closing",
    price: 580000,
    initiatedDate: "2023-12-01",
    expectedClosingDate: "2024-02-15",
    documents: 12,
    parties: 4,
  },
  {
    id: "TXN-004",
    propertyId: "4463766",
    propertyAddress: "Avenida Diagonal 456, 08008 - Barcelona",
    buyer: "Roberto Silva",
    seller: "Elena Moreno",
    agent: "Carlos Martínez",
    stage: "initiated",
    price: 275000,
    initiatedDate: "2024-01-20",
    expectedClosingDate: "2024-04-20",
    documents: 3,
    parties: 3,
  },
  {
    id: "TXN-005",
    propertyId: "4463767",
    propertyAddress: "Calle Serrano 123, 28006 - Madrid",
    buyer: "Patricia López",
    seller: "Fernando Ruiz",
    agent: "Ana López",
    stage: "negotiation",
    price: 520000,
    initiatedDate: "2024-01-12",
    expectedClosingDate: "2024-03-30",
    documents: 6,
    parties: 3,
  },
  {
    id: "TXN-006",
    propertyId: "4463768",
    propertyAddress: "Calle Gran Vía 789, 28013 - Madrid",
    buyer: "David Martín",
    seller: "Carmen García",
    agent: "Pedro García",
    stage: "contract",
    price: 380000,
    initiatedDate: "2024-01-05",
    expectedClosingDate: "2024-02-20",
    documents: 9,
    parties: 4,
  },
  {
    id: "TXN-007",
    propertyId: "4463769",
    propertyAddress: "Calle Rambla Catalunya 321, 08008 - Barcelona",
    buyer: "Isabel Torres",
    seller: "Javier Sánchez",
    agent: "Sofia Ruiz",
    stage: "completed",
    price: 650000,
    initiatedDate: "2023-11-15",
    expectedClosingDate: "2024-01-30",
    documents: 15,
    parties: 4,
  },
  {
    id: "TXN-008",
    propertyId: "4463770",
    propertyAddress: "Calle Príncipe de Vergara 567, 28006 - Madrid",
    buyer: "Miguel Ángel Pérez",
    seller: "Lucía Fernández",
    agent: "Carlos Martínez",
    stage: "closing",
    price: 495000,
    initiatedDate: "2023-12-10",
    expectedClosingDate: "2024-02-25",
    documents: 11,
    parties: 3,
  },
  {
    id: "TXN-009",
    propertyId: "4463771",
    propertyAddress: "Calle Muntaner 890, 08021 - Barcelona",
    buyer: "Sandra Jiménez",
    seller: "Antonio López",
    agent: "Ana López",
    stage: "cancelled",
    price: 420000,
    initiatedDate: "2023-10-20",
    expectedClosingDate: "2024-01-15",
    documents: 7,
    parties: 3,
  },
  {
    id: "TXN-010",
    propertyId: "4463772",
    propertyAddress: "Calle Velázquez 234, 28001 - Madrid",
    buyer: "Francisco Ruiz",
    seller: "María José Martínez",
    agent: "Pedro García",
    stage: "initiated",
    price: 550000,
    initiatedDate: "2024-01-25",
    expectedClosingDate: "2024-05-01",
    documents: 4,
    parties: 3,
  },
];

const getStageColor = (stage: TransactionStage) => {
  switch (stage) {
    case "initiated":
      return "bg-[var(--prophero-blue-50)] text-[var(--prophero-blue-700)] dark:bg-[var(--prophero-blue-950)] dark:text-[var(--prophero-blue-400)]";
    case "negotiation":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    case "contract":
      return "bg-[var(--prophero-info)]/10 text-[var(--prophero-info)] dark:bg-[var(--prophero-info)]/20 dark:text-[var(--prophero-info)]";
    case "closing":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "completed":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "cancelled":
      return "bg-[var(--prophero-danger)]/10 text-[var(--prophero-danger)] dark:bg-[var(--prophero-danger)]/20 dark:text-[var(--prophero-danger)]";
    default:
      return "bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]";
  }
};

const getStageIcon = (stage: TransactionStage) => {
  switch (stage) {
    case "completed":
      return CheckCircle2;
    case "cancelled":
      return XCircle;
    case "closing":
      return AlertCircle;
    default:
      return Clock;
  }
};

export function VistralVisionTransactions({ properties }: VistralVisionTransactionsProps) {
  const [selectedStage, setSelectedStage] = useState<TransactionStage | "all">("all");

  const filteredTransactions = selectedStage === "all" 
    ? mockTransactions 
    : mockTransactions.filter(t => t.stage === selectedStage);

  const stages: TransactionStage[] = ["initiated", "negotiation", "contract", "closing", "completed", "cancelled"];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Transactions</h1>
        <p className="text-muted-foreground">
          Manage Property buying & Selling transactions end-to-end
        </p>
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
          All ({mockTransactions.length})
        </button>
        {stages.map((stage) => {
          const count = mockTransactions.filter(t => t.stage === stage).length;
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

      {/* Transactions List */}
      <div className="grid gap-4">
        {filteredTransactions.length === 0 ? (
          <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No transactions found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => {
            const StageIcon = getStageIcon(transaction.stage);
            
            return (
              <Card key={transaction.id} className="bg-card dark:bg-[var(--prophero-gray-900)]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                        <div>
                          <p className="font-semibold text-foreground">{transaction.propertyAddress}</p>
                          <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
                        </div>
                      </div>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1", getStageColor(transaction.stage))}>
                      <StageIcon className="h-3 w-3" />
                      {transaction.stage}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="font-medium text-foreground">{transaction.buyer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Seller:</span>
                        <span className="font-medium text-foreground">{transaction.seller}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="font-medium text-foreground">{transaction.agent}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold text-foreground">
                          {transaction.price.toLocaleString("en-US")}€
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Initiated:</span>
                        <span className="font-medium text-foreground">{formatDate(transaction.initiatedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expected Closing:</span>
                        <span className="font-medium text-foreground">{formatDate(transaction.expectedClosingDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{transaction.documents} documents</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{transaction.parties} parties</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
