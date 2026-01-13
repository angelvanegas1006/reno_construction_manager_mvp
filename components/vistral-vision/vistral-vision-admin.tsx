"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Database, Shield, Key, Users, Bell, Globe, Mail, Zap, BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function VistralVisionAdmin() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

  const adminCategories = [
    { id: "system", label: "System", icon: Settings, count: 8 },
    { id: "users", label: "Users & Roles", icon: Users, count: 12 },
    { id: "security", label: "Security", icon: Shield, count: 5 },
    { id: "integrations", label: "Integrations", icon: Zap, count: 15 },
    { id: "notifications", label: "Notifications", icon: Bell, count: 6 },
    { id: "analytics", label: "Analytics", icon: BarChart3, count: 10 },
  ];

  const adminItems = [
    {
      id: "sys-001",
      category: "system",
      title: "System Configuration",
      description: "General settings, preferences and platform configuration",
      icon: Settings,
      status: "active",
      lastUpdated: "2024-01-20",
    },
    {
      id: "sys-002",
      category: "system",
      title: "Data Management",
      description: "Backup, restore and database management",
      icon: Database,
      status: "active",
      lastUpdated: "2024-01-18",
    },
    {
      id: "sys-003",
      category: "system",
      title: "Email Configuration",
      description: "SMTP settings and email templates",
      icon: Mail,
      status: "active",
      lastUpdated: "2024-01-15",
    },
    {
      id: "sys-004",
      category: "system",
      title: "Localization",
      description: "Language and regional settings",
      icon: Globe,
      status: "active",
      lastUpdated: "2024-01-10",
    },
    {
      id: "user-001",
      category: "users",
      title: "User Management",
      description: "Manage users, roles and permissions",
      icon: Users,
      status: "active",
      lastUpdated: "2024-01-22",
    },
    {
      id: "user-002",
      category: "users",
      title: "Role Permissions",
      description: "Configure role-based access control",
      icon: Shield,
      status: "active",
      lastUpdated: "2024-01-19",
    },
    {
      id: "sec-001",
      category: "security",
      title: "Security Settings",
      description: "Security policies, password rules and 2FA",
      icon: Shield,
      status: "active",
      lastUpdated: "2024-01-21",
    },
    {
      id: "sec-002",
      category: "security",
      title: "API Keys",
      description: "API key management and external integrations",
      icon: Key,
      status: "active",
      lastUpdated: "2024-01-17",
    },
    {
      id: "int-001",
      category: "integrations",
      title: "Third-party Integrations",
      description: "Connect external services and APIs",
      icon: Zap,
      status: "active",
      lastUpdated: "2024-01-20",
    },
    {
      id: "notif-001",
      category: "notifications",
      title: "Notification Settings",
      description: "Configure email, SMS and push notifications",
      icon: Bell,
      status: "active",
      lastUpdated: "2024-01-16",
    },
    {
      id: "analytics-001",
      category: "analytics",
      title: "Analytics Configuration",
      description: "Set up tracking and reporting preferences",
      icon: BarChart3,
      status: "active",
      lastUpdated: "2024-01-14",
    },
  ];

  const filteredItems = selectedCategory === "all"
    ? adminItems
    : adminItems.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Admin</h1>
        <p className="text-muted-foreground">
          System administration & configuration
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedCategory === "all"
              ? "bg-[var(--prophero-blue-500)] text-white"
              : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
          )}
        >
          All ({adminItems.length})
        </button>
        {adminCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                selectedCategory === cat.id
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Admin Items Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-[var(--prophero-blue-500)] bg-card dark:bg-[var(--prophero-gray-900)]"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                    <CardTitle className="text-foreground">{item.title}</CardTitle>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--prophero-success)]/10 text-[var(--prophero-success)] dark:bg-[var(--prophero-success)]/20 dark:text-[var(--prophero-success)]">
                    {item.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

