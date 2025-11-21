"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, TrendingUp, BarChart3, FileText, Users, Home, CheckCircle2 } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  category: string;
  propertiesAffected: number;
  timeSaved: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: "WF-001",
    name: "Automated Property Valuation",
    description: "AI-powered property valuation using market data and property features",
    status: "active",
    category: "Valuation",
    propertiesAffected: 45,
    timeSaved: "8 hours/week",
  },
  {
    id: "WF-002",
    name: "Smart Lead Scoring",
    description: "Automatically score and prioritize leads based on behavior and profile",
    status: "active",
    category: "Sales",
    propertiesAffected: 120,
    timeSaved: "12 hours/week",
  },
  {
    id: "WF-003",
    name: "Document Auto-Classification",
    description: "Automatically classify and organize property documents",
    status: "active",
    category: "Documentation",
    propertiesAffected: 200,
    timeSaved: "6 hours/week",
  },
  {
    id: "WF-004",
    name: "Predictive Maintenance",
    description: "Predict maintenance needs based on property age and usage",
    status: "active",
    category: "Maintenance",
    propertiesAffected: 85,
    timeSaved: "4 hours/week",
  },
  {
    id: "WF-005",
    name: "Automated Contract Generation",
    description: "Generate rental and sales contracts automatically based on property and client data",
    status: "active",
    category: "Legal",
    propertiesAffected: 150,
    timeSaved: "10 hours/week",
  },
  {
    id: "WF-006",
    name: "Market Trend Analysis",
    description: "Analyze market trends and provide insights for pricing strategies",
    status: "active",
    category: "Analytics",
    propertiesAffected: 300,
    timeSaved: "5 hours/week",
  },
  {
    id: "WF-007",
    name: "Tenant Risk Assessment",
    description: "AI-powered tenant screening and risk assessment",
    status: "active",
    category: "Rentals",
    propertiesAffected: 90,
    timeSaved: "7 hours/week",
  },
  {
    id: "WF-008",
    name: "Smart Scheduling",
    description: "Optimize property viewings and appointments automatically",
    status: "inactive",
    category: "Operations",
    propertiesAffected: 0,
    timeSaved: "3 hours/week",
  },
];

export function VistralVisionAIIntegrations() {
  const activeWorkflows = mockWorkflows.filter(w => w.status === "active").length;
  const totalTimeSaved = mockWorkflows
    .filter(w => w.status === "active")
    .reduce((sum, w) => sum + parseInt(w.timeSaved.split(" ")[0]), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">AI Integrations</h1>
        <p className="text-muted-foreground">
          AI-driven workflows making real estate companies more scalable and profitable
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{activeWorkflows}</p>
              </div>
              <Sparkles className="h-8 w-8 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{totalTimeSaved} hrs/week</p>
              </div>
              <Zap className="h-8 w-8 text-[var(--prophero-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Properties Affected</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {mockWorkflows.reduce((sum, w) => sum + w.propertiesAffected, 0)}
                </p>
              </div>
              <Home className="h-8 w-8 text-[var(--prophero-info)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">AI Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors bg-card dark:bg-[var(--prophero-gray-900)]"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-foreground">{workflow.name}</p>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] text-muted-foreground">
                        {workflow.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{workflow.propertiesAffected} properties</span>
                      <span>·</span>
                      <span>Saves {workflow.timeSaved}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {workflow.status === "active" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--prophero-gray-100)] text-[var(--prophero-gray-700)] dark:bg-[var(--prophero-gray-800)] dark:text-[var(--prophero-gray-300)]">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

