"use client";

import mixpanel from "mixpanel-browser";

let isInitialized = false;
let initializationWarningShown = false;

/**
 * Inicializa Mixpanel solo en el cliente.
 * Usa NEXT_PUBLIC_MIXPANEL_TOKEN y la configuración indicada.
 */
export function initMixpanel(): void {
  if (typeof window === "undefined") return;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Mixpanel] Token no configurado. Analytics deshabilitado.");
    }
    return;
  }

  mixpanel.init(token, {
    autocapture: true,
    record_sessions_percent: 100,
    api_host: "https://api-eu.mixpanel.com",
    debug: process.env.NODE_ENV !== "production",
  });

  isInitialized = true;
  if (process.env.NODE_ENV === "development") {
    console.log("[Mixpanel] Inicializado correctamente");
  }
  // Evento de prueba para verificar que los datos llegan a Mixpanel
  mixpanel.track("Mixpanel Ready", {
    source: "lib/mixpanel",
    env: process.env.NODE_ENV,
  });
}

function checkInitialized(): boolean {
  if (!isInitialized) {
    if (!initializationWarningShown && process.env.NODE_ENV === "development") {
      console.warn("[Mixpanel] No inicializado. Llama a initMixpanel() primero.");
      initializationWarningShown = true;
    }
    return false;
  }
  return true;
}

/**
 * Detecta si el usuario está en móvil o desktop (solo en cliente).
 */
export function getDeviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "desktop";
  return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
}

/**
 * Registra un evento en Mixpanel.
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    console.error("[Mixpanel] Error al registrar evento:", error);
  }
}

/**
 * Registra un evento en Mixpanel inyectando device_type automáticamente.
 */
export function trackEventWithDevice(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const withDevice = { ...properties, device_type: getDeviceType() };
  trackEvent(eventName, withDevice);
}

/**
 * Identifica al usuario actual (login o cuando tengas el id).
 */
export function identifyUser(userId: string, userProperties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  mixpanel.identify(userId);
  if (userProperties) {
    mixpanel.people.set(userProperties);
  }
}

/**
 * Registra una vista de página (para uso en el provider).
 */
export function trackPageView(pageName?: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  mixpanel.track("Page Viewed", {
    page: pageName ?? (typeof window !== "undefined" ? window.location.pathname : ""),
    ...properties,
  });
}

/**
 * Resetea la identidad del usuario (logout).
 */
export function resetMixpanel(): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  mixpanel.reset();
  isInitialized = false;
}

/**
 * Establece propiedades del usuario actual (para compatibilidad con useMixpanel).
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  mixpanel.people.set(properties);
}

/**
 * Incrementa una propiedad numérica del usuario (para compatibilidad con useMixpanel).
 */
export function incrementUserProperty(property: string, value: number = 1): void {
  if (typeof window === "undefined" || !checkInitialized()) return;
  mixpanel.people.increment(property, value);
}
