"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { Home, Euro, Calendar, Users, FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VistralVisionRentalsProps {
  properties: Property[];
}

type RentalStatus = "active" | "pending" | "expired" | "terminated";

interface Rental {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
    idNumber: string;
  };
  monthlyRent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  status: RentalStatus;
  paymentStatus: "current" | "overdue" | "paid";
  documents: number;
  maintenanceRequests: number;
}

const mockRentals: Rental[] = [
  {
    id: "RENT-001",
    propertyId: "4463766",
    propertyAddress: "Calle Gracia 123, 08012 - Barcelona",
    tenant: {
      name: "María González",
      email: "maria.gonzalez@email.com",
      phone: "+34 612 345 678",
      idNumber: "12345678A",
    },
    monthlyRent: 1200,
    deposit: 2400,
    startDate: "2024-01-15",
    endDate: "2025-01-14",
    status: "active",
    paymentStatus: "current",
    documents: 3,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-002",
    propertyId: "4463765",
    propertyAddress: "Calle Passeig de Gràcia 92, 08008 - Barcelona",
    tenant: {
      name: "Carlos Martínez",
      email: "carlos.martinez@email.com",
      phone: "+34 623 456 789",
      idNumber: "87654321B",
    },
    monthlyRent: 1500,
    deposit: 3000,
    startDate: "2024-02-01",
    endDate: "2025-01-31",
    status: "active",
    paymentStatus: "overdue",
    documents: 4,
    maintenanceRequests: 2,
  },
  {
    id: "RENT-003",
    propertyId: "4463764",
    propertyAddress: "Calle Claudio Coello 89, 28006 - Madrid",
    tenant: {
      name: "Ana López",
      email: "ana.lopez@email.com",
      phone: "+34 634 567 890",
      idNumber: "11223344C",
    },
    monthlyRent: 1800,
    deposit: 3600,
    startDate: "2023-11-01",
    endDate: "2024-10-31",
    status: "expired",
    paymentStatus: "current",
    documents: 5,
    maintenanceRequests: 1,
  },
  {
    id: "RENT-004",
    propertyId: "4463773",
    propertyAddress: "Calle Diagonal 456, 08008 - Barcelona",
    tenant: {
      name: "Roberto Silva",
      email: "roberto.silva@email.com",
      phone: "+34 645 678 901",
      idNumber: "22334455D",
    },
    monthlyRent: 1350,
    deposit: 2700,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "active",
    paymentStatus: "current",
    documents: 3,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-005",
    propertyId: "4463774",
    propertyAddress: "Calle Serrano 234, 28006 - Madrid",
    tenant: {
      name: "Patricia López",
      email: "patricia.lopez@email.com",
      phone: "+34 656 789 012",
      idNumber: "33445566E",
    },
    monthlyRent: 2200,
    deposit: 4400,
    startDate: "2023-09-15",
    endDate: "2024-09-14",
    status: "active",
    paymentStatus: "current",
    documents: 6,
    maintenanceRequests: 1,
  },
  {
    id: "RENT-006",
    propertyId: "4463775",
    propertyAddress: "Calle Gran Vía 567, 28013 - Madrid",
    tenant: {
      name: "David Martín",
      email: "david.martin@email.com",
      phone: "+34 667 890 123",
      idNumber: "44556677F",
    },
    monthlyRent: 950,
    deposit: 1900,
    startDate: "2024-02-15",
    endDate: "2025-02-14",
    status: "active",
    paymentStatus: "overdue",
    documents: 2,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-007",
    propertyId: "4463776",
    propertyAddress: "Calle Rambla Catalunya 789, 08008 - Barcelona",
    tenant: {
      name: "Isabel Torres",
      email: "isabel.torres@email.com",
      phone: "+34 678 901 234",
      idNumber: "55667788G",
    },
    monthlyRent: 1650,
    deposit: 3300,
    startDate: "2023-12-01",
    endDate: "2024-11-30",
    status: "expired",
    paymentStatus: "paid",
    documents: 4,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-008",
    propertyId: "4463777",
    propertyAddress: "Calle Príncipe de Vergara 123, 28006 - Madrid",
    tenant: {
      name: "Miguel Ángel Pérez",
      email: "miguel.perez@email.com",
      phone: "+34 689 012 345",
      idNumber: "66778899H",
    },
    monthlyRent: 1950,
    deposit: 3900,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    status: "pending",
    paymentStatus: "current",
    documents: 3,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-009",
    propertyId: "4463778",
    propertyAddress: "Calle Muntaner 456, 08021 - Barcelona",
    tenant: {
      name: "Sandra Jiménez",
      email: "sandra.jimenez@email.com",
      phone: "+34 690 123 456",
      idNumber: "77889900I",
    },
    monthlyRent: 1100,
    deposit: 2200,
    startDate: "2023-08-01",
    endDate: "2024-07-31",
    status: "terminated",
    paymentStatus: "paid",
    documents: 5,
    maintenanceRequests: 0,
  },
  {
    id: "RENT-010",
    propertyId: "4463779",
    propertyAddress: "Calle Velázquez 789, 28001 - Madrid",
    tenant: {
      name: "Francisco Ruiz",
      email: "francisco.ruiz@email.com",
      phone: "+34 601 234 567",
      idNumber: "88990011J",
    },
    monthlyRent: 2400,
    deposit: 4800,
    startDate: "2024-01-10",
    endDate: "2025-01-09",
    status: "active",
    paymentStatus: "current",
    documents: 7,
    maintenanceRequests: 3,
  },
];

const getStatusColor = (status: RentalStatus) => {
  switch (status) {
    case "active":
      return "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]";
    case "pending":
      return "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]";
    case "expired":
      return "bg-[var(--prophero-danger)]/10 text-[var(--prophero-danger)] dark:bg-[var(--prophero-danger)]/20 dark:text-[var(--prophero-danger)]";
    case "terminated":
      return "bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]";
    default:
      return "";
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "current":
      return "text-[var(--prophero-success)]";
    case "overdue":
      return "text-[var(--prophero-danger)]";
    case "paid":
      return "text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]";
    default:
      return "";
  }
};

export function VistralVisionRentals({ properties }: VistralVisionRentalsProps) {
  const [selectedStatus, setSelectedStatus] = useState<RentalStatus | "all">("all");

  const filteredRentals = selectedStatus === "all"
    ? mockRentals
    : mockRentals.filter(r => r.status === selectedStatus);

  const statuses: RentalStatus[] = ["active", "pending", "expired", "terminated"];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const totalMonthlyRent = mockRentals
    .filter(r => r.status === "active")
    .reduce((sum, r) => sum + r.monthlyRent, 0);

  const occupancyRate = ((mockRentals.filter(r => r.status === "active").length / mockRentals.length) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Rentals</h1>
        <p className="text-muted-foreground">
          Rent roll (Tenant search, rental mgmt., financials)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rentals</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {mockRentals.filter(r => r.status === "active").length}
                </p>
              </div>
              <Home className="h-8 w-8 text-[var(--prophero-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {totalMonthlyRent.toLocaleString("en-US")}€
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{occupancyRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[var(--prophero-info)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStatus("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedStatus === "all"
              ? "bg-[var(--prophero-blue-500)] text-white"
              : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
          )}
        >
          All ({mockRentals.length})
        </button>
        {statuses.map((status) => {
          const count = mockRentals.filter(r => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                selectedStatus === status
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Rentals List */}
      <div className="grid gap-4">
        {filteredRentals.length === 0 ? (
          <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No rentals found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRentals.map((rental) => (
            <Card key={rental.id} className="bg-card dark:bg-[var(--prophero-gray-900)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Home className="h-5 w-5 text-[var(--prophero-success)]" />
                      <div>
                        <p className="font-semibold text-foreground">{rental.propertyAddress}</p>
                        <p className="text-sm text-muted-foreground">Rental ID: {rental.id}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize", getStatusColor(rental.status))}>
                      {rental.status}
                    </span>
                    <span className={cn("text-xs font-medium capitalize", getPaymentStatusColor(rental.paymentStatus))}>
                      Payment: {rental.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tenant:</span>
                      <span className="font-medium text-foreground">{rental.tenant.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground ml-6">Email:</span>
                      <span className="font-medium text-foreground">{rental.tenant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground ml-6">Phone:</span>
                      <span className="font-medium text-foreground">{rental.tenant.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Monthly Rent:</span>
                      <span className="font-semibold text-foreground">
                        {rental.monthlyRent.toLocaleString("en-US")}€
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deposit:</span>
                      <span className="font-semibold text-foreground">
                        {rental.deposit.toLocaleString("en-US")}€
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium text-foreground">
                        {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{rental.documents} documents</span>
                  </div>
                  {rental.maintenanceRequests > 0 && (
                    <div className="flex items-center gap-2 text-sm text-[var(--prophero-warning)]">
                      <AlertCircle className="h-4 w-4" />
                      <span>{rental.maintenanceRequests} maintenance requests</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
