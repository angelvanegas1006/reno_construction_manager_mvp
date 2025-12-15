"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { VistralLogo } from "@/components/vistral-logo";
import { ThemeSelector } from "@/components/user/theme-selector";
import { LanguageSelector } from "@/components/user/language-selector";
import { useI18n } from "@/lib/i18n";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAuth0 } from "@auth0/auth0-react";

// Navigation items for Settlements Analyst
const getNavigationItems = (t: any) => [
  {
    label: "Inicio",
    href: "/settlements",
    icon: Home,
  },
  {
    label: "Kanban",
    href: "/settlements/kanban",
    icon: Grid,
  },
];

interface SettlementsSidebarProps {
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function SettlementsSidebar({ isMobileOpen = false, onMobileToggle }: SettlementsSidebarProps) {
  const { t } = useI18n();
  const { signOut } = useSupabaseAuthContext();
  const { isAuthenticated: isAuth0Authenticated, logout: auth0Logout } = useAuth0();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Unified logout: handle both Auth0 and Supabase
  const handleLogout = async () => {
    // Logout from Supabase
    await signOut();
    
    // Also logout from Auth0 if authenticated
    if (isAuth0Authenticated && auth0Logout) {
      auth0Logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin + '/login' : '/login',
        },
      });
    }
  };

  const navItems = getNavigationItems(t);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 lg:z-auto",
          "bg-card border-r border-border",
          "flex flex-col",
          "transition-all duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Header */}
        <div className="h-[64px] border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          {!isCollapsed && (
            <Link href="/settlements" className="flex items-center gap-2">
              <VistralLogo iconOnly={false} />
            </Link>
          )}
          {isCollapsed && (
            <Link href="/settlements" className="flex items-center justify-center w-full">
              <VistralLogo iconOnly={true} />
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5 text-muted-foreground" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={onMobileToggle}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => {
                  if (onMobileToggle) {
                    onMobileToggle();
                  }
                }}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <LanguageSelector />
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

