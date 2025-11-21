"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { BarChart3, TrendingUp, DollarSign, Home, Receipt, FileText, PieChart, LineChart } from "lucide-react";
import { useMemo } from "react";

interface VistralVisionReportingProps {
  properties: Property[];
}

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  invoices: number;
  pendingInvoices: number;
}

const mockFinancialData: FinancialData = {
  totalRevenue: 2450000,
  totalExpenses: 850000,
  netProfit: 1600000,
  invoices: 342,
  pendingInvoices: 28,
};

export function VistralVisionReporting({ properties }: VistralVisionReportingProps) {
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const soldProperties = properties.filter(p => p.currentStage === "sold").length;
    const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const averagePrice = properties.length > 0 
      ? properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length 
      : 0;

    return {
      totalProperties,
      soldProperties,
      totalValue,
      averagePrice,
    };
  }, [properties]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Financial & Analytics</h1>
        <p className="text-muted-foreground">
          Invoicing, Accounting, Analytics & Reporting
        </p>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {(mockFinancialData.totalRevenue / 1000).toFixed(0)}K€
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
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {(mockFinancialData.totalExpenses / 1000).toFixed(0)}K€
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--prophero-danger)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {(mockFinancialData.netProfit / 1000).toFixed(0)}K€
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--prophero-blue-500)] dark:text-[var(--prophero-blue-400)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {((mockFinancialData.netProfit / mockFinancialData.totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
              <PieChart className="h-8 w-8 text-[var(--prophero-info)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoicing Section */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">Invoicing & Accounting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                  <div>
                    <p className="font-medium text-foreground">Total Invoices</p>
                    <p className="text-xs text-muted-foreground">Issued this period</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockFinancialData.invoices}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[var(--prophero-warning)]" />
                  <div>
                    <p className="font-medium text-foreground">Pending Invoices</p>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockFinancialData.pendingInvoices}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-[var(--prophero-success)]" />
                  <div>
                    <p className="font-medium text-foreground">Properties Sold</p>
                    <p className="text-xs text-muted-foreground">This period</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{stats.soldProperties}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-[var(--prophero-info)]" />
                  <div>
                    <p className="font-medium text-foreground">Conversion Rate</p>
                    <p className="text-xs text-muted-foreground">Sales efficiency</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {stats.totalProperties > 0 
                    ? ((stats.soldProperties / stats.totalProperties) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Total Portfolio Value</span>
              <span className="text-2xl font-bold text-foreground">
                {(stats.totalValue / 1000000).toFixed(1)}M€
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Average Property Value</span>
              <span className="text-2xl font-bold text-foreground">
                €{(stats.averagePrice / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Revenue Growth</span>
              <span className="text-2xl font-bold text-[var(--prophero-success)]">+18.5%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Profit Margin</span>
              <span className="text-2xl font-bold text-[var(--prophero-success)]">
                {((mockFinancialData.netProfit / mockFinancialData.totalRevenue) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Avg Days to Close</span>
              <span className="text-2xl font-bold text-foreground">42 days</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <span className="font-medium text-foreground">Customer Satisfaction</span>
              <span className="text-2xl font-bold text-[var(--prophero-success)]">4.8/5</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
        <CardHeader>
          <CardTitle className="text-foreground">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--prophero-blue-500)]" />
                <span className="font-medium text-foreground">Property Sales</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                {(mockFinancialData.totalRevenue * 0.65 / 1000).toFixed(0)}K€
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--prophero-success)]" />
                <span className="font-medium text-foreground">Rental Income</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                {(mockFinancialData.totalRevenue * 0.25 / 1000).toFixed(0)}K€
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--prophero-warning)]" />
                <span className="font-medium text-foreground">Service Fees</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                {(mockFinancialData.totalRevenue * 0.10 / 1000).toFixed(0)}K€
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
