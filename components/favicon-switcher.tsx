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
    
    // Verificar que document y document.head existan
    if (typeof document === 'undefined' || !document.head) return;

    // Determinar si estamos en dark mode - verificar la clase dark en el HTML directamente
    const htmlElement = document.documentElement;
    if (!htmlElement) return;
    
    const hasDarkClass = htmlElement.classList.contains("dark");
    
    // Usar resolvedTheme si está disponible, sino verificar la clase dark
    const isDark = resolvedTheme === "dark" || (resolvedTheme === undefined && hasDarkClass) || hasDarkClass;

    const iconPath = isDark ? "/icon-dark.svg" : "/icon.svg";

    // Función para actualizar o crear un link de forma más agresiva
    const updateOrCreateLink = (rel: string) => {
      try {
        // Verificar que document.head existe antes de continuar
        if (!document.head || !document.head.parentNode) return;

        // Buscar todos los links con ese rel
        const existingLinks = Array.from(document.querySelectorAll(`link[rel]`)).filter(
          (link) => {
            const relAttr = link.getAttribute("rel");
            return relAttr === rel || (relAttr && relAttr.includes(rel.split(" ")[0]));
          }
        ) as HTMLLinkElement[];

        // Eliminar los existentes que no coincidan (con verificación de seguridad)
        existingLinks.forEach((link) => {
          if (!link.href.includes(iconPath)) {
            // Verificar que el link todavía está en el DOM antes de eliminarlo
            if (link.parentNode) {
              try {
                link.remove();
              } catch (e) {
                // Si falla, intentar con removeChild de forma segura
                if (link.parentNode && link.parentNode.contains(link)) {
                  link.parentNode.removeChild(link);
                }
              }
            }
          }
        });

        // Crear nuevo link si no existe uno con el path correcto
        const hasCorrectLink = existingLinks.some((link) => link.href.includes(iconPath));
        
        if (!hasCorrectLink && document.head) {
          const link = document.createElement("link");
          link.rel = rel;
          link.href = `${iconPath}?v=${Date.now()}`; // Agregar timestamp para forzar actualización
          
          // Verificar que document.head todavía existe antes de agregar
          if (document.head && document.head.parentNode) {
            document.head.appendChild(link);
          }
        } else {
          // Actualizar el existente con timestamp
          existingLinks.forEach((link) => {
            if (link.href.includes(iconPath) && link.parentNode) {
              link.href = `${iconPath}?v=${Date.now()}`;
            }
          });
        }
      } catch (error) {
        // Silenciar errores de manipulación del DOM durante desmontaje
        console.warn('[FaviconSwitcher] Error updating favicon:', error);
      }
    };

    // Actualizar todos los tipos de iconos
    updateOrCreateLink("icon");
    updateOrCreateLink("shortcut icon");
    updateOrCreateLink("apple-touch-icon");

    // También eliminar y recrear el favicon.ico si existe
    try {
      const faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
      if (faviconIco && faviconIco.parentNode) {
        faviconIco.remove();
      }
    } catch (error) {
      // Silenciar errores durante desmontaje
    }
  }, [mounted, resolvedTheme]);

  useEffect(() => {
    updateFavicon();
  }, [updateFavicon]);

  // Escuchar cambios en la clase dark del HTML
  useEffect(() => {
    if (!mounted) return;
    if (typeof document === 'undefined' || !document.documentElement) return;

    const observer = new MutationObserver(() => {
      // Verificar que el componente todavía está montado antes de actualizar
      if (mounted && document.documentElement) {
        updateFavicon();
      }
    });

    try {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } catch (error) {
      console.warn('[FaviconSwitcher] Error setting up observer:', error);
    }

    return () => {
      try {
        observer.disconnect();
      } catch (error) {
        // Silenciar errores durante desmontaje
      }
    };
  }, [mounted, updateFavicon]);

  return null;
}

