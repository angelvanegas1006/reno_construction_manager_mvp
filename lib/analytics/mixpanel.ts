"use client";

import mixpanel from "mixpanel-browser";

// Track initialization state
let isInitialized = false;

/**
 * Initialize Mixpanel
 * Should be called once when the app loads
 */
export function initMixpanel() {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  
  if (!token) {
    console.warn("[Mixpanel] Token not configured. Analytics will be disabled.");
    return;
  }

  // Initialize Mixpanel
  mixpanel.init(token, {
    debug: process.env.NODE_ENV === "development",
    track_pageview: true, // Automatically track page views
    persistence: "localStorage", // Store user data in localStorage
    ignore_dnt: false, // Respect Do Not Track
    api_host: "https://api.mixpanel.com", // Use Mixpanel's API
  });

  isInitialized = true;
  console.log("[Mixpanel] Initialized successfully");
}

/**
 * Check if Mixpanel is initialized
 */
function checkInitialized(): boolean {
  if (!isInitialized) {
    console.warn("[Mixpanel] Not initialized. Call initMixpanel() first.");
    return false;
  }
  return true;
}

/**
 * Identify a user
 * Call this when a user logs in or when you have user information
 */
export function identifyUser(userId: string, userProperties?: Record<string, any>) {
  if (!checkInitialized()) return;

  mixpanel.identify(userId);
  
  if (userProperties) {
    mixpanel.people.set(userProperties);
  }

  console.log("[Mixpanel] User identified:", userId);
}

/**
 * Reset user identity
 * Call this when a user logs out
 */
export function resetMixpanel() {
  if (!checkInitialized()) return;

  mixpanel.reset();
  isInitialized = false;
  console.log("[Mixpanel] User identity reset");
}

/**
 * Track an event
 * @param eventName - Name of the event
 * @param properties - Additional properties to send with the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!checkInitialized()) return;

  try {
    mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("[Mixpanel] Error tracking event:", error);
  }
}

/**
 * Set user properties
 * Updates properties for the current user
 */
export function setUserProperties(properties: Record<string, any>) {
  if (!checkInitialized()) return;

  mixpanel.people.set(properties);
}

/**
 * Increment a user property
 * Useful for counters like "properties_viewed", "tasks_completed", etc.
 */
export function incrementUserProperty(property: string, value: number = 1) {
  if (!checkInitialized()) return;

  mixpanel.people.increment(property, value);
}

/**
 * Track page view
 * Can be called manually if auto-tracking is disabled
 */
export function trackPageView(pageName?: string, properties?: Record<string, any>) {
  if (!checkInitialized()) return;

  mixpanel.track("Page Viewed", {
    page: pageName || (typeof window !== "undefined" ? window.location.pathname : ""),
    ...properties,
  });
}

