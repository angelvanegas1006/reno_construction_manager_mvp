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
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { HelpModal } from "@/components/reno/help-modal";
import { extractNameFromEmail } from "@/lib/supabase/user-name-utils";
import { useHelpConversations } from "@/hooks/useHelpConversations";

// Navigation items for Reno Construction Manager
const getNavigationItems = (t: any) => [
  {
    label: t.nav.home,
    href: "/reno/construction-manager",
    icon: Home,
  },
  {
    label: t.nav.renoManagement,
    href: "/reno/construction-manager/kanban",
    icon: Grid,
  },
];

const getSettingsItems = (t: any, unreadCount: number = 0) => [
  {
    label: t.nav.notifications,
    href: "/reno/construction-manager/notifications",
    icon: Bell,
    comingSoon: false,
    badge: unreadCount > 0 ? unreadCount : undefined,
  },
  {
    label: t.nav.help,
    href: "/reno/construction-manager/help",
    icon: HelpCircle,
    comingSoon: true,
  },
];

interface RenoSidebarProps {
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function RenoSidebar({ isMobileOpen = false, onMobileToggle }: RenoSidebarProps) {
  const { t } = useI18n();
  const { user: supabaseUser, signOut } = useSupabaseAuthContext();
  const { user: appUser, role } = useAppAuth();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { unreadCount } = useHelpConversations();
  
  // Use Supabase signOut, fallback to mock logout if needed
  const handleLogout = async () => {
    await signOut();
  };
  const navigationItems = getNavigationItems(t);
  const settingsItems = getSettingsItems(t, unreadCount);
  const pathname = usePathname();
  
  // Get user name from email
  const userName = supabaseUser?.email 
    ? extractNameFromEmail(supabaseUser.email) 
    : appUser?.email 
    ? extractNameFromEmail(appUser.email)
    : undefined;
  
  // Always start collapsed - user can expand by clicking
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // On mobile, render as overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <button
          onClick={onMobileToggle}
          className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-md bg-card border shadow-lg hover:bg-accent transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileToggle}
          />
        )}

        {/* Mobile sidebar drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 h-full w-80 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link 
                href="/reno/construction-manager"
                onClick={onMobileToggle}
                className="flex-shrink-0 hover:opacity-80"
              >
                <VistralLogo variant={null} className="h-8" />
              </Link>
              <button
                onClick={onMobileToggle}
                className="p-2 rounded-md hover:bg-accent"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - same as desktop but mobile optimized */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
                  {t.sidebar.platform}
                </p>
                <nav className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                      (pathname?.startsWith(item.href + "/") && item.href !== "/reno/construction-manager");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileToggle}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/20 text-primary dark:text-white"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
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

              {/* Divider */}
              <div className="border-t border-border my-4" />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
                  {t.sidebar.configuration}
                </p>
                <nav className="space-y-1">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileToggle}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors min-w-0",
                          isActive
                            ? "bg-primary/20 text-primary dark:text-white"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground",
                          item.comingSoon && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                        {item.comingSoon && (
                          <span className="ml-auto text-xs text-muted-foreground">{t.sidebar.soon}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Footer - User Menu */}
            <div className="p-4 border-t border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-xs font-semibold">
                        {appUser?.email?.charAt(0).toUpperCase() || supabaseUser?.email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{appUser?.email || supabaseUser?.email || t.sidebar.user}</p>
                    <p className="text-xs text-muted-foreground truncate">{role || ""}</p>
                  </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <ThemeSelector />
                  <DropdownMenuSeparator />
                  <LanguageSelector />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen w-16 border-r border-border bg-card transition-all duration-300",
        !collapsed && "md:w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <Link 
            href="/reno/construction-manager"
            className="flex-shrink-0 transition-all duration-300 ease-in-out hover:opacity-80 flex items-center"
          >
            <VistralLogo variant={null} className="h-8" />
          </Link>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCollapsed((prev) => !prev);
          }}
          className={cn(
            "p-1.5 rounded-md hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#1a1a1a] transition-colors flex-shrink-0",
            collapsed ? "ml-auto" : ""
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

      {/* Navigation - Plataforma */}
      <div className="flex-1 overflow-y-auto p-4">
        {!collapsed && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
              {t.sidebar.platform}
            </p>
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (pathname?.startsWith(item.href + "/") && item.href !== "/reno/construction-manager");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary dark:text-white"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
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
              const isActive = pathname === item.href || 
                (pathname?.startsWith(item.href + "/") && item.href !== "/reno/construction-manager");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                    className={cn(
                      "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary dark:text-white"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>
        )}

        {/* Divider */}
        {!collapsed && <div className="border-t border-border my-4" />}

        {/* Settings */}
        {!collapsed && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--prophero-gray-400)]">
              {t.sidebar.configuration}
            </p>
            <nav className="space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                // Special handling for help item - open modal instead of link
                if (item.label === t.nav.help) {
                  return (
                    <button
                      key={item.href}
                      onClick={() => setIsHelpModalOpen(true)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                        "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary dark:text-white"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      item.comingSoon && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.comingSoon && !item.badge && (
                      <span className="ml-auto text-xs text-muted-foreground">Pronto</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                <span className="text-xs font-semibold">
                  {appUser?.email?.charAt(0).toUpperCase() || supabaseUser?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{appUser?.email || supabaseUser?.email || t.sidebar.user}</p>
                    <p className="text-xs text-muted-foreground truncate">{role || ""}</p>
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
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t.nav.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Help Modal */}
      <HelpModal
        open={isHelpModalOpen}
        onOpenChange={setIsHelpModalOpen}
        userName={userName}
        userRole={role || undefined}
      />
    </aside>
  );
}

