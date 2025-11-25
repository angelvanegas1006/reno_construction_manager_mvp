"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";

export function FaviconSwitcher() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  const updateFavicon = useCallback(() => {
    // No hacer nada si estamos desmontando
    if (!mounted || isUnmountingRef.current) return;
    
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
      // Verificar nuevamente antes de manipular el DOM
      if (isUnmountingRef.current || typeof document === 'undefined' || !document.head) return;
      
      try {
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
            try {
              // Verificar que el elemento todavía está conectado al DOM y no estamos desmontando
              if (!isUnmountingRef.current && link.isConnected && link.parentNode) {
                link.remove();
              }
            } catch (e) {
              // Silenciar todos los errores durante manipulación del DOM
            }
          }
        });

        // No crear nuevos elementos si estamos desmontando
        if (isUnmountingRef.current) return;

        // Crear nuevo link si no existe uno con el path correcto
        const hasCorrectLink = existingLinks.some((link) => link.href.includes(iconPath));
        
        if (!hasCorrectLink && document.head && !isUnmountingRef.current) {
          try {
            const link = document.createElement("link");
            link.rel = rel;
            link.href = `${iconPath}?v=${Date.now()}`; // Agregar timestamp para forzar actualización
            
            // Verificar que document.head todavía existe antes de agregar
            if (document.head && document.head.parentNode && !isUnmountingRef.current) {
              document.head.appendChild(link);
            }
          } catch (e) {
            // Silenciar errores
          }
        } else {
          // Actualizar el existente con timestamp
          existingLinks.forEach((link) => {
            try {
              if (link.href.includes(iconPath) && link.parentNode && !isUnmountingRef.current) {
                link.href = `${iconPath}?v=${Date.now()}`;
              }
            } catch (e) {
              // Silenciar errores
            }
          });
        }
      } catch (error) {
        // Silenciar errores de manipulación del DOM durante desmontaje
      }
    };

    // Actualizar todos los tipos de iconos
    updateOrCreateLink("icon");
    updateOrCreateLink("shortcut icon");
    updateOrCreateLink("apple-touch-icon");

    // También eliminar y recrear el favicon.ico si existe
    if (!isUnmountingRef.current) {
      try {
        const faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
        if (faviconIco && faviconIco.isConnected && faviconIco.parentNode) {
          faviconIco.remove();
        }
      } catch (error) {
        // Silenciar errores durante desmontaje
      }
    }
  }, [mounted, resolvedTheme]);

  useEffect(() => {
    if (!isUnmountingRef.current) {
      updateFavicon();
    }
  }, [updateFavicon]);

  // Escuchar cambios en la clase dark del HTML
  useEffect(() => {
    if (!mounted || isUnmountingRef.current) return;
    if (typeof document === 'undefined' || !document.documentElement) return;

    const observer = new MutationObserver(() => {
      // Verificar que el componente todavía está montado antes de actualizar
      if (!isUnmountingRef.current && mounted && document.documentElement) {
        updateFavicon();
      }
    });

    try {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } catch (error) {
      // Silenciar errores
    }

    return () => {
      isUnmountingRef.current = true;
      try {
        observer.disconnect();
      } catch (error) {
        // Silenciar errores durante desmontaje
      }
    };
  }, [mounted, updateFavicon]);

  return null;
}

