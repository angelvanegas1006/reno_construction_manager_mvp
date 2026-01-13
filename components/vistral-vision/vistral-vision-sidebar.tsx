"use client";

import { Home, FileText, Home as RentalsIcon, TrendingUp, BarChart3, Users, Settings, PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut, FileCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VistralLogo } from "@/components/vistral-logo";
import { VistralVisionTab } from "@/app/vistral-vision/page";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/user/theme-selector";
import { LanguageSelector } from "@/components/user/language-selector";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface VistralVisionSidebarProps {
  activeTab: VistralVisionTab;
  onTabChange: (tab: VistralVisionTab) => void;
}

// Mock user data
const mockUser = {
  name: "Super Admin",
  email: "admin@vistral.com",
  initials: "SA",
};

const tabs: Array<{ id: VistralVisionTab; label: string; icon: any; description: string }> = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    description: "Property pipeline"
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: FileText,
    description: "Property buying & Selling transactions end-to-end"
  },
  {
    id: "rentals",
    label: "Rentals",
    icon: RentalsIcon,
    description: "Rent roll (Tenant search, rental mgmt., financials)"
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    description: "Lead mgmt., client engagement"
  },
  {
    id: "reporting",
    label: "Reporting",
    icon: BarChart3,
    description: "Analytics & Reporting"
  },
  {
    id: "people",
    label: "People",
    icon: Users,
    description: "HR function, 100% connected to Operations"
  },
  {
    id: "document-compliance",
    label: "Document & Compliance",
    icon: FileCheck,
    description: "Legal documentation, & compliance tracking"
  },
  {
    id: "ai-integrations",
    label: "AI Integrations",
    icon: Sparkles,
    description: "AI-driven workflows making companies more scalable"
  },
  {
    id: "admin",
    label: "Admin",
    icon: Settings,
    description: "System administration & configuration"
  },
];

export function VistralVisionSidebar({ activeTab, onTabChange }: VistralVisionSidebarProps) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "hidden md:flex flex-col h-screen border-r border-border bg-card dark:bg-[var(--prophero-gray-900)] transition-all duration-300",
      collapsed ? "w-16" : "w-80"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex-1">
              <VistralLogo />
              <p className="text-xs text-muted-foreground mt-2">
                Super Admin Dashboard
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1.5 rounded-md hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] transition-colors flex-shrink-0",
              collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 text-foreground" />
            ) : (
              <PanelLeftClose className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        {!collapsed ? (
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors group",
                    isActive
                      ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                      : "text-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 mt-0.5",
                    isActive 
                      ? "text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isActive && "font-semibold"
                    )}>
                      {tab.label}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5 leading-tight",
                      isActive
                        ? "text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                        : "text-muted-foreground"
                    )}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors w-full",
                    isActive
                      ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                      : "text-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]"
                  )}
                  title={tab.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Footer - User Menu */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              collapsed && "justify-center"
            )}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--prophero-blue-500)] text-white flex-shrink-0">
                <span className="text-xs font-semibold">
                  {(user?.name || mockUser.name)?.charAt(0).toUpperCase() || "SA"}
                </span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || mockUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || mockUser.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <ThemeSelector />
            <DropdownMenuSeparator />
            <LanguageSelector />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t.nav.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

