"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";

export function FaviconSwitcher() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateFavicon = useCallback(() => {
    if (!mounted) return;

    // Determinar si estamos en dark mode - verificar la clase dark en el HTML directamente
    const htmlElement = document.documentElement;
    const hasDarkClass = htmlElement.classList.contains("dark");
    
    // Usar resolvedTheme si está disponible, sino verificar la clase dark
    const isDark = resolvedTheme === "dark" || (resolvedTheme === undefined && hasDarkClass) || hasDarkClass;

    const iconPath = isDark ? "/icon-dark.svg" : "/icon.svg";

    // Función para actualizar o crear un link de forma más agresiva
    const updateOrCreateLink = (rel: string) => {
      // Buscar todos los links con ese rel
      const existingLinks = Array.from(document.querySelectorAll(`link[rel]`)).filter(
        (link) => {
          const relAttr = link.getAttribute("rel");
          return relAttr === rel || (relAttr && relAttr.includes(rel.split(" ")[0]));
        }
      ) as HTMLLinkElement[];

      // Eliminar los existentes que no coincidan
      existingLinks.forEach((link) => {
        if (!link.href.includes(iconPath)) {
          link.remove();
        }
      });

      // Crear nuevo link si no existe uno con el path correcto
      const hasCorrectLink = existingLinks.some((link) => link.href.includes(iconPath));
      
      if (!hasCorrectLink) {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = `${iconPath}?v=${Date.now()}`; // Agregar timestamp para forzar actualización
        document.head.appendChild(link);
      } else {
        // Actualizar el existente con timestamp
        existingLinks.forEach((link) => {
          if (link.href.includes(iconPath)) {
            link.href = `${iconPath}?v=${Date.now()}`;
          }
        });
      }
    };

    // Actualizar todos los tipos de iconos
    updateOrCreateLink("icon");
    updateOrCreateLink("shortcut icon");
    updateOrCreateLink("apple-touch-icon");

    // También eliminar y recrear el favicon.ico si existe
    const faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
    if (faviconIco) {
      faviconIco.remove();
    }
  }, [mounted, resolvedTheme]);

  useEffect(() => {
    updateFavicon();
  }, [updateFavicon]);

  // Escuchar cambios en la clase dark del HTML
  useEffect(() => {
    if (!mounted) return;

    const observer = new MutationObserver(() => {
      updateFavicon();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [mounted, updateFavicon]);

  return null;
}

