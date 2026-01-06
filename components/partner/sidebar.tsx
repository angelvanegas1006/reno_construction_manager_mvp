"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid, Bell, HelpCircle, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { VistralLogo } from "@/components/vistral-logo";
import { ThemeSelector } from "@/components/user/theme-selector";
import { LanguageSelector } from "@/components/user/language-selector";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

// Navigation items - will be translated in component
const getNavigationItems = (t: any) => [
  {
    label: t.nav.home,
    href: "/partner",
    icon: Home,
  },
  {
    label: t.partner.navProperties,
    href: "/partner/kanban",
    icon: Grid,
  },
];

const getSettingsItems = (t: any) => [
  {
    label: t.nav.notifications,
    href: "/partner/notifications",
    icon: Bell,
    comingSoon: true,
  },
  {
    label: t.nav.help,
    href: "/partner/help",
    icon: HelpCircle,
    comingSoon: true,
  },
];

// Mock user data - will be replaced with real data later
const mockUser = {
  name: "Ana García",
  email: "anag@mail.com",
  initials: "AG",
};

interface PartnerSidebarProps {
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function PartnerSidebar({ isMobileOpen = false, onMobileToggle }: PartnerSidebarProps) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigationItems = getNavigationItems(t);
  const settingsItems = getSettingsItems(t);
  const pathname = usePathname();
  // Start collapsed if we're on the property edit page
  const isEditPage = pathname?.includes('/property/') && pathname?.includes('/edit');
  const [collapsed, setCollapsed] = useState(isEditPage);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile, always start collapsed
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update collapsed state when pathname changes
  useEffect(() => {
    const isEditPage = pathname?.includes('/property/') && pathname?.includes('/edit');
    if (!isMobile) {
      setCollapsed(isEditPage);
    }
  }, [pathname, isMobile]);

  // On mobile, render as overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileToggle}
          />
        )}

        {/* Mobile sidebar */}
        <div
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-64 flex flex-col border-r bg-sidebar dark:bg-[var(--prophero-gray-900)] transition-transform duration-300 transform md:hidden",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Mobile Header with Close Button */}
          <div className="border-b border-sidebar-border p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href="/partner/kanban" onClick={onMobileToggle}>
                <VistralLogo variant={null} />
              </Link>
              <button
                onClick={onMobileToggle}
                className="flex h-8 w-8 items-center justify-center rounded border border-sidebar-border bg-transparent hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-sidebar-foreground" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation - Always expanded */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.sidebar.platform}
              </p>
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  // More specific active check - avoid matching /partner when we want /partner/kanban
                  const isActive = pathname === item.href ||
                    (pathname?.startsWith(item.href + "/") && item.href !== "/partner");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileToggle}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/20 text-primary dark:text-white"
                          : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      </div>
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.sidebar.settings}
              </p>
              <nav className="space-y-1">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        if (item.comingSoon) {
                          console.log("Coming soon");
                        }
                        onMobileToggle?.();
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Mobile User Profile */}
          <div className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent flex-shrink-0">
                    <span className="text-sm font-semibold text-sidebar-foreground">{mockUser.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{mockUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    onMobileToggle?.();
                  }}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className={cn("hidden md:flex h-screen flex-col border-r bg-sidebar dark:bg-[var(--prophero-gray-900)] transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <Link href="/partner/kanban">
              <VistralLogo variant={null} />
            </Link>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex h-6 w-6 items-center justify-center rounded border border-sidebar-border bg-transparent hover:bg-accent transition-colors ml-auto"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4 text-sidebar-foreground" />
            </button>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex h-6 w-6 items-center justify-center rounded border border-sidebar-border bg-transparent hover:bg-accent transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4 text-sidebar-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation - Plataforma */}
      <div className="flex-1 overflow-y-auto p-4">
        {!collapsed && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
              Plataforma
            </p>
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                // More specific active check - avoid matching /partner when we want /partner/kanban
                const isActive = pathname === item.href ||
                  (pathname?.startsWith(item.href + "/") && item.href !== "/partner");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary dark:text-white"
                        : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
        {collapsed && (
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              // More specific active check - avoid matching /partner when we want /partner/kanban
              const isActive = pathname === item.href ||
                (pathname?.startsWith(item.href + "/") && item.href !== "/partner");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center rounded-md h-10 w-10 transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary dark:text-white"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </Link>
              );
            })}
          </nav>
        )}

        {/* Navigation - Ajustes */}
        {!collapsed && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
              {t.sidebar.settings}
            </p>
            <nav className="space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      if (item.comingSoon) {
                        // TODO: Show toast/notification
                        console.log("Coming soon");
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
        {collapsed && (
          <nav className="space-y-1 mt-4">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    if (item.comingSoon) {
                      // TODO: Show toast/notification
                      console.log("Coming soon");
                    }
                  }}
                  className="flex items-center justify-center rounded-md h-10 w-10 text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  title={item.label}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent flex-shrink-0">
                  <span className="text-sm font-semibold text-sidebar-foreground">{mockUser.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{mockUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <ThemeSelector />
              <DropdownMenuSeparator />
              <LanguageSelector />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-center rounded-md h-10 w-10 transition-colors hover:bg-accent">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent flex-shrink-0">
                  <span className="text-sm font-semibold text-sidebar-foreground">{mockUser.initials}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 border-b">
                <p className="text-sm font-medium">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground">{mockUser.email}</p>
              </div>

              {/* Theme Selector */}
              <ThemeSelector />
              <DropdownMenuSeparator />

              {/* Language Selector */}
              <LanguageSelector />

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  logout();
                }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
