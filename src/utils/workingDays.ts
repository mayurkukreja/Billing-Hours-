import { AppSettings, Holiday, BillingEntry, DaySummary } from '../types';
import { calculateUtilization } from './timeCalculations';

/**
 * Checks if a given day of week index (0=Sun, 1=Mon, ..., 6=Sat) is a working day
 */
export function isWorkingDayIndex(dayOfWeek: number, settings: AppSettings): boolean {
  if (settings.workingDaysPreset === 'mon-fri') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  if (settings.workingDaysPreset === 'mon-sat') {
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }
  return settings.customWorkingDays.includes(dayOfWeek);
}

/**
 * Checks if a specific date (YYYY-MM-DD) is a configured holiday
 */
export function getHolidayForDate(dateStr: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.date === dateStr);
}

/**
 * Check if a specific date (YYYY-MM-DD) is considered a working day (is configured work day AND not a holiday)
 */
export function isDateWorkingDay(dateStr: string, settings: AppSettings, holidays: Holiday[]): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();

  if (!isWorkingDayIndex(dayOfWeek, settings)) {
    return false;
  }

  const isHoliday = getHolidayForDate(dateStr, holidays);
  return !isHoliday;
}

/**
 * Get all dates in a month (YYYY-MM)
 */
export function getDaysInMonth(year: number, monthIndex: number): string[] {
  // monthIndex is 0-based (0 = Jan, 11 = Dec)
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const dates: string[] = [];
  const monthStr = (monthIndex + 1).toString().padStart(2, '0');

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = d.toString().padStart(2, '0');
    dates.push(`${year}-${monthStr}-${dayStr}`);
  }
  return dates;
}

/**
 * Calculates monthly target working minutes and working day counts
 * Formula: (Number of normal working days in month - holidays falling on working days) * dailyTargetMinutes
 */
export function calculateMonthWorkingDays(
  year: number,
  monthIndex: number,
  settings: AppSettings,
  holidays: Holiday[]
): {
  totalCalendarDays: number;
  scheduledWorkDays: number;
  holidaysOnWorkDays: number;
  netWorkingDays: number;
  monthlyTargetMinutes: number;
  monthHolidays: Holiday[];
} {
  const dates = getDaysInMonth(year, monthIndex);
  let scheduledWorkDays = 0;
  let holidaysOnWorkDays = 0;
  const monthHolidays: Holiday[] = [];

  dates.forEach((dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    const isScheduled = isWorkingDayIndex(dayOfWeek, settings);
    const holiday = getHolidayForDate(dateStr, holidays);

    if (holiday) {
      monthHolidays.push(holiday);
    }

    if (isScheduled) {
      scheduledWorkDays++;
      if (holiday) {
        holidaysOnWorkDays++;
      }
    }
  });

  const netWorkingDays = scheduledWorkDays - holidaysOnWorkDays;
  const monthlyTargetMinutes = Math.max(0, netWorkingDays * settings.defaultDailyTargetMinutes);

  return {
    totalCalendarDays: dates.length,
    scheduledWorkDays,
    holidaysOnWorkDays,
    netWorkingDays,
    monthlyTargetMinutes,
    monthHolidays,
  };
}

/**
 * Returns Monday-to-Sunday date strings for the week containing a target date
 */
export function getWeekDates(targetDateStr: string): string[] {
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Get Monday as start of week (in JS, Sunday is 0, Monday is 1)
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(year, month - 1, day + diffToMonday);
  
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yStr = d.getFullYear();
    const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = d.getDate().toString().padStart(2, '0');
    weekDates.push(`${yStr}-${mStr}-${dayStr}`);
  }
  return weekDates;
}

/**
 * Calculates day summaries for an array of date strings
 */
export function getDaySummariesForDates(
  dates: string[],
  entries: BillingEntry[],
  settings: AppSettings,
  holidays: Holiday[]
): DaySummary[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return dates.map((dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeekIdx = date.getDay();
    const isScheduled = isWorkingDayIndex(dayOfWeekIdx, settings);
    const holiday = getHolidayForDate(dateStr, holidays);
    const isHoliday = !!holiday;
    const isWorkDay = isScheduled && !isHoliday;

    const dayEntries = entries.filter((e) => e.date === dateStr);
    const billable = dayEntries.reduce((sum, e) => sum + e.billableMinutes, 0);
    const nonBillable = dayEntries.reduce((sum, e) => sum + e.nonBillableMinutes, 0);
    const upskilling = dayEntries.reduce((sum, e) => sum + e.upskillingMinutes, 0);
    const leave = dayEntries.reduce((sum, e) => sum + e.leaveMinutes, 0);
    const totalWorking = billable + nonBillable + upskilling;
    const utilization = calculateUtilization(billable, totalWorking);

    const targetMinutes = isWorkDay ? settings.defaultDailyTargetMinutes : 0;

    return {
      date: dateStr,
      dayOfWeek: dayNames[dayOfWeekIdx],
      dayNumber: d,
      isWorkingDay: isWorkDay,
      isHoliday,
      holidayName: holiday?.name,
      targetMinutes,
      billableMinutes: billable,
      nonBillableMinutes: nonBillable,
      upskillingMinutes: upskilling,
      leaveMinutes: leave,
      totalWorkingMinutes: totalWorking,
      utilizationPercent: utilization,
      entriesCount: dayEntries.length,
    };
  });
}
