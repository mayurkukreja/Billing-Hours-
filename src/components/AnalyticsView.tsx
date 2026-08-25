import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  Clock,
  SlidersHorizontal,
  Flame,
  HelpCircle,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Compass,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts';
import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import {
  calculateUtilization,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import { computeWorkInsights, WorkloadInsightResults } from '../utils/workInsightsEngine';

interface AnalyticsViewProps {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
  activeEmployeeFilter?: string;
  onOpenDailyEntryModal?: (prefillDate?: string) => void;
  onEditEntry?: (entry: BillingEntry) => void;
}

export function AnalyticsView({
  entries,
  employees,
  projects,
  holidays,
  settings,
  activeEmployeeFilter = 'all',
  onOpenDailyEntryModal,
  onEditEntry,
}: AnalyticsViewProps) {
  // Selected Month & Year
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'burndown' | 'trends' | 'patterns' | 'projects' | 'wellbeing' | 'audit'>('burndown');

  // Interactive Scenario Simulator Pace Slider (defaulted to standard daily target hours)
  const defaultPaceHours = settings.defaultDailyTargetMinutes / 60;
  const [simulatedPace, setSimulatedPace] = useState<number>(defaultPaceHours);

  // Compute comprehensive Work Insights & Predictions
  const insights: WorkloadInsightResults = useMemo(() => {
    return computeWorkInsights(
      entries,
      projects,
      holidays,
      settings,
      selectedYear,
      selectedMonth,
      activeEmployeeFilter,
      selectedProjectFilter
    );
  }, [entries, projects, holidays, settings, selectedYear, selectedMonth, activeEmployeeFilter, selectedProjectFilter]);

  // Sync simulator pace with current daily pace when month changes
  React.useEffect(() => {
    if (insights.currentDailyPaceHours > 0) {
      setSimulatedPace(insights.currentDailyPaceHours);
    } else {
      setSimulatedPace(defaultPaceHours);
    }
  }, [insights.currentDailyPaceHours, defaultPaceHours]);

  // Dynamic Scenario Simulation Calculation
  const simulatedOutcome = useMemo(() => {
    const currentHours = insights.totalWorkingMinutes / 60;
    const projectedAdditionalHours = simulatedPace * insights.remainingWorkDays;
    const simulatedTotalHours = Number((currentHours + projectedAdditionalHours).toFixed(1));
    const targetHours = insights.monthlyTargetMinutes / 60;
    const simulatedDeltaHours = Number((simulatedTotalHours - targetHours).toFixed(1));
    const simulatedUtilization = targetHours > 0 ? Number(((simulatedTotalHours / targetHours) * 100).toFixed(1)) : 100;

    return {
      simulatedTotalHours,
      simulatedDeltaHours,
      simulatedUtilization,
      isTargetMet: simulatedTotalHours >= targetHours,
    };
  }, [insights, simulatedPace]);

  // Automated Smart QA Audit Issues
  const auditIssues = useMemo(() => {
    const issues: Array<{
      id: string;
      date: string;
      type: 'warning' | 'error' | 'info';
      title: string;
      description: string;
      entry?: BillingEntry;
    }> = [];

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;
    const isPastMonth = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());
    const maxDayToCheck = isCurrentMonth ? now.getDate() : isPastMonth ? insights.totalDaysInMonth : 0;

    const startStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
    const endStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${insights.totalDaysInMonth.toString().padStart(2, '0')}`;

    const monthEntries = entries.filter((e) => {
      if (e.date < startStr || e.date > endStr) return false;
      if (activeEmployeeFilter !== 'all' && e.employeeId !== activeEmployeeFilter) return false;
      return true;
    });

    // 1. Missing logs on scheduled workdays
    for (let d = 1; d <= maxDayToCheck; d++) {
      const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayDate = new Date(selectedYear, selectedMonth, d);
      const isWorkingDay = settings.customWorkingDays.includes(dayDate.getDay());
      const isHoliday = holidays.some((h) => h.date === dateStr);

      if (isWorkingDay && !isHoliday) {
        const dayEntries = monthEntries.filter((e) => e.date === dateStr);
        if (dayEntries.length === 0) {
          issues.push({
            id: `missing-${dateStr}`,
            date: dateStr,
            type: 'warning',
            title: 'Missing Timesheet Entry',
            description: `Scheduled workday has no logged hours or leave recorded.`,
          });
        }
      }
    }

    // 2. Heavy hours or missing remarks
    monthEntries.forEach((e) => {
      const totalMins = (e.billableMinutes || 0) + (e.nonBillableMinutes || 0) + (e.upskillingMinutes || 0);
      if (totalMins > 600 && !e.overtimeAcknowledged) {
        issues.push({
          id: `ot-${e.id}`,
          date: e.date,
          type: 'warning',
          title: `Overtime Intensity (${minutesToHHMM(totalMins)})`,
          description: `Entry on ${e.projectName} exceeds 10 hours without overtime confirmation.`,
          entry: e,
        });
      }

      if (e.nonBillableMinutes > 120 && (!e.remarks || e.remarks.trim().length < 5)) {
        issues.push({
          id: `remarks-${e.id}`,
          date: e.date,
          type: 'info',
          title: 'Non-Billable Justification Missing',
          description: `Logged ${minutesToReadable(e.nonBillableMinutes)} non-billable hours with empty remarks.`,
          entry: e,
        });
      }
    });

    return issues;
  }, [selectedYear, selectedMonth, insights.totalDaysInMonth, entries, activeEmployeeFilter, settings, holidays]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div id="work-insights-view-container" className="space-y-6 animate-fadeIn">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Predictive Workload Intelligence
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                AI Forecasting Model
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {insights.monthName} {selectedYear} Work Insights & Prediction
            </h2>
          </div>
        </div>

        {/* Month, Year & Project Scope Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            id="insights-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            aria-label="Select Analysis Month"
            className="px-3.5 py-1.5 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            id="insights-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Select Analysis Year"
            className="px-3.5 py-1.5 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-nums"
          >
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <select
            id="insights-project-filter"
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            aria-label="Filter by Project Scope"
            className="px-3.5 py-1.5 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Core Work Insights & Prediction Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Month-End Target & Predictive Forecast */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/80 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
              Month-End Capacity Forecast
            </span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black font-mono-nums tracking-tight mt-2 text-white flex items-baseline gap-2">
            <span>{insights.projectedMonthEndHours}</span>
            <span className="text-sm font-bold text-slate-400">/ {(insights.monthlyTargetMinutes / 60).toFixed(0)} hrs</span>
          </div>
          <div className="text-xs font-bold text-indigo-200 mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Trajectory:</span>
              <span className="font-mono-nums font-black text-emerald-300">
                {insights.projectedUtilizationPercent}%
              </span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                insights.paceStatus === 'ahead'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : insights.paceStatus === 'on_track'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {insights.paceStatus.replace('_', ' ')}
            </span>
          </div>
          {insights.projectedMilestoneDay && (
            <div className="text-[11px] text-indigo-300/90 font-medium mt-2 flex items-center gap-1 pt-2 border-t border-indigo-800/50">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Target reached by Day {insights.projectedMilestoneDay}</span>
            </div>
          )}
        </div>

        {/* 2. Velocity Run-Rate & Daily Pace */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Workload Run-Rate
            </span>
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono-nums tracking-tight mt-2 text-slate-900 dark:text-slate-100 flex items-baseline gap-1.5">
            <span>{insights.currentDailyPaceHours}</span>
            <span className="text-xs text-slate-500 font-semibold">hrs/day</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-between">
            <span>Required: <strong className="text-slate-900 dark:text-slate-200">{insights.requiredDailyPaceHours}h/day</strong></span>
            <span
              className={`font-mono-nums font-black text-xs ${
                insights.paceDeltaHours >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {insights.paceDeltaHours >= 0 ? `+${insights.paceDeltaHours}h buffer` : `${insights.paceDeltaHours}h pace`}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>{insights.elapsedWorkDays} days elapsed</span>
            <span>{insights.remainingWorkDays} days left</span>
          </div>
        </div>

        {/* 3. Fatigue & Wellbeing Risk Index */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workload Health & Fatigue
            </span>
            <HeartPulse className={`w-4 h-4 ${insights.fatigueRiskScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
          <div className="text-3xl font-black font-mono-nums tracking-tight mt-2 text-slate-900 dark:text-slate-100 flex items-baseline gap-2">
            <span>{insights.fatigueRiskScore}</span>
            <span className="text-xs text-slate-400 font-bold">/ 100</span>
          </div>
          <div className="text-xs font-bold mt-1 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-bold">{insights.fatigueRiskLevel}</span>
            <span className="text-[11px] font-mono-nums text-slate-500">{insights.heavyDayCount} heavy days</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 truncate">
            {insights.fatigueSignals[0] || 'Balanced work intervals'}
          </div>
        </div>

        {/* 4. Skill Growth & Deep Work Mix */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Continuous Learning & Skills
            </span>
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono-nums tracking-tight mt-2 text-slate-900 dark:text-slate-100 flex items-baseline gap-2">
            <span>{(insights.totalUpskillingMinutes / 60).toFixed(1)}</span>
            <span className="text-xs text-slate-500 font-semibold">upskill hrs</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-between">
            <span>Skill Growth: <strong className="text-emerald-600 dark:text-emerald-400">{insights.upskillingRatioPercent}%</strong></span>
            <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {insights.learningInvestmentTier}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Deep Work: {insights.deepWorkRatioPercent}%</span>
            <span>Overhead: {insights.overheadRatioPercent}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Scenario Modeler ("What-If" Pacing Simulator) */}
      <div className="p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-slate-50 dark:from-slate-800/90 dark:via-indigo-950/30 dark:to-slate-800/90 border border-blue-200 dark:border-indigo-900/60 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Predictive "What-If" Scenario Modeler</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                  Interactive
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Simulate your projected outcome by adjusting your daily working hours for the remaining {insights.remainingWorkDays} workdays
              </p>
            </div>
          </div>

          {/* Quick Scenario Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSimulatedPace(defaultPaceHours)}
              className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Standard (8.0h)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedPace(insights.requiredDailyPaceHours)}
              className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Exact Target ({insights.requiredDailyPaceHours}h)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedPace(9.5)}
              className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Sprint (9.5h)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedPace(6.0)}
              className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Recovery (6.0h)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
          {/* Slider Control */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Simulated Daily Pace for Remaining Days:</span>
              <span className="font-mono-nums font-black text-sm text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {simulatedPace.toFixed(1)} hrs/day
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              step="0.25"
              value={simulatedPace}
              onChange={(e) => setSimulatedPace(Number(e.target.value))}
              aria-label="Simulated Daily Pace Hours"
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>2.0 hrs (Low)</span>
              <span>8.0 hrs (Standard)</span>
              <span>12.0 hrs (Maximum)</span>
            </div>
          </div>

          {/* Real-time Simulated Results */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] uppercase font-black text-slate-400 block">Projected Total</span>
              <div className="text-base font-black font-mono-nums text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <span>{simulatedOutcome.simulatedTotalHours} hrs</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${simulatedOutcome.isTargetMet ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'}`}>
                  {simulatedOutcome.simulatedUtilization}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] uppercase font-black text-slate-400 block">Target Variance</span>
              <div className={`text-base font-black font-mono-nums mt-0.5 ${simulatedOutcome.simulatedDeltaHours >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {simulatedOutcome.simulatedDeltaHours >= 0 ? `+${simulatedOutcome.simulatedDeltaHours}` : simulatedOutcome.simulatedDeltaHours} hrs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs for Work Insights & Predictions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-3 bg-slate-50 dark:bg-slate-800/50 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('burndown')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'burndown'
                ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target Burndown & Trajectory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'trends'
                ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Daily Effort & Velocity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Day-of-Week Work Patterns</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Project Capacity Burn & Runway</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wellbeing')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'wellbeing'
                ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Fatigue & Work Consistency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-black tracking-tight rounded-t-xl transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated QA Audit</span>
            {auditIssues.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black">
                {auditIssues.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6">
          {/* TAB 1: Target Burndown & Predictive Extrapolation */}
          {activeTab === 'burndown' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <span>Cumulative Target Burndown & Future Predictive Extrapolation</span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-black">
                      AI Projected Path
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Actual logged hours (solid blue) compared against linear target baseline (dashed gray) and rolling machine forecast (dashed cyan)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-600 inline-block" /> Actual Logged
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed border-indigo-500 inline-block" /> Forecast
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400 inline-block" /> Target
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.dailySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} unit="h" />
                    <Tooltip
                      formatter={(val: number, name: string) => [`${val} hrs`, name]}
                      labelFormatter={(label) => `Day ${label} (${insights.monthName})`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="cumulativeTargetHours"
                      name="Scheduled Target Baseline"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeActualHours"
                      name="Actual Logged Hours"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2563eb' }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="projectedCumulativeHours"
                      name="Predicted Trajectory (Extrapolated)"
                      stroke="#6366f1"
                      strokeDasharray="3 3"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Forecast model projects finishing at <strong>{insights.projectedMonthEndHours} total hours</strong> ({insights.projectedUtilizationPercent}% of target capacity).
                  </span>
                </div>
                <span className="font-mono-nums font-black text-indigo-700 dark:text-indigo-300">
                  {insights.paceDeltaHours >= 0 ? `+${insights.paceDeltaHours}h/day surplus pace` : `${insights.paceDeltaHours}h/day deficit pace`}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Daily Effort Distribution & Stacked Time */}
          {activeTab === 'trends' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Daily Effort Composition (Hours Logged)
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Stacked breakdown of Billable engineering, continuous upskilling, non-billable overhead, and approved leave
                </p>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insights.dailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBillable" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorUpskill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorNonBill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} unit="h" />
                    <Tooltip
                      formatter={(val: number, name: string) => [`${val} hrs`, name]}
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="billableHours" name="Billable Engineering" stackId="1" stroke="#2563eb" fillOpacity={1} fill="url(#colorBillable)" />
                    <Area type="monotone" dataKey="upskillingHours" name="Skill Learning" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorUpskill)" />
                    <Area type="monotone" dataKey="nonBillableHours" name="Non-Billable" stackId="1" stroke="#64748b" fillOpacity={1} fill="url(#colorNonBill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: Day-of-Week Work Patterns */}
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Day-of-Week Workload Distribution & Rhythm
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Average hours logged per day of week to identify peak performance days and fatigue lulls
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Peak Productivity Day: <strong className="text-blue-600 dark:text-blue-400">{insights.peakProductivityDay}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.dayOfWeekPatterns} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} unit="h" />
                      <Tooltip
                        formatter={(val: number) => [`${val} hrs avg`, 'Average Daily Output']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="avgHours" name="Average Working Hours" radius={[6, 6, 0, 0]}>
                        {insights.dayOfWeekPatterns.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isPeak ? '#2563eb' : '#94a3b8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-5 space-y-2.5">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Day-by-Day Ratios
                  </h5>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {insights.dayOfWeekPatterns.map((d) => (
                      <div key={d.dayName} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${d.isPeak ? 'bg-blue-600' : 'bg-slate-400'}`} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{d.dayName}</span>
                          {d.isPeak && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-black">
                              PEAK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono-nums">
                          <span className="font-black text-slate-900 dark:text-slate-100">{d.avgHours}h avg</span>
                          <span className="text-slate-400 font-bold">({d.billableRatio}% billable)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Project Capacity Burn & Runway Forecast */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Project Capacity Burn Rate & Runway Forecast
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Tracks hours consumed against allocated project budgets and predicts weeks of runway remaining at current burn rate
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.projectBurnForecasts.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                        <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                          {proj.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                          proj.status === 'exceeded'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : proj.status === 'warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold font-mono-nums">
                        <span>{proj.loggedHours}h logged</span>
                        <span>{proj.budgetHours > 0 ? `${proj.budgetHours}h budget` : 'No budget set'}</span>
                      </div>
                      {proj.budgetHours > 0 && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              proj.burnPercentage > 100 ? 'bg-rose-500' : proj.burnPercentage >= 85 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, proj.burnPercentage)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Burn Velocity:</span>
                      <span className="font-mono-nums font-black text-slate-800 dark:text-slate-200">
                        {proj.weeklyBurnRate} hrs/wk
                      </span>
                    </div>

                    {proj.estimatedWeeksRemaining !== null && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Runway Forecast:</span>
                        <span className="font-mono-nums font-black text-indigo-600 dark:text-indigo-400">
                          ~{proj.estimatedWeeksRemaining} weeks remaining
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Fatigue & Work Consistency */}
          {activeTab === 'wellbeing' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Workload Consistency Score
                  </span>
                  <div className="text-2xl font-black font-mono-nums text-slate-900 dark:text-slate-100">
                    {insights.workloadConsistencyScore} / 100
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Measures standard deviation across daily working hours. Higher is more predictable.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Longest Work Streak
                  </span>
                  <div className="text-2xl font-black font-mono-nums text-slate-900 dark:text-slate-100">
                    {insights.longestStreakDays} Days
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Consecutive days worked without a rest gap. Optimal is 5 days.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Weekend Logging Shifts
                  </span>
                  <div className="text-2xl font-black font-mono-nums text-slate-900 dark:text-slate-100">
                    {insights.weekendWorkCount} Days
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Work hours logged outside scheduled company workdays.
                  </p>
                </div>
              </div>

              {/* Actionable Fatigue Insights Box */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Workload Rhythm Recommendations</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {insights.fatigueSignals.map((sig, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 6: Automated QA Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Timesheet Quality Assurance & Anomaly Diagnostics
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Proactive checks for missing logs on scheduled workdays, overtime compliance, and justification completeness
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-black bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                  {auditIssues.length} Findings
                </span>
              </div>

              {auditIssues.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h5 className="text-base font-black text-emerald-950 dark:text-emerald-200">
                    100% Timesheet Compliant
                  </h5>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    All scheduled working days are properly logged with valid breakdown and justifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        issue.type === 'warning'
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                          : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            issue.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-slate-100">
                              {issue.title}
                            </span>
                            <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded font-mono font-bold text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {issue.date}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      <div>
                        {issue.entry && onEditEntry ? (
                          <button
                            type="button"
                            onClick={() => onEditEntry(issue.entry!)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-black rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs whitespace-nowrap"
                          >
                            Edit Entry
                          </button>
                        ) : onOpenDailyEntryModal ? (
                          <button
                            type="button"
                            onClick={() => onOpenDailyEntryModal(issue.date)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                          >
                            Log This Day
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
