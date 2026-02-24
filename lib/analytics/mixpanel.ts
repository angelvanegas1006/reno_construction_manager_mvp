/**
 * Re-exporta desde el módulo canónico de Mixpanel (lib/mixpanel.ts).
 * Mantenido para compatibilidad con imports existentes.
 */
export {
  initMixpanel,
  trackEvent,
  trackEventWithDevice,
  getDeviceType,
  identifyUser,
  trackPageView,
  resetMixpanel,
  setUserProperties,
  incrementUserProperty,
} from "@/lib/mixpanel";
