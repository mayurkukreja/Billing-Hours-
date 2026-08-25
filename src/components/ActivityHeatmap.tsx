import React, { useState, useMemo } from 'react';
import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import {
  calculateUtilization,
  formatDateDisplay,
  minutesToDecimal,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Layers,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
} from 'lucide-react';

interface ActivityHeatmapProps {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
  activeEmployeeFilter: string;
  onOpenDailyEntryModal?: (prefillDate?: string) => void;
  onEditEntry?: (entry: BillingEntry) => void;
  onExportExcel: () => void;
  onOpenImportModal: () => void;
  onClearDefaultData: () => void;
}

type HeatmapMetric = 'billable' | 'totalWorking' | 'utilization';

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  entries,
  employees,
  projects,
  holidays,
  settings,
  activeEmployeeFilter,
  onOpenDailyEntryModal,
  onEditEntry,
  onExportExcel,
  onOpenImportModal,
  onClearDefaultData,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>('billable');
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('weeks');
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    dayName: string;
    billable: number;
    nonBillable: number;
    upskilling: number;
    leave: number;
    totalWorking: number;
    utilization: number;
    entries: BillingEntry[];
    isHoliday: boolean;
    holidayName?: string;
  } | null>(null);

  // Filter entries for the selected year and employee context
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.date.startsWith(`${selectedYear}-`)) return false;
      if (activeEmployeeFilter !== 'all' && e.employeeId !== activeEmployeeFilter) return false;
      return true;
    });
  }, [entries, selectedYear, activeEmployeeFilter]);

  // Aggregate day map for fast lookup
  const dayDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        billable: number;
        nonBillable: number;
        upskilling: number;
        leave: number;
        totalWorking: number;
        entries: BillingEntry[];
      }
    >();

    filteredEntries.forEach((e) => {
      const existing = map.get(e.date) || {
        billable: 0,
        nonBillable: 0,
        upskilling: 0,
        leave: 0,
        totalWorking: 0,
        entries: [],
      };

      existing.billable += e.billableMinutes;
      existing.nonBillable += e.nonBillableMinutes;
      existing.upskilling += e.upskillingMinutes;
      existing.leave += e.leaveMinutes;
      existing.totalWorking += e.billableMinutes + e.nonBillableMinutes + e.upskillingMinutes;
      existing.entries.push(e);

      map.set(e.date, existing);
    });

    return map;
  }, [filteredEntries]);

  // Holiday Map
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach((h) => map.set(h.date, h.name));
    return map;
  }, [holidays]);

  // Analytics Stats: Streaks, Active days, Overtime days, Averages
  const stats = useMemo(() => {
    let activeDays = 0;
    let overtimeDays = 0;
    let targetMetDays = 0;
    let totalBillableMin = 0;
    let totalWorkingMin = 0;

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Check all days of the year sequentially
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const todayStr = new Date().toISOString().split('T')[0];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const y = cur.getFullYear();
      const m = (cur.getMonth() + 1).toString().padStart(2, '0');
      const d = cur.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const data = dayDataMap.get(dateStr);
      const isWorkingDay = cur.getDay() !== 0 && cur.getDay() !== 6;

      if (data && data.totalWorking > 0) {
        activeDays++;
        totalBillableMin += data.billable;
        totalWorkingMin += data.totalWorking;

        if (data.totalWorking >= settings.defaultDailyTargetMinutes) {
          targetMetDays++;
        }
        if (data.totalWorking > 540) {
          // >9h
          overtimeDays++;
        }

        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        // If not a weekend, reset streak
        if (isWorkingDay && dateStr <= todayStr) {
          tempStreak = 0;
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    currentStreak = tempStreak;
    const avgDailyHours = activeDays > 0 ? (totalWorkingMin / 60 / activeDays).toFixed(1) : '0.0';
    const overallUtil = calculateUtilization(totalBillableMin, totalWorkingMin);

    return {
      activeDays,
      overtimeDays,
      targetMetDays,
      totalBillableMin,
      totalWorkingMin,
      avgDailyHours,
      overallUtil,
      maxStreak,
      currentStreak,
    };
  }, [selectedYear, dayDataMap, settings.defaultDailyTargetMinutes]);

  // Color Intensity Function
  const getCellColor = (dateStr: string) => {
    const data = dayDataMap.get(dateStr);
    const isHoliday = holidayMap.has(dateStr);

    if (!data || data.totalWorking === 0) {
      if (isHoliday) {
        return 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800/80';
      }
      return 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800';
    }

    let metricValue = 0;
    if (activeMetric === 'billable') {
      metricValue = data.billable / 60; // hours
    } else if (activeMetric === 'totalWorking') {
      metricValue = data.totalWorking / 60; // hours
    } else {
      metricValue = calculateUtilization(data.billable, data.totalWorking); // %
    }

    if (activeMetric === 'utilization') {
      if (metricValue >= 85) return 'bg-emerald-600 dark:bg-emerald-500 text-white';
      if (metricValue >= 70) return 'bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white';
      if (metricValue >= 50) return 'bg-emerald-200 dark:bg-emerald-800 text-slate-800 dark:text-slate-100';
      return 'bg-rose-300 dark:bg-rose-900/60 text-rose-950 dark:text-rose-200';
    }

    // Hours Scale (0h, 1-4h, 4-7h, 7-9h, >9h)
    if (metricValue > 9) {
      // Overtime
      return 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs';
    }
    if (metricValue >= 7.5) {
      // Target Met (~8-9h)
      return 'bg-blue-600 dark:bg-blue-500 text-white';
    }
    if (metricValue >= 4) {
      // Moderate (4-7.5h)
      return 'bg-blue-400 dark:bg-blue-600 text-slate-900 dark:text-white';
    }
    if (metricValue > 0) {
      // Low (1-4h)
      return 'bg-blue-200 dark:bg-blue-900/80 text-slate-800 dark:text-blue-200';
    }

    return 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800';
  };

  // Generate 52-Week Grid for Year View
  const weeksGrid = useMemo(() => {
    const weeks: { dateStr: string; dayOfWeek: number; month: number; day: number }[][] = [];
    const firstDayOfYear = new Date(selectedYear, 0, 1);
    // Find the Monday preceding or equal to Jan 1
    const dayOfWeek = firstDayOfYear.getDay(); // 0 = Sun, 1 = Mon ...
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since last Monday
    const startCalendar = new Date(firstDayOfYear);
    startCalendar.setDate(startCalendar.getDate() - offset);

    let current = new Date(startCalendar);
    let currentWeek: { dateStr: string; dayOfWeek: number; month: number; day: number }[] = [];

    for (let i = 0; i < 53 * 7; i++) {
      const y = current.getFullYear();
      const m = current.getMonth();
      const d = current.getDate();
      const dStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

      currentWeek.push({
        dateStr: dStr,
        dayOfWeek: current.getDay(),
        month: m,
        day: d,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    return weeks;
  }, [selectedYear]);

  // Month Labels for Week Grid
  const monthLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Activity Heatmap & Annual Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Intensity tracking for billing hours, daily work patterns, and consultant output
              </p>
            </div>
          </div>
        </div>

        {/* Year Navigator & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-black font-mono-nums text-slate-900 dark:text-slate-100">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Import Excel / CSV Button */}
          <button
            id="heatmap-import-excel-btn"
            type="button"
            onClick={onOpenImportModal}
            className="px-3.5 py-2 text-xs font-black tracking-tight text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors flex items-center gap-1.5"
            title="Import Excel or CSV timesheet file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Download Excel Button */}
          <button
            id="heatmap-download-excel-btn"
            type="button"
            onClick={onExportExcel}
            className="px-3.5 py-2 text-xs font-black tracking-tight text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            title="Download multi-sheet Excel (.xlsx) workbook with full heatmap matrix"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download Excel with Heatmap</span>
          </button>

          {/* Clear Default Details Button */}
          <button
            id="heatmap-clear-default-btn"
            type="button"
            onClick={onClearDefaultData}
            className="px-3 py-2 text-xs font-bold tracking-tight text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/80 rounded-xl transition-colors flex items-center gap-1"
            title="Clear all default dummy records and start fresh"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Default Details</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Days */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Active Days
          </span>
          <div className="text-xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.activeDays} <span className="text-xs font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logged in {selectedYear}</div>
        </div>

        {/* Total Billed Hours */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
            Total Billed
          </span>
          <div className="text-xl font-black font-mono-nums text-blue-700 dark:text-blue-400 mt-1">
            {minutesToHHMM(stats.totalBillableMin)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {minutesToDecimal(stats.totalBillableMin)} decimal hrs
          </div>
        </div>

        {/* Target Met Days */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            9h Target Met
          </span>
          <div className="text-xl font-black font-mono-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {stats.targetMetDays}{' '}
            <span className="text-xs font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">≥ 9.0 hours logged</div>
        </div>

        {/* Overtime Days */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
            Overtime Days
          </span>
          <div className="text-xl font-black font-mono-nums text-indigo-700 dark:text-indigo-400 mt-1">
            {stats.overtimeDays} <span className="text-xs font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">&gt; 9.0h intense effort</div>
        </div>

        {/* Longest Streak */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Best Streak
          </span>
          <div className="text-xl font-black font-mono-nums text-amber-700 dark:text-amber-400 mt-1">
            {stats.maxStreak} <span className="text-xs font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Consecutive active days</div>
        </div>

        {/* Avg Daily Hours */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Daily Average
          </span>
          <div className="text-xl font-black font-mono-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.avgDailyHours}{' '}
            <span className="text-xs font-semibold text-slate-400">hrs/day</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{stats.overallUtil}% utilization</div>
        </div>
      </div>

      {/* Main Heatmap Canvas Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
        {/* Metric Selector & Legend Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Color Intensity:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveMetric('billable')}
                className={`px-3 py-1 rounded-md font-bold transition-colors ${
                  activeMetric === 'billable'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Billable Hours
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('totalWorking')}
                className={`px-3 py-1 rounded-md font-bold transition-colors ${
                  activeMetric === 'totalWorking'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Total Working Hours
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('utilization')}
                className={`px-3 py-1 rounded-md font-bold transition-colors ${
                  activeMetric === 'utilization'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Utilization %
              </button>
            </div>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div
                className="w-3.5 h-3.5 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                title="0h (No Activity)"
              />
              <div
                className="w-3.5 h-3.5 rounded-xs bg-blue-200 dark:bg-blue-900/80"
                title="1-4 Hours (Low)"
              />
              <div
                className="w-3.5 h-3.5 rounded-xs bg-blue-400 dark:bg-blue-600"
                title="4-7.5 Hours (Moderate)"
              />
              <div
                className="w-3.5 h-3.5 rounded-xs bg-blue-600 dark:bg-blue-500"
                title="7.5-9 Hours (Standard Target)"
              />
              <div
                className="w-3.5 h-3.5 rounded-xs bg-indigo-600 dark:bg-indigo-500"
                title=">9 Hours (Overtime)"
              />
            </div>
            <span>More</span>
          </div>
        </div>

        {/* 52-Week Grid (GitHub Style Matrix) */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[820px]">
            {/* Months Header Bar */}
            <div className="flex pl-8 mb-1.5 text-[11px] font-bold font-mono text-slate-400">
              {monthLabels.map((m) => (
                <div key={m} className="flex-1 text-left">
                  {m}
                </div>
              ))}
            </div>

            {/* Grid with 7 Day Rows (Mon -> Sun) */}
            <div className="flex">
              {/* Day of Week Labels */}
              <div className="flex flex-col justify-between pr-2 text-[10px] font-bold text-slate-400 h-[105px]">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>

              {/* 53 Columns of 7 Days */}
              <div className="flex gap-[3.5px]">
                {weeksGrid.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3.5px]">
                    {/* Monday to Sunday (indices 1,2,3,4,5,6,0) */}
                    {[1, 2, 3, 4, 5, 6, 0].map((dayTarget) => {
                      const dayObj = week.find((d) => d.dayOfWeek === dayTarget);
                      if (!dayObj) return <div key={dayTarget} className="w-3.5 h-3.5" />;

                      const isCurrentYear = dayObj.dateStr.startsWith(`${selectedYear}-`);
                      if (!isCurrentYear) {
                        return (
                          <div
                            key={dayObj.dateStr}
                            className="w-3.5 h-3.5 rounded-xs bg-transparent"
                          />
                        );
                      }

                      const dayData = dayDataMap.get(dayObj.dateStr);
                      const isHoliday = holidayMap.has(dayObj.dateStr);
                      const holidayName = holidayMap.get(dayObj.dateStr);
                      const cellClass = getCellColor(dayObj.dateStr);

                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayName = dayNames[dayObj.dayOfWeek];

                      return (
                        <button
                          key={dayObj.dateStr}
                          type="button"
                          onClick={() => {
                            if (dayData && dayData.entries.length > 0 && onEditEntry) {
                              onEditEntry(dayData.entries[0]);
                            } else if (onOpenDailyEntryModal) {
                              onOpenDailyEntryModal(dayObj.dateStr);
                            }
                          }}
                          onMouseEnter={() => {
                            setHoveredDay({
                              date: dayObj.dateStr,
                              dayName,
                              billable: dayData?.billable || 0,
                              nonBillable: dayData?.nonBillable || 0,
                              upskilling: dayData?.upskilling || 0,
                              leave: dayData?.leave || 0,
                              totalWorking: dayData?.totalWorking || 0,
                              utilization: dayData
                                ? calculateUtilization(dayData.billable, dayData.totalWorking)
                                : 0,
                              entries: dayData?.entries || [],
                              isHoliday,
                              holidayName,
                            });
                          }}
                          className={`w-3.5 h-3.5 rounded-xs border transition-transform hover:scale-130 hover:z-20 cursor-pointer ${cellClass}`}
                          title={`${dayObj.dateStr}: ${
                            dayData ? minutesToReadable(dayData.billable) : '0h'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hovered Day Details Interactive Card */}
        {hoveredDay && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {hoveredDay.dayName}, {formatDateDisplay(hoveredDay.date)}
                </span>
                {hoveredDay.isHoliday && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    Holiday: {hoveredDay.holidayName}
                  </span>
                )}
                {hoveredDay.totalWorking > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {hoveredDay.utilization}% Utilization
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  Billable:{' '}
                  <strong className="font-mono-nums font-bold text-blue-600 dark:text-blue-400">
                    {minutesToHHMM(hoveredDay.billable)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Non-Billable:{' '}
                  <strong className="font-mono-nums font-bold">
                    {minutesToHHMM(hoveredDay.nonBillable)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Upskilling:{' '}
                  <strong className="font-mono-nums font-bold text-amber-600 dark:text-amber-400">
                    {minutesToHHMM(hoveredDay.upskilling)}
                  </strong>
                </span>
                {hoveredDay.leave > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      Leave:{' '}
                      <strong className="font-mono-nums font-bold text-rose-600 dark:text-rose-400">
                        {minutesToHHMM(hoveredDay.leave)}
                      </strong>
                    </span>
                  </>
                )}
                <span>•</span>
                <span>
                  Total Working:{' '}
                  <strong className="font-mono-nums font-black text-slate-900 dark:text-slate-100">
                    {minutesToHHMM(hoveredDay.totalWorking)}
                  </strong>
                </span>
              </div>

              {hoveredDay.entries.length > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Tasks:{' '}
                  {hoveredDay.entries
                    .map((e) => `[${e.projectName}] ${e.remarks || 'Work'}`)
                    .join('; ')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (hoveredDay.entries.length > 0 && onEditEntry) {
                    onEditEntry(hoveredDay.entries[0]);
                  } else if (onOpenDailyEntryModal) {
                    onOpenDailyEntryModal(hoveredDay.date);
                  }
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {hoveredDay.entries.length > 0 ? 'Edit Entry' : 'Log Hours for this Day'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 12-Month Matrix Bento Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>12-Month Breakdown Matrix ({selectedYear})</span>
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            Click any cell to log or modify
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monthLabels.map((mName, mIdx) => {
            const mNum = mIdx + 1;
            const daysInMonth = new Date(selectedYear, mNum, 0).getDate();
            const firstDayIndex = new Date(selectedYear, mIdx, 1).getDay(); // 0 = Sun, 1 = Mon ...
            const dayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0

            let mBillableMin = 0;
            let mWorkingMin = 0;
            let mActiveDays = 0;

            for (let d = 1; d <= daysInMonth; d++) {
              const dStr = `${selectedYear}-${mNum.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
              const dData = dayDataMap.get(dStr);
              if (dData && dData.totalWorking > 0) {
                mBillableMin += dData.billable;
                mWorkingMin += dData.totalWorking;
                mActiveDays++;
              }
            }

            const mUtil = calculateUtilization(mBillableMin, mWorkingMin);

            return (
              <div
                key={mName}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                    {mName}
                  </span>
                  <div className="text-right">
                    <span className="font-mono-nums font-bold text-xs text-blue-600 dark:text-blue-400">
                      {minutesToHHMM(mBillableMin)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{mUtil}% util</span>
                  </div>
                </div>

                {/* Mini Calendar Grid (Mon - Sun) */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayInitial, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-bold text-slate-400 uppercase py-0.5"
                    >
                      {dayInitial}
                    </span>
                  ))}

                  {/* Prepend empty cells for day offset */}
                  {Array.from({ length: dayOffset }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-full aspect-square" />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                    const day = dIdx + 1;
                    const dateStr = `${selectedYear}-${mNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const dData = dayDataMap.get(dateStr);
                    const cellColor = getCellColor(dateStr);

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          if (dData && dData.entries.length > 0 && onEditEntry) {
                            onEditEntry(dData.entries[0]);
                          } else if (onOpenDailyEntryModal) {
                            onOpenDailyEntryModal(dateStr);
                          }
                        }}
                        className={`w-full aspect-square rounded-md text-[10px] font-mono-nums font-bold flex items-center justify-center border transition-transform hover:scale-115 ${cellColor}`}
                        title={`${dateStr}: ${dData ? minutesToReadable(dData.billable) : '0h'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
