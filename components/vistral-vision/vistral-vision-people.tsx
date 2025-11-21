"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Briefcase, Award, Building2, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "on-leave" | "inactive";
  email: string;
  phone: string;
  assignedProperties: number;
  performance: number;
  joinDate: string;
}

const employees: Employee[] = [
  {
    id: "EMP-001",
    name: "María García",
    role: "Property Analyst",
    department: "Operations",
    status: "active",
    email: "maria.garcia@vistral.com",
    phone: "+34 611 111 111",
    assignedProperties: 12,
    performance: 95,
    joinDate: "2023-01-15",
  },
  {
    id: "EMP-002",
    name: "Carlos Martínez",
    role: "Sales Manager",
    department: "Sales",
    status: "active",
    email: "carlos.martinez@vistral.com",
    phone: "+34 622 222 222",
    assignedProperties: 8,
    performance: 88,
    joinDate: "2022-06-01",
  },
  {
    id: "EMP-003",
    name: "Ana López",
    role: "Construction Manager",
    department: "Reno",
    status: "active",
    email: "ana.lopez@vistral.com",
    phone: "+34 633 333 333",
    assignedProperties: 5,
    performance: 92,
    joinDate: "2023-03-20",
  },
  {
    id: "EMP-004",
    name: "Pedro Sánchez",
    role: "Property Analyst",
    department: "Operations",
    status: "on-leave",
    email: "pedro.sanchez@vistral.com",
    phone: "+34 644 444 444",
    assignedProperties: 0,
    performance: 85,
    joinDate: "2023-08-10",
  },
  {
    id: "EMP-005",
    name: "Laura Fernández",
    role: "Sales Representative",
    department: "Sales",
    status: "active",
    email: "laura.fernandez@vistral.com",
    phone: "+34 655 555 555",
    assignedProperties: 15,
    performance: 91,
    joinDate: "2022-03-10",
  },
  {
    id: "EMP-006",
    name: "Javier Ruiz",
    role: "Property Analyst",
    department: "Operations",
    status: "active",
    email: "javier.ruiz@vistral.com",
    phone: "+34 666 666 666",
    assignedProperties: 10,
    performance: 87,
    joinDate: "2023-05-20",
  },
  {
    id: "EMP-007",
    name: "Sofia Martínez",
    role: "Construction Coordinator",
    department: "Reno",
    status: "active",
    email: "sofia.martinez@vistral.com",
    phone: "+34 677 777 777",
    assignedProperties: 7,
    performance: 89,
    joinDate: "2023-07-15",
  },
  {
    id: "EMP-008",
    name: "Roberto Silva",
    role: "Sales Representative",
    department: "Sales",
    status: "active",
    email: "roberto.silva@vistral.com",
    phone: "+34 688 888 888",
    assignedProperties: 18,
    performance: 94,
    joinDate: "2022-11-01",
  },
  {
    id: "EMP-009",
    name: "Elena Moreno",
    role: "Property Analyst",
    department: "Operations",
    status: "active",
    email: "elena.moreno@vistral.com",
    phone: "+34 699 999 999",
    assignedProperties: 9,
    performance: 86,
    joinDate: "2023-09-05",
  },
  {
    id: "EMP-010",
    name: "David Torres",
    role: "Construction Manager",
    department: "Reno",
    status: "inactive",
    email: "david.torres@vistral.com",
    phone: "+34 600 000 000",
    assignedProperties: 0,
    performance: 82,
    joinDate: "2021-12-01",
  },
];

export function VistralVisionPeople() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const departments = ["all", "Operations", "Sales", "Reno"];
  const filteredEmployees = selectedDepartment === "all"
    ? employees
    : employees.filter(e => e.department === selectedDepartment);

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalAssignedProperties = employees.reduce((sum, e) => sum + e.assignedProperties, 0);
  const averagePerformance = employees.length > 0
    ? (employees.reduce((sum, e) => sum + e.performance, 0) / employees.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">People</h1>
        <p className="text-muted-foreground">
          HR function, 100% connected to Operations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{activeEmployees}</p>
              </div>
              <Award className="h-8 w-8 text-[var(--prophero-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{averagePerformance}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--prophero-blue-500)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Filter */}
      <div className="flex flex-wrap gap-2">
        {departments.map((dept) => {
          const count = dept === "all" 
            ? employees.length 
            : employees.filter(e => e.department === dept).length;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                selectedDepartment === dept
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              {dept} ({count})
            </button>
          );
        })}
      </div>

      {/* Employees List */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors bg-card dark:bg-[var(--prophero-gray-900)]"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.role} · {employee.department}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">{employee.email}</span>
                      <span className="text-xs text-muted-foreground">{employee.phone}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{employee.assignedProperties} properties</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{employee.performance}% performance</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium capitalize",
                    employee.status === "active"
                      ? "bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]"
                      : employee.status === "on-leave"
                      ? "bg-[var(--prophero-warning)]/10 text-[var(--prophero-warning)] dark:bg-[var(--prophero-warning)]/20 dark:text-[var(--prophero-warning)]"
                      : "bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]"
                  )}>
                    {employee.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
