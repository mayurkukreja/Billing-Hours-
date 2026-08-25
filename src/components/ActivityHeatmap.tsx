import React, { useState, useMemo, useEffect } from 'react';
import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import {
  calculateUtilization,
  formatDateDisplay,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Flame,
  Layers,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

interface ActivityHeatmapProps {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
  activeEmployeeFilter?: string;
  focusedDate?: string | null;
  onSelectDate?: (date: string) => void;
  onNavigateToEntries?: (date: string) => void;
  onOpenDailyEntryModal?: (prefillDate?: string) => void;
  onEditEntry?: (entry: BillingEntry) => void;
  onDeleteEntry?: (entry: BillingEntry) => void;
  onDuplicateEntry?: (entry: BillingEntry) => void;
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
  activeEmployeeFilter = 'all',
  focusedDate,
  onSelectDate,
  onNavigateToEntries,
  onOpenDailyEntryModal,
  onEditEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onExportExcel,
  onOpenImportModal,
  onClearDefaultData,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>('billable');
  const [selectedDate, setSelectedDate] = useState<string>(focusedDate || todayStr);

  // Sync if focusedDate prop changes
  useEffect(() => {
    if (focusedDate) {
      setSelectedDate(focusedDate);
      const year = parseInt(focusedDate.split('-')[0], 10);
      if (!isNaN(year) && year !== selectedYear) {
        setSelectedYear(year);
      }
    }
  }, [focusedDate]);

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

  // Selected Day specific data
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const isHoliday = holidayMap.has(selectedDate);
    const holidayName = holidayMap.get(selectedDate);

    // Get matching entries across entire entries list for active employee filter
    const matchingEntries = entries.filter((e) => {
      if (e.date !== selectedDate) return false;
      if (activeEmployeeFilter !== 'all' && e.employeeId !== activeEmployeeFilter) return false;
      return true;
    });

    const billable = matchingEntries.reduce((acc, curr) => acc + curr.billableMinutes, 0);
    const nonBillable = matchingEntries.reduce((acc, curr) => acc + curr.nonBillableMinutes, 0);
    const upskilling = matchingEntries.reduce((acc, curr) => acc + curr.upskillingMinutes, 0);
    const leave = matchingEntries.reduce((acc, curr) => acc + curr.leaveMinutes, 0);
    const totalWorking = billable + nonBillable + upskilling;
    const utilization = calculateUtilization(billable, totalWorking);

    const d = new Date(selectedDate + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = isNaN(d.getTime()) ? '' : dayNames[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    return {
      date: selectedDate,
      dayOfWeek,
      isWeekend,
      isHoliday,
      holidayName,
      billable,
      nonBillable,
      upskilling,
      leave,
      totalWorking,
      utilization,
      entries: matchingEntries,
    };
  }, [selectedDate, holidayMap, entries, activeEmployeeFilter]);

  // Handle date change helper
  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (onSelectDate) onSelectDate(dateStr);
  };

  const handleStepDay = (step: number) => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + step);
    const newY = dateObj.getFullYear();
    const newM = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const newD = dateObj.getDate().toString().padStart(2, '0');
    const newDateStr = `${newY}-${newM}-${newD}`;
    handleSelectDay(newDateStr);
    if (newY !== selectedYear) {
      setSelectedYear(newY);
    }
  };

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
    const today = new Date().toISOString().split('T')[0];

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
        if (isWorkingDay && dateStr <= today) {
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

    // Hours Scale (0h, 1-4h, 4-7.5h, 7.5-9h, >9h)
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
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Annual Activity Heatmap & Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Click any day cell to view, log, edit, or manage connected daily entries in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector & Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Previous year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono-nums font-black text-sm text-slate-800 dark:text-slate-200">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Next year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onExportExcel}
            className="px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download full multi-sheet Excel report with Heatmap Matrix"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Import timesheet data"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={onClearDefaultData}
            className="px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Clear all demo data"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Clear Demo Data</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Workdays
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-slate-900 dark:text-slate-100">
              {stats.activeDays}
            </span>
            <span className="text-xs text-slate-400 font-semibold">days</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Annual Billable
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-blue-600 dark:text-blue-400">
              {minutesToHHMM(stats.totalBillableMin)}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Annual Utilization
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-emerald-600 dark:text-emerald-400">
              {stats.overallUtil}%
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Daily Average
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-slate-900 dark:text-slate-100">
              {stats.avgDailyHours}h
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ day</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Met Days
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-indigo-600 dark:text-indigo-400">
              {stats.targetMetDays}
            </span>
            <span className="text-xs text-slate-400 font-semibold">days</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Max Log Streak
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono-nums text-amber-600 dark:text-amber-400">
              {stats.maxStreak}
            </span>
            <span className="text-xs text-slate-400 font-semibold">consecutive</span>
          </div>
        </div>
      </div>

      {/* 52-Week Main Heatmap Grid */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        {/* Metric Selector & Legend Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Color Intensity:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveMetric('billable')}
                className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
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
                className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
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
                className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
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
                      const isSelected = selectedDate === dayObj.dateStr;
                      const hasEntries = !!(dayData && dayData.entries.length > 0);

                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayName = dayNames[dayObj.dayOfWeek];

                      return (
                        <button
                          key={dayObj.dateStr}
                          type="button"
                          onClick={() => handleSelectDay(dayObj.dateStr)}
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
                          className={`w-3.5 h-3.5 rounded-xs border transition-all cursor-pointer relative ${cellClass} ${
                            isSelected
                              ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900 scale-125 z-10 shadow-md font-bold'
                              : 'hover:scale-130 hover:z-20'
                          }`}
                          title={`${dayObj.dateStr}: ${
                            dayData ? minutesToReadable(dayData.billable) : '0h'
                          } (${dayData?.entries.length || 0} entries)`}
                        >
                          {hasEntries && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-amber-400 rounded-full pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hover / Quick summary peek */}
        {hoveredDay && hoveredDay.date !== selectedDate && (
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {hoveredDay.dayName}, {formatDateDisplay(hoveredDay.date)}:
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold font-mono-nums">
                {minutesToHHMM(hoveredDay.billable)} billable
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono-nums">
                {minutesToHHMM(hoveredDay.totalWorking)} total
              </span>
              {hoveredDay.entries.length > 0 && (
                <span className="text-slate-400 font-semibold">
                  ({hoveredDay.entries.length} {hoveredDay.entries.length === 1 ? 'entry' : 'entries'})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleSelectDay(hoveredDay.date)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Daily Entries</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* CONNECTED DAILY ENTRIES MATRIX PANEL (Direct Bi-directional Connection) */}
      {selectedDayData && (
        <div
          id="connected-daily-entries-panel"
          className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header of Selected Day */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{selectedDayData.dayOfWeek}, {formatDateDisplay(selectedDayData.date)}</span>
                    {selectedDayData.date === todayStr && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Today
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span>Matrix Cell Inspection & Live Daily Entries</span>
                    {selectedDayData.isHoliday && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        Holiday: {selectedDayData.holidayName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Day Stepper */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Step to previous day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDay(todayStr)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Jump to today"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Step to next day"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {onOpenDailyEntryModal && (
                <button
                  type="button"
                  onClick={() => onOpenDailyEntryModal(selectedDayData.date)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Entry for this Day</span>
                </button>
              )}

              {onNavigateToEntries && (
                <button
                  type="button"
                  onClick={() => onNavigateToEntries(selectedDayData.date)}
                  className="px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Open filtered view in full Daily Entries Table"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View in Entries Table</span>
                </button>
              )}
            </div>
          </div>

          {/* Day Metrics Quick Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billable Effort
              </span>
              <span className="text-base font-black font-mono-nums text-blue-600 dark:text-blue-400">
                {minutesToHHMM(selectedDayData.billable)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Non-Billable
              </span>
              <span className="text-base font-black font-mono-nums text-slate-700 dark:text-slate-300">
                {minutesToHHMM(selectedDayData.nonBillable)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Upskilling / Learn
              </span>
              <span className="text-base font-black font-mono-nums text-amber-600 dark:text-amber-400">
                {minutesToHHMM(selectedDayData.upskilling)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Working
              </span>
              <span className="text-base font-black font-mono-nums text-slate-900 dark:text-slate-100">
                {minutesToHHMM(selectedDayData.totalWorking)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Day Utilization
              </span>
              <span className="text-base font-black font-mono-nums text-emerald-600 dark:text-emerald-400">
                {selectedDayData.utilization}%
              </span>
            </div>
          </div>

          {/* Daily Entries List for this Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Recorded Entries for {formatDateDisplay(selectedDayData.date)} ({selectedDayData.entries.length})</span>
              </h5>
            </div>

            {selectedDayData.entries.length === 0 ? (
              <div className="p-6 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No time entries logged for this date.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedDayData.isHoliday
                      ? `This day is registered as "${selectedDayData.holidayName}". You can still log hours if worked.`
                      : selectedDayData.isWeekend
                      ? 'This is a weekend day. Log overtime or study hours if applicable.'
                      : 'Record your billable tasks, meetings, or upskilling for this workday.'}
                  </p>
                </div>
                {onOpenDailyEntryModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDailyEntryModal(selectedDayData.date)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Hours for {selectedDayData.date}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {selectedDayData.entries.map((entry) => {
                  const projectObj = projects.find((p) => p.id === entry.projectId);
                  const entryTotal = entry.billableMinutes + entry.nonBillableMinutes + entry.upskillingMinutes;

                  return (
                    <div
                      key={entry.id}
                      className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: projectObj?.color || '#0284c7' }}
                          />
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {entry.projectName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            • {entry.employeeName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {entry.status || 'submitted'}
                          </span>
                        </div>

                        {entry.remarks && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                            "{entry.remarks}"
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-blue-600 dark:text-blue-400 font-bold font-mono-nums">
                            Billable: {minutesToHHMM(entry.billableMinutes)}
                          </span>
                          {entry.nonBillableMinutes > 0 && (
                            <span className="text-slate-600 dark:text-slate-300 font-mono-nums">
                              Non-Billable: {minutesToHHMM(entry.nonBillableMinutes)}
                            </span>
                          )}
                          {entry.upskillingMinutes > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-mono-nums">
                              Upskilling: {minutesToHHMM(entry.upskillingMinutes)}
                            </span>
                          )}
                          {entry.leaveMinutes > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-mono-nums">
                              Leave: {minutesToHHMM(entry.leaveMinutes)}
                            </span>
                          )}
                          <span className="text-slate-900 dark:text-slate-100 font-extrabold font-mono-nums">
                            Total: {minutesToHHMM(entryTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Entry Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        {onDuplicateEntry && (
                          <button
                            type="button"
                            onClick={() => onDuplicateEntry(entry)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate entry"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {onEditEntry && (
                          <button
                            type="button"
                            onClick={() => onEditEntry(entry)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteEntry && (
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12-Month Matrix Bento Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>12-Month Breakdown Matrix ({selectedYear})</span>
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            Click any day to inspect and modify connected daily entries
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
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleSelectDay(dateStr)}
                        className={`w-full aspect-square rounded-md text-[10px] font-mono-nums font-bold flex items-center justify-center border transition-all cursor-pointer ${cellColor} ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900 scale-110 z-10 shadow-xs'
                            : 'hover:scale-115'
                        }`}
                        title={`${dateStr}: ${dData ? minutesToReadable(dData.billable) : '0h'} (${dData?.entries.length || 0} entries)`}
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
