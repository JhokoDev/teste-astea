/**
 * Utility for handling simulated time in the application.
 */

// Key for localStorage
const TIME_OFFSET_KEY = 'simulated_time_offset_days';

/**
 * Gets the current simulated time offset in days.
 */
export function getTimeOffset(): number {
  const saved = localStorage.getItem(TIME_OFFSET_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

/**
 * Sets the current simulated time offset in days.
 */
export function setTimeOffset(days: number): void {
  localStorage.setItem(TIME_OFFSET_KEY, days.toString());
}

/**
 * Returns a new Date object representing the current time plus the simulated offset.
 */
export function getSimulatedDate(): Date {
  const now = new Date();
  const offsetDays = getTimeOffset();
  
  if (offsetDays === 0) return now;
  
  const simulated = new Date(now);
  simulated.setDate(simulated.getDate() + offsetDays);
  return simulated;
}

/**
 * Checks if a given date string is in the past, relative to the simulated current time.
 */
export function isPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date < getSimulatedDate();
}

/**
 * Checks if a given date string is in the future, relative to the simulated current time.
 */
export function isFuture(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date > getSimulatedDate();
}

/**
 * Formats a date relative to the simulated current time (e.g., "em 2 dias", "há 3 dias").
 */
export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = getSimulatedDate();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays === -1) return 'ontem';
  
  if (diffDays > 0) return `em ${diffDays} dias`;
  return `há ${Math.abs(diffDays)} dias`;
}
