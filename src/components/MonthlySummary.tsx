import React, { useState, useMemo } from 'react';
import { AppSettings, BillingEntry, Holiday, Project } from '../types';
import {
  calculateUtilization,
  getProductivityBadgeProps,
  getProductivityRating,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import { calculateMonthWorkingDays } from '../utils/workingDays';
import {
  Award,
  BarChart2,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  GraduationCap,
  Layers,
  PieChart,
  Target,
  TrendingUp,
} from 'lucide-react';

interface MonthlySummaryProps {
  entries: BillingEntry[];
  settings: AppSettings;
  holidays: Holiday[];
  projects: Project[];
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  entries,
  settings,
  holidays,
  projects,
}) => {
  // Current selected month: year & monthIndex (0 = Jan, 11 = Dec)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonthIndex(today.getMonth());
  };

  // Month working day & holiday calculations
  const monthCalc = useMemo(() => {
    return calculateMonthWorkingDays(selectedYear, selectedMonthIndex, settings, holidays);
  }, [selectedYear, selectedMonthIndex, settings, holidays]);

  // Filter entries in this month: YYYY-MM
  const monthPrefix = `${selectedYear}-${(selectedMonthIndex + 1).toString().padStart(2, '0')}`;
  const monthEntries = useMemo(() => {
    return entries.filter((e) => e.date.startsWith(monthPrefix));
  }, [entries, monthPrefix]);

  // Aggregate monthly hours
  const monthlyBillableMinutes = monthEntries.reduce((sum, e) => sum + e.billableMinutes, 0);
  const monthlyNonBillableMinutes = monthEntries.reduce((sum, e) => sum + e.nonBillableMinutes, 0);
  const monthlyUpskillingMinutes = monthEntries.reduce((sum, e) => sum + e.upskillingMinutes, 0);
  const monthlyLeaveMinutes = monthEntries.reduce((sum, e) => sum + e.leaveMinutes, 0);

  const monthlyWorkingMinutes = monthlyBillableMinutes + monthlyNonBillableMinutes + monthlyUpskillingMinutes;
  const monthlyUtilization = calculateUtilization(monthlyBillableMinutes, monthlyWorkingMinutes);
  const productivityRating = getProductivityRating(monthlyUtilization);
  const badgeProps = getProductivityBadgeProps(productivityRating);

  // Leave days calculation: count unique dates where leaveMinutes > 0
  const leaveDaysCount = useMemo(() => {
    const datesWithLeave = new Set(monthEntries.filter((e) => e.leaveMinutes > 0).map((e) => e.date));
    return datesWithLeave.size;
  }, [monthEntries]);

  // Project distribution breakdown
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { project: Project | undefined; billable: number; nonBillable: number; upskilling: number; total: number }>();

    monthEntries.forEach((e) => {
      const proj = projects.find((p) => p.id === e.projectId);
      const existing = map.get(e.projectId) || {
        project: proj,
        billable: 0,
        nonBillable: 0,
        upskilling: 0,
        total: 0,
      };
      existing.billable += e.billableMinutes;
      existing.nonBillable += e.nonBillableMinutes;
      existing.upskilling += e.upskillingMinutes;
      existing.total += (e.billableMinutes + e.nonBillableMinutes + e.upskillingMinutes);
      map.set(e.projectId, existing);
    });

    return Array.from(map.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => b.billable - a.billable);
  }, [monthEntries, projects]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthTitle = `${monthNames[selectedMonthIndex]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* Month Navigator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Audit & Target Report
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {monthTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="prev-month-btn"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="current-month-btn"
            onClick={handleCurrentMonth}
            className="px-3.5 py-2 text-xs font-black tracking-tight rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            This Month
          </button>
          <button
            id="next-month-btn"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <select
            id="month-selector-dropdown"
            value={selectedMonthIndex}
            onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <select
            id="year-selector-dropdown"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-nums"
          >
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Calculation Explainer Banner */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Working Days & Target Formula for {monthTitle}:
          </span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {monthCalc.scheduledWorkDays} scheduled days - {monthCalc.holidaysOnWorkDays} holidays = {monthCalc.netWorkingDays} net working days
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 font-semibold">
          <div>
            <strong>Net Working Days:</strong> <span className="font-mono-nums font-black text-slate-900 dark:text-slate-100">{monthCalc.netWorkingDays}</span>
          </div>
          <span>•</span>
          <div>
            <strong>Daily Target:</strong> <span className="font-mono-nums font-bold">{minutesToHHMM(settings.defaultDailyTargetMinutes)} ({minutesToReadable(settings.defaultDailyTargetMinutes)})</span>
          </div>
          <span>•</span>
          <div>
            <strong>Monthly Target:</strong> <span className="font-mono-nums font-black text-blue-700 dark:text-blue-400">{minutesToHHMM(monthCalc.monthlyTargetMinutes)} ({minutesToReadable(monthCalc.monthlyTargetMinutes)})</span>
          </div>
          {monthCalc.monthHolidays.length > 0 && (
            <>
              <span>•</span>
              <div className="text-purple-700 dark:text-purple-300 font-bold">
                <strong>Holidays:</strong> {monthCalc.monthHolidays.map((h) => `${h.name} (${h.date})`).join(', ')}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Summary 8 Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {/* 1. Monthly Target Hours */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Target Hours
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {minutesToHHMM(monthCalc.monthlyTargetMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono-nums font-bold">
            {minutesToReadable(monthCalc.monthlyTargetMinutes)}
          </span>
        </div>

        {/* 2. Monthly Billable Hours */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            Billable Hours
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-blue-950 dark:text-blue-200 mt-1 tracking-tight">
            {minutesToHHMM(monthlyBillableMinutes)}
          </div>
          <span className="text-[11px] text-blue-500 block mt-1 font-mono-nums font-bold">
            {minutesToReadable(monthlyBillableMinutes)}
          </span>
        </div>

        {/* 3. Monthly Non-Billable Hours */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            Non-Billable
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-slate-800 dark:text-slate-200 mt-1 tracking-tight">
            {minutesToHHMM(monthlyNonBillableMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono-nums font-bold">
            {minutesToReadable(monthlyNonBillableMinutes)}
          </span>
        </div>

        {/* 4. Monthly Upskilling */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Upskilling
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-amber-950 dark:text-amber-200 mt-1 tracking-tight">
            {minutesToHHMM(monthlyUpskillingMinutes)}
          </div>
          <span className="text-[11px] text-amber-500 block mt-1 font-mono-nums font-bold">
            {minutesToReadable(monthlyUpskillingMinutes)}
          </span>
        </div>

        {/* 5. Monthly Leave */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Monthly Leave
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-slate-800 dark:text-slate-200 mt-1 tracking-tight">
            {minutesToHHMM(monthlyLeaveMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono-nums font-bold">
            {minutesToReadable(monthlyLeaveMinutes)}
          </span>
        </div>

        {/* 6. Working Days */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Working Days
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {monthCalc.netWorkingDays}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1 font-bold">
            Scheduled work days
          </span>
        </div>

        {/* 7. Leave Days & Holidays */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Leave & Holidays
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {leaveDaysCount} <span className="text-sm font-bold text-slate-500">leave / {monthCalc.monthHolidays.length} hol</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Total non-working logs
          </span>
        </div>

        {/* 8. Monthly Utilization */}
        <div className="p-4.5 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Monthly Utilization
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeProps.bgLight}`}>
              {badgeProps.label}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-nums text-white mt-1">
            {monthlyUtilization}%
          </div>
          <span className="text-[11px] text-blue-200 block mt-1 font-mono-nums">
            {minutesToReadable(monthlyBillableMinutes)} / {minutesToReadable(monthlyWorkingMinutes)}
          </span>
        </div>
      </div>

      {/* Project Allocation Breakdown */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Project-Wise Hours & Billing Allocation
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contribution of each engineering project in {monthTitle}
            </p>
          </div>
        </div>

        {projectBreakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No project hours recorded for {monthTitle}.
          </div>
        ) : (
          <div className="space-y-4">
            {projectBreakdown.map((item) => {
              const projName = item.project?.name || 'Unknown Project';
              const projColor = item.project?.color || '#0284c7';
              const sharePercent = monthlyWorkingMinutes > 0 ? Number(((item.total / monthlyWorkingMinutes) * 100).toFixed(1)) : 0;
              const projUtil = calculateUtilization(item.billable, item.total);

              return (
                <div key={item.project?.id || projName} className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: projColor }} />
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {projName}
                      </span>
                      {item.project?.code && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{item.project.code}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono-nums text-slate-600 dark:text-slate-300">
                      <span><strong>Billable:</strong> {minutesToHHMM(item.billable)}</span>
                      <span>•</span>
                      <span><strong>Total:</strong> {minutesToHHMM(item.total)} ({sharePercent}% of month)</span>
                      <span>•</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{projUtil}% util</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${sharePercent}%`,
                        backgroundColor: projColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
