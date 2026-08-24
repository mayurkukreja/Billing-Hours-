import React, { useState } from 'react';
import { AppSettings, BillingEntry, Holiday, Project } from '../types';
import {
  calculateUtilization,
  formatDateDisplay,
  formatDateWithDay,
  getProductivityBadgeProps,
  getProductivityRating,
  getTodayDateString,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import {
  getDaySummariesForDates,
  getHolidayForDate,
  getWeekDates,
  isDateWorkingDay,
  isWorkingDayIndex,
} from '../utils/workingDays';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

interface WeeklySummaryProps {
  entries: BillingEntry[];
  settings: AppSettings;
  holidays: Holiday[];
  projects: Project[];
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  entries,
  settings,
  holidays,
  projects,
}) => {
  const [currentWeekDate, setCurrentWeekDate] = useState(getTodayDateString());

  // Get 7 days for the current week (Monday to Sunday)
  const weekDates = getWeekDates(currentWeekDate);
  const daySummaries = getDaySummariesForDates(weekDates, entries, settings, holidays);

  // Navigate weeks
  const handlePrevWeek = () => {
    const [y, m, d] = currentWeekDate.split('-').map(Number);
    const date = new Date(y, m - 1, d - 7);
    const yStr = date.getFullYear();
    const mStr = (date.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = date.getDate().toString().padStart(2, '0');
    setCurrentWeekDate(`${yStr}-${mStr}-${dayStr}`);
  };

  const handleNextWeek = () => {
    const [y, m, d] = currentWeekDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + 7);
    const yStr = date.getFullYear();
    const mStr = (date.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = date.getDate().toString().padStart(2, '0');
    setCurrentWeekDate(`${yStr}-${mStr}-${dayStr}`);
  };

  const handleTodayWeek = () => {
    setCurrentWeekDate(getTodayDateString());
  };

  // Weekly Aggregates
  const totalTargetMinutes = daySummaries.reduce((sum, d) => sum + d.targetMinutes, 0);
  const totalBillableMinutes = daySummaries.reduce((sum, d) => sum + d.billableMinutes, 0);
  const totalNonBillableMinutes = daySummaries.reduce((sum, d) => sum + d.nonBillableMinutes, 0);
  const totalUpskillingMinutes = daySummaries.reduce((sum, d) => sum + d.upskillingMinutes, 0);
  const totalLeaveMinutes = daySummaries.reduce((sum, d) => sum + d.leaveMinutes, 0);

  const totalWorkingMinutes = totalBillableMinutes + totalNonBillableMinutes + totalUpskillingMinutes;
  const weeklyUtilization = calculateUtilization(totalBillableMinutes, totalWorkingMinutes);
  const productivityRating = getProductivityRating(weeklyUtilization);
  const badgeProps = getProductivityBadgeProps(productivityRating);

  // Working days count in this week
  const workingDaysInWeek = daySummaries.filter((d) => d.isWorkingDay).length;
  // Average daily working hours (calculated over working days, or active days)
  const averageDailyMinutes = workingDaysInWeek > 0 ? Math.round(totalWorkingMinutes / workingDaysInWeek) : 0;

  // Max minutes in a single day for proportional chart height scaling (minimum 9 hours / 540 min)
  const maxDayMinutes = Math.max(
    540,
    ...daySummaries.map((d) => d.billableMinutes + d.nonBillableMinutes + d.upskillingMinutes + d.leaveMinutes)
  );

  const startDateStr = formatDateDisplay(weekDates[0]);
  const endDateStr = formatDateDisplay(weekDates[6]);

  return (
    <div className="space-y-6">
      {/* Week Navigator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Weekly Analysis Window
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono-nums tracking-tight">
              {startDateStr} — {endDateStr}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="prev-week-btn"
            onClick={handlePrevWeek}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="current-week-btn"
            onClick={handleTodayWeek}
            className="px-3.5 py-2 text-xs font-black tracking-tight rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Current Week
          </button>
          <button
            id="next-week-btn"
            onClick={handleNextWeek}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            id="week-date-picker"
            type="date"
            value={currentWeekDate}
            onChange={(e) => e.target.value && setCurrentWeekDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-nums font-bold"
          />
        </div>
      </div>

      {/* Weekly KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Target */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
            Target Hours
          </span>
          <div className="text-2xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {minutesToHHMM(totalTargetMinutes)}
          </div>
          <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
            {workingDaysInWeek} work days
          </span>
        </div>

        {/* Billable */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl shadow-2xs">
          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            Billable
          </span>
          <div className="text-2xl font-black font-mono-nums text-blue-950 dark:text-blue-200 mt-1 tracking-tight">
            {minutesToHHMM(totalBillableMinutes)}
          </div>
          <span className="text-[11px] font-bold text-blue-500 block mt-0.5 font-mono-nums">
            {minutesToReadable(totalBillableMinutes)}
          </span>
        </div>

        {/* Non-Billable */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            Non-Billable
          </span>
          <div className="text-2xl font-black font-mono-nums text-slate-800 dark:text-slate-200 mt-1 tracking-tight">
            {minutesToHHMM(totalNonBillableMinutes)}
          </div>
          <span className="text-[11px] font-bold text-slate-400 block mt-0.5 font-mono-nums">
            {minutesToReadable(totalNonBillableMinutes)}
          </span>
        </div>

        {/* Upskilling */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-xl shadow-2xs">
          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Upskilling
          </span>
          <div className="text-2xl font-black font-mono-nums text-amber-950 dark:text-amber-200 mt-1 tracking-tight">
            {minutesToHHMM(totalUpskillingMinutes)}
          </div>
          <span className="text-[11px] font-bold text-amber-500 block mt-0.5 font-mono-nums">
            {minutesToReadable(totalUpskillingMinutes)}
          </span>
        </div>

        {/* Total Leave */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
            Total Leave
          </span>
          <div className="text-2xl font-black font-mono-nums text-slate-800 dark:text-slate-200 mt-1 tracking-tight">
            {minutesToHHMM(totalLeaveMinutes)}
          </div>
          <span className="text-[11px] font-bold text-slate-400 block mt-0.5 font-mono-nums">
            {minutesToReadable(totalLeaveMinutes)}
          </span>
        </div>

        {/* Weekly Utilization */}
        <div className="p-4 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl shadow-xs border border-blue-800">
          <span className="text-[11px] font-black text-blue-200 uppercase tracking-wider block">
            Weekly Util %
          </span>
          <div className="text-2xl font-black font-mono-nums text-white mt-1 tracking-tight">
            {weeklyUtilization}%
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-black text-blue-200 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dot}`} />
            {badgeProps.label}
          </div>
        </div>

        {/* Average Daily Hours */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Avg Daily Hours
          </span>
          <div className="text-2xl font-extrabold font-mono-nums text-slate-900 dark:text-slate-100 mt-1">
            {minutesToHHMM(averageDailyMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono-nums">
            per working day
          </span>
        </div>
      </div>

      {/* Visual Chart: Day-by-Day Hours Comparison Bar Chart */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Day-by-Day Working & Billing Breakdown
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual stacked comparison of billable, non-billable, and upskilling hours
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Billable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-400 dark:bg-slate-600 inline-block" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Non-Billable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Upskilling</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-400 inline-block" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-red-500 inline-block" />
              <span className="text-slate-500">Target (9h)</span>
            </div>
          </div>
        </div>

        {/* CSS/HTML Bar Chart Canvas */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 h-64 items-end relative">
            {/* Target line (e.g. 540 min = 9h) */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-red-400/50 pointer-events-none z-10"
              style={{ bottom: `${(540 / maxDayMinutes) * 100}%` }}
            >
              <span className="absolute right-0 -top-4 text-[10px] font-mono text-red-500 font-bold bg-white dark:bg-slate-900 px-1 rounded-xs">
                Target 09:00
              </span>
            </div>

            {daySummaries.map((day) => {
              const totalDayMinutes = day.billableMinutes + day.nonBillableMinutes + day.upskillingMinutes + day.leaveMinutes;
              const heightPercent = maxDayMinutes > 0 ? (totalDayMinutes / maxDayMinutes) * 100 : 0;
              const isTargetMet = day.totalWorkingMinutes >= (day.targetMinutes || 540);

              const billableRatio = totalDayMinutes > 0 ? (day.billableMinutes / totalDayMinutes) * 100 : 0;
              const nonBillRatio = totalDayMinutes > 0 ? (day.nonBillableMinutes / totalDayMinutes) * 100 : 0;
              const upskillRatio = totalDayMinutes > 0 ? (day.upskillingMinutes / totalDayMinutes) * 100 : 0;
              const leaveRatio = totalDayMinutes > 0 ? (day.leaveMinutes / totalDayMinutes) * 100 : 0;

              return (
                <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                  {/* Total on top of bar */}
                  <div className="text-[11px] font-mono-nums font-bold text-slate-700 dark:text-slate-300 mb-1 opacity-80 group-hover:opacity-100">
                    {totalDayMinutes > 0 ? minutesToHHMM(totalDayMinutes) : '0:00'}
                  </div>

                  {/* Bar Column Container */}
                  <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800/80 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-200 h-full border border-slate-200/60 dark:border-slate-700/60">
                    <div
                      className="w-full flex flex-col justify-end transition-all duration-300 rounded-t-lg overflow-hidden"
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                    >
                      {/* Leave (top) */}
                      {day.leaveMinutes > 0 && (
                        <div
                          className="w-full bg-rose-400 transition-all hover:brightness-110"
                          style={{ height: `${leaveRatio}%` }}
                          title={`Leave: ${minutesToReadable(day.leaveMinutes)}`}
                        />
                      )}
                      {/* Upskilling */}
                      {day.upskillingMinutes > 0 && (
                        <div
                          className="w-full bg-amber-500 transition-all hover:brightness-110"
                          style={{ height: `${upskillRatio}%` }}
                          title={`Upskilling: ${minutesToReadable(day.upskillingMinutes)}`}
                        />
                      )}
                      {/* Non-Billable */}
                      {day.nonBillableMinutes > 0 && (
                        <div
                          className="w-full bg-slate-400 dark:bg-slate-600 transition-all hover:brightness-110"
                          style={{ height: `${nonBillRatio}%` }}
                          title={`Non-Billable: ${minutesToReadable(day.nonBillableMinutes)}`}
                        />
                      )}
                      {/* Billable (bottom) */}
                      {day.billableMinutes > 0 && (
                        <div
                          className="w-full bg-blue-600 transition-all hover:brightness-110"
                          style={{ height: `${billableRatio}%` }}
                          title={`Billable: ${minutesToReadable(day.billableMinutes)}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Day Labels below */}
                  <div className="mt-2 text-center">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {day.dayOfWeek}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-nums">
                      {day.dayNumber}
                    </div>
                    {day.isHoliday && (
                      <span className="inline-block mt-0.5 px-1 py-0.2 rounded-xs text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        Holiday
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Week Day-by-Day Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Daily Detail & Utilization for Week
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4">Day / Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Target</th>
                <th className="py-3 px-3 text-right">Billable</th>
                <th className="py-3 px-3 text-right">Non-Bill</th>
                <th className="py-3 px-3 text-right">Upskill</th>
                <th className="py-3 px-3 text-right">Leave</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                  Total Working
                </th>
                <th className="py-3 px-4 text-center">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {daySummaries.map((day) => {
                const rating = getProductivityRating(day.utilizationPercent);
                const badge = getProductivityBadgeProps(rating);

                return (
                  <tr
                    key={day.date}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {formatDateWithDay(day.date)}
                    </td>
                    <td className="py-3 px-3">
                      {day.isHoliday ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {day.holidayName || 'Holiday'}
                        </span>
                      ) : day.leaveMinutes >= day.targetMinutes && day.leaveMinutes > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          Full Day Leave
                        </span>
                      ) : day.isWorkingDay ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          Working Day
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800">
                          Weekend
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums text-slate-500">
                      {minutesToHHMM(day.targetMinutes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums font-bold text-blue-600 dark:text-blue-400">
                      {minutesToHHMM(day.billableMinutes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums text-slate-600 dark:text-slate-400">
                      {minutesToHHMM(day.nonBillableMinutes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums text-amber-600 dark:text-amber-400">
                      {minutesToHHMM(day.upskillingMinutes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums text-rose-600 dark:text-rose-400">
                      {minutesToHHMM(day.leaveMinutes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-nums font-extrabold text-slate-900 dark:text-slate-100">
                      {minutesToHHMM(day.totalWorkingMinutes)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-nums border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{day.utilizationPercent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
