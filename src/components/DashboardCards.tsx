import React from 'react';
import { AppSettings, BillingEntry, ProductivityRating } from '../types';
import {
  calculateUtilization,
  getProductivityBadgeProps,
  getProductivityRating,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import {
  Activity,
  Award,
  Briefcase,
  CalendarDays,
  Clock,
  Coffee,
  GraduationCap,
  Layers,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

interface DashboardCardsProps {
  entries: BillingEntry[];
  settings: AppSettings;
  periodLabel: string;
  targetMinutesForPeriod: number;
  onQuickAddToday: () => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  entries,
  settings,
  periodLabel,
  targetMinutesForPeriod,
  onQuickAddToday,
}) => {
  // Aggregate minutes
  const totalBillableMinutes = entries.reduce((sum, e) => sum + (e.billableMinutes || 0), 0);
  const totalNonBillableMinutes = entries.reduce((sum, e) => sum + (e.nonBillableMinutes || 0), 0);
  const totalUpskillingMinutes = entries.reduce((sum, e) => sum + (e.upskillingMinutes || 0), 0);
  const totalLeaveMinutes = entries.reduce((sum, e) => sum + (e.leaveMinutes || 0), 0);

  // Total Working Hours = Billable + Non-Billable + Upskilling (Leave is not counted as working)
  const totalWorkingMinutes = totalBillableMinutes + totalNonBillableMinutes + totalUpskillingMinutes;
  
  // Billing Utilization % = (Billable Hours ÷ Total Working Hours) × 100
  const utilizationPercent = calculateUtilization(totalBillableMinutes, totalWorkingMinutes);
  const productivityRating = getProductivityRating(utilizationPercent);
  const badgeProps = getProductivityBadgeProps(productivityRating);

  // Target comparison
  const targetDiffMinutes = totalWorkingMinutes - targetMinutesForPeriod;
  const isOverTarget = targetDiffMinutes > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner / Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full">
              {periodLabel}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>{entries.length} {entries.length === 1 ? 'log entry' : 'log entries'} recorded</span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Executive Utilization Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Real-time hours allocation, billable efficiency, and target compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="quick-add-entry-btn"
            onClick={onQuickAddToday}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold tracking-tight rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Quick Add Today's Entry</span>
          </button>
        </div>
      </div>

      {/* Main 7 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Working Hours */}
        <div
          id="metric-total-working-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Working Hours
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-slate-900 dark:text-slate-100 tracking-tighter">
              {minutesToHHMM(totalWorkingMinutes)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(totalWorkingMinutes)}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-400">Billable + Non + Upskill</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 dark:bg-slate-700 opacity-20 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* 2. Billable Hours (Primary Blue) */}
        <div
          id="metric-billable-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-2xs hover:border-blue-400 dark:hover:border-blue-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Billable Hours
            </span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-blue-950 dark:text-blue-200 tracking-tighter">
              {minutesToHHMM(totalBillableMinutes)}
            </div>
            <div className="text-xs font-semibold text-blue-600/80 dark:text-blue-400/80 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(totalBillableMinutes)}</span>
              <span className="text-blue-300 dark:text-blue-800">•</span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Revenue Generating</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
        </div>

        {/* 3. Non-Billable Hours */}
        <div
          id="metric-non-billable-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Non-Billable Hours
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-slate-800 dark:text-slate-200 tracking-tighter">
              {minutesToHHMM(totalNonBillableMinutes)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(totalNonBillableMinutes)}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-400">Admin & Overhead</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-400 dark:bg-slate-600" />
        </div>

        {/* 4. Upskilling Hours */}
        <div
          id="metric-upskilling-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl shadow-2xs hover:border-amber-400 dark:hover:border-amber-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Upskilling Hours
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-amber-950 dark:text-amber-200 tracking-tighter">
              {minutesToHHMM(totalUpskillingMinutes)}
            </div>
            <div className="text-xs font-semibold text-amber-600/80 dark:text-amber-400/80 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(totalUpskillingMinutes)}</span>
              <span className="text-amber-300 dark:text-amber-800">•</span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Learning & Seminars</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* 5. Total Leave Hours */}
        <div
          id="metric-leave-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Leave Hours
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-slate-800 dark:text-slate-200 tracking-tighter">
              {minutesToHHMM(totalLeaveMinutes)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(totalLeaveMinutes)}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-400">Excluded from working hrs</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-400 dark:bg-rose-600" />
        </div>

        {/* 6. Target Hours */}
        <div
          id="metric-target-hours"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Hours
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono-nums text-slate-900 dark:text-slate-100 tracking-tighter">
              {minutesToHHMM(targetMinutesForPeriod)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{minutesToReadable(targetMinutesForPeriod)}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span
                className={`text-[11px] font-bold ${
                  isOverTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                }`}
              >
                {isOverTarget
                  ? `+${minutesToHHMM(targetDiffMinutes)} over target`
                  : `${minutesToHHMM(Math.abs(targetDiffMinutes))} remaining`}
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>

        {/* 7. Billing Utilization % (Double Width or Highlighted) */}
        <div
          id="metric-billing-utilization"
          className="p-5 sm:col-span-2 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border border-blue-800 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-200">
                Billing Utilization %
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-800/80 text-blue-200 font-bold">
                Billable ÷ Working
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-white/10 text-white backdrop-blur-xs border border-white/10">
              <span className={`w-2 h-2 rounded-full ${badgeProps.dot}`} />
              <span>{badgeProps.label} Utilization</span>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono-nums text-white tracking-tighter">
                {utilizationPercent}%
              </span>
              <span className="text-xs text-blue-200 font-mono-nums font-bold">
                ({minutesToReadable(totalBillableMinutes)} / {minutesToReadable(totalWorkingMinutes)})
              </span>
            </div>

            {/* Productivity Thresholds Info */}
            <div className="flex items-center gap-1 text-[11px] text-blue-200/80 font-bold">
              <span>Benchmark:</span>
              <span className="text-white">&gt;70% Good</span>
              <span>•</span>
              <span className="text-emerald-300">&gt;85% Excellent</span>
            </div>
          </div>

          {/* Utilization Progress Bar */}
          <div className="mt-3.5 space-y-1">
            <div className="w-full h-2.5 bg-blue-950/80 rounded-full overflow-hidden p-0.5 border border-blue-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  utilizationPercent >= 85
                    ? 'bg-emerald-400'
                    : utilizationPercent >= 70
                    ? 'bg-blue-400'
                    : utilizationPercent >= 50
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, utilizationPercent))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-blue-300/70 font-mono-nums font-bold pt-0.5">
              <span>0% Low</span>
              <span>50% Moderate</span>
              <span>70% Good</span>
              <span>85%+ Excellent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
