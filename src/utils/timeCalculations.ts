import { ProductivityRating } from '../types';

/**
 * Converts total minutes to formatted "HH:MM" string.
 * Example: 390 -> "06:30", 90 -> "01:30", 0 -> "00:00"
 */
export function minutesToHHMM(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '00:00';
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Converts total minutes to friendly readable display string.
 * Example: 390 -> "6h 30m", 60 -> "1h 00m", 45 -> "0h 45m"
 */
export function minutesToReadable(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '0h 00m';
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

/**
 * Parses user input in "HH:MM" or decimal formats into integer total minutes.
 * Handles inputs like "06:30", "6:30", "6.5", "6", "6h 30m"
 */
export function parseTimeToMinutes(input: string | number): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.round(input * 60));
  }
  if (!input || typeof input !== 'string') return 0;

  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Check if it's colon-separated "HH:MM" or "H:M"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return Math.max(0, hours * 60 + minutes);
  }

  // Check if it's decimal format "6.5" or "6"
  const decimalVal = parseFloat(trimmed);
  if (!isNaN(decimalVal)) {
    return Math.max(0, Math.round(decimalVal * 60));
  }

  return 0;
}

/**
 * Converts minutes to decimal hours rounded to 2 decimal places.
 * Example: 390 -> 6.5
 */
export function minutesToDecimal(minutes: number): number {
  if (isNaN(minutes) || minutes <= 0) return 0;
  return Number((minutes / 60).toFixed(2));
}

/**
 * Calculates Billing Utilization %:
 * Formula: Billable Hours ÷ Total Working Hours × 100
 * Note: Total Working Hours = Billable + Non-Billable + Upskilling (Leave is not counted as working hours)
 */
export function calculateUtilization(billableMinutes: number, totalWorkingMinutes: number): number {
  if (!totalWorkingMinutes || totalWorkingMinutes <= 0) return 0;
  if (!billableMinutes || billableMinutes <= 0) return 0;
  const util = (billableMinutes / totalWorkingMinutes) * 100;
  return Number(Math.min(100, Math.max(0, util)).toFixed(1));
}

/**
 * Productivity rating rules:
 * - Below 50% -> Low
 * - 50% to 70% -> Moderate
 * - 70% to 85% -> Good
 * - Above 85% -> Excellent
 */
export function getProductivityRating(utilizationPercent: number): ProductivityRating {
  if (utilizationPercent < 50) return 'Low';
  if (utilizationPercent < 70) return 'Moderate';
  if (utilizationPercent <= 85) return 'Good';
  return 'Excellent';
}

/**
 * Theme and styling metadata for productivity indicators
 */
export function getProductivityBadgeProps(rating: ProductivityRating) {
  switch (rating) {
    case 'Excellent':
      return {
        label: 'Excellent',
        bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        barColor: 'bg-emerald-500 dark:bg-emerald-400',
      };
    case 'Good':
      return {
        label: 'Good',
        bgLight: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        dot: 'bg-blue-500 dark:bg-blue-400',
        barColor: 'bg-blue-500 dark:bg-blue-400',
      };
    case 'Moderate':
      return {
        label: 'Moderate',
        bgLight: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500 dark:bg-amber-400',
        barColor: 'bg-amber-500 dark:bg-amber-400',
      };
    case 'Low':
    default:
      return {
        label: 'Low',
        bgLight: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500 dark:bg-rose-400',
        barColor: 'bg-rose-500 dark:bg-rose-400',
      };
  }
}

/**
 * Format YYYY-MM-DD to "24-Aug-2026"
 */
export function formatDateDisplay(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dStr = day.toString().padStart(2, '0');
    return `${dStr}-${months[month - 1]}-${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Format YYYY-MM-DD with day of week: "Mon, 24-Aug-2026"
 */
export function formatDateWithDay(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dStr = day.toString().padStart(2, '0');
    return `${days[date.getDay()]}, ${dStr}-${months[month - 1]}-${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Returns today's date in local YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
