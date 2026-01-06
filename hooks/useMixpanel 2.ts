"use client";

import { useCallback } from "react";
import { trackEvent, setUserProperties, incrementUserProperty } from "@/lib/analytics/mixpanel";

/**
 * Custom hook for Mixpanel analytics
 * Provides easy-to-use functions for tracking events
 */
export function useMixpanel() {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties);
  }, []);

  const setProperties = useCallback((properties: Record<string, any>) => {
    setUserProperties(properties);
  }, []);

  const increment = useCallback((property: string, value: number = 1) => {
    incrementUserProperty(property, value);
  }, []);

  return {
    track,
    setProperties,
    increment,
  };
}

