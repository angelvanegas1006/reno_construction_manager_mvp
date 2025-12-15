/**
 * Utility functions for calculating renovation update dates based on renovation type
 */

export type RenoType = 'Light Reno' | 'Medium Reno' | 'Major Reno' | string;

/**
 * Get the number of days until next update based on renovation type
 * - Light Reno: 7 days
 * - Medium Reno: 14 days (2 weeks)
 * - Major Reno: 30 days (1 month)
 */
export function getUpdateIntervalDays(renoType?: string | null): number {
  if (!renoType) return 7; // Default to Light Reno interval
  
  const renoTypeLower = renoType.toLowerCase();
  
  if (renoTypeLower.includes('light')) {
    return 7;
  } else if (renoTypeLower.includes('medium')) {
    return 14;
  } else if (renoTypeLower.includes('major')) {
    return 30;
  }
  
  return 7; // Default to Light Reno interval
}

/**
 * Base date for all renovation updates: Friday, December 11, 2024
 * All updates are calculated from this date forward
 */
const BASE_UPDATE_DATE = new Date('2024-12-11T00:00:00.000Z'); // Friday, December 11, 2024

/**
 * Calculate the next update date based on base date and renovation type
 * All updates are calculated from the base date (Friday, December 11, 2024) forward
 * @param lastUpdateDate ISO date string of the last update (or null/undefined) - used for fallback only
 * @param renoType Type of renovation (Light Reno, Medium Reno, Major Reno)
 * @returns ISO date string of the next update date
 */
export function calculateNextUpdateDate(
  lastUpdateDate: string | null | undefined,
  renoType?: string | null
): string | null {
  const intervalDays = getUpdateIntervalDays(renoType);
  
  // Calculate next update from base date
  // Find the next update date that is >= today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Start from base date
  let nextUpdate = new Date(BASE_UPDATE_DATE);
  nextUpdate.setHours(0, 0, 0, 0);
  
  // Keep adding interval days until we get a date >= today
  while (nextUpdate < today) {
    nextUpdate.setDate(nextUpdate.getDate() + intervalDays);
  }
  
  return nextUpdate.toISOString();
}

/**
 * Calculate the next update date from a specific last update date (for when user saves progress)
 * This is used when a user explicitly saves progress, which resets the cycle
 * @param lastUpdateDate ISO date string of the last update
 * @param renoType Type of renovation (Light Reno, Medium Reno, Major Reno)
 * @returns ISO date string of the next update date
 */
export function calculateNextUpdateDateFromLastUpdate(
  lastUpdateDate: string,
  renoType?: string | null
): string {
  const lastUpdate = new Date(lastUpdateDate);
  const intervalDays = getUpdateIntervalDays(renoType);
  
  const nextUpdate = new Date(lastUpdate);
  nextUpdate.setDate(nextUpdate.getDate() + intervalDays);
  
  return nextUpdate.toISOString();
}

/**
 * Check if a property needs an update based on next update date
 * @param nextUpdateDate ISO date string of the next update date
 * @returns true if the next update date is today or in the past
 */
export function needsUpdate(nextUpdateDate: string | null | undefined): boolean {
  if (!nextUpdateDate) return false;
  
  const nextUpdate = new Date(nextUpdateDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextUpdate.setHours(0, 0, 0, 0);
  
  return nextUpdate <= today;
}

/**
 * Check if a property needs an update this week (Monday to Sunday)
 * @param nextUpdateDate ISO date string of the next update date
 * @returns true if the next update date falls within the current week (Monday to Sunday)
 */
export function needsUpdateThisWeek(nextUpdateDate: string | null | undefined): boolean {
  if (!nextUpdateDate) return false;
  
  const nextUpdate = new Date(nextUpdateDate);
  nextUpdate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get Monday of current week
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, so we need to go back 6 days
  const mondayOfWeek = new Date(today);
  mondayOfWeek.setDate(today.getDate() + diffToMonday);
  mondayOfWeek.setHours(0, 0, 0, 0);
  
  // Get Sunday of current week
  const sundayOfWeek = new Date(mondayOfWeek);
  sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
  sundayOfWeek.setHours(23, 59, 59, 999);
  
  return nextUpdate >= mondayOfWeek && nextUpdate <= sundayOfWeek;
}

/**
 * Check if a property should have been updated last week (Monday to Sunday)
 * @param nextUpdateDate ISO date string of the next update date
 * @returns true if the next update date was in the previous week (Monday to Sunday)
 */
export function shouldHaveUpdatedLastWeek(nextUpdateDate: string | null | undefined): boolean {
  if (!nextUpdateDate) return false;
  
  const nextUpdate = new Date(nextUpdateDate);
  nextUpdate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get Monday of current week
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayOfWeek = new Date(today);
  mondayOfWeek.setDate(today.getDate() + diffToMonday);
  mondayOfWeek.setHours(0, 0, 0, 0);
  
  // Get Monday of last week
  const mondayOfLastWeek = new Date(mondayOfWeek);
  mondayOfLastWeek.setDate(mondayOfWeek.getDate() - 7);
  
  // Get Sunday of last week
  const sundayOfLastWeek = new Date(mondayOfLastWeek);
  sundayOfLastWeek.setDate(mondayOfLastWeek.getDate() + 6);
  sundayOfLastWeek.setHours(23, 59, 59, 999);
  
  return nextUpdate >= mondayOfLastWeek && nextUpdate <= sundayOfLastWeek;
}

