"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function FaviconSwitcher() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !resolvedTheme) return;

    // Determinar si estamos en dark mode
    // Verificar tanto el resolvedTheme como la clase dark en el HTML
    const htmlElement = document.documentElement;
    const hasDarkClass = htmlElement.classList.contains("dark");
    const isDark = resolvedTheme === "dark" || hasDarkClass;

    const iconPath = isDark ? "/icon-dark.svg" : "/icon.svg";

    // Función para actualizar o crear un link
    const updateOrCreateLink = (rel: string, href: string) => {
      // Buscar por rel exacto o por rel que contenga el valor
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      // Si no se encuentra, buscar por rel que contenga el valor
      if (!link) {
        const allLinks = document.querySelectorAll("link[rel]");
        allLinks.forEach((l) => {
          const relValue = l.getAttribute("rel");
          if (relValue && relValue.includes(rel)) {
            link = l as HTMLLinkElement;
          }
        });
      }
      
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      
      // Solo actualizar si el href es diferente para evitar recargas innecesarias
      if (link.href !== `${window.location.origin}${iconPath}`) {
        link.href = iconPath;
      }
    };

    // Actualizar todos los iconos
    updateOrCreateLink("icon", iconPath);
    updateOrCreateLink("shortcut icon", iconPath);
    updateOrCreateLink("apple-touch-icon", iconPath);

    // También actualizar el favicon.ico si existe
    const faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
    if (faviconIco) {
      faviconIco.href = iconPath;
    }
  }, [theme, resolvedTheme, mounted]);

  // También escuchar cambios en la clase dark del HTML
  useEffect(() => {
    if (!mounted) return;

    const observer = new MutationObserver(() => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains("dark");
      const isDark = resolvedTheme === "dark" || hasDarkClass;
      const iconPath = isDark ? "/icon-dark.svg" : "/icon.svg";

      const updateLink = (rel: string) => {
        const link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
        if (link && link.href !== `${window.location.origin}${iconPath}`) {
          link.href = iconPath;
        }
      };

      updateLink("icon");
      updateLink("shortcut icon");
      updateLink("apple-touch-icon");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [mounted, resolvedTheme]);

  return null;
}

