"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface VistralLogoProps {
  className?: string;
  variant?: "light" | "dark" | null;
}

export function VistralLogo({ className, variant }: VistralLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dark mode state when theme changes
  useEffect(() => {
    if (!mounted) return;
    if (typeof document === 'undefined' || !document.documentElement) return;
    
    const checkDarkMode = () => {
      // Verificar que document.documentElement todavía existe
      if (!document.documentElement) return;
      
      const hasDarkClass = document.documentElement.classList.contains("dark");
      const isDark = resolvedTheme === "dark" || hasDarkClass;
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Listen for class changes on HTML element
    let observer: MutationObserver | null = null;
    
    try {
      observer = new MutationObserver(checkDarkMode);
      if (document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    } catch (error) {
      console.warn('[VistralLogo] Error setting up observer:', error);
    }

    return () => {
      try {
        if (observer) {
          observer.disconnect();
        }
      } catch (error) {
        // Silenciar errores durante desmontaje
      }
    };
  }, [mounted, resolvedTheme]);

  // If variant is null, use theme-aware colors
  const useThemeAware = variant === null || variant === undefined;
  
  const logoSrc = useThemeAware && isDarkMode ? "/vistral-logo-dark.svg" : "/vistral-logo.svg";
  
  const textColor = useThemeAware 
    ? undefined // Use default text color (theme-aware)
    : variant === "dark" 
      ? "#ffffff" 
      : "#1e293b";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      {/* SVG Logo from public folder */}
      <div className="flex-shrink-0 relative" style={{ width: 32, height: 32 }}>
        <Image
          src={logoSrc}
          alt="Vistral Logo"
          width={32}
          height={32}
          className="object-contain"
          priority
          unoptimized
        />
      </div>
      
      <div className="flex flex-col min-w-0">
        <span 
          className={cn("text-sm font-bold leading-tight whitespace-nowrap", !useThemeAware && "text-foreground")} 
          style={textColor ? { color: textColor } : undefined}
        >
          VISTRAL
        </span>
        <span 
          className={cn("text-xs font-light leading-tight whitespace-nowrap", !useThemeAware && "text-foreground")} 
          style={textColor ? { color: textColor } : undefined}
        >
          by PropHero
        </span>
      </div>
    </div>
  );
}

