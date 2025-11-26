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

        // En lugar de remover elementos, solo actualizar el href de los existentes
        // Esto evita conflictos con React durante el desmontaje
        let foundCorrectLink = false;
        existingLinks.forEach((link) => {
          try {
            if (link.isConnected && link.parentNode && !isUnmountingRef.current) {
              if (link.href.includes(iconPath)) {
                // Actualizar el existente con timestamp
                link.href = `${iconPath}?v=${Date.now()}`;
                foundCorrectLink = true;
              } else {
                // Actualizar el href del link existente en lugar de removerlo
                link.href = `${iconPath}?v=${Date.now()}`;
                foundCorrectLink = true;
              }
            }
          } catch (e) {
            // Silenciar todos los errores durante manipulación del DOM
          }
        });

        // Solo crear nuevo link si no existe ninguno y no estamos desmontando
        if (!foundCorrectLink && document.head && !isUnmountingRef.current) {
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
        }
      } catch (error) {
        // Silenciar errores de manipulación del DOM durante desmontaje
      }
    };

    // Actualizar todos los tipos de iconos
    updateOrCreateLink("icon");
    updateOrCreateLink("shortcut icon");
    updateOrCreateLink("apple-touch-icon");

    // Actualizar favicon.ico si existe (en lugar de removerlo)
    if (!isUnmountingRef.current) {
      try {
        const faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
        if (faviconIco && faviconIco.isConnected && faviconIco.parentNode) {
          // Actualizar href en lugar de remover
          faviconIco.href = `${iconPath}?v=${Date.now()}`;
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

