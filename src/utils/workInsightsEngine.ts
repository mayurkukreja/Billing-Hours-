import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import { calculateMonthWorkingDays } from './workingDays';
import { calculateUtilization } from './timeCalculations';

export interface DailyWorkDataPoint {
  day: number;
  date: string;
  label: string;
  isPastOrToday: boolean;
  isWorkingDay: boolean;
  isHoliday: boolean;
  // Actuals
  billableHours: number;
  nonBillableHours: number;
  upskillingHours: number;
  leaveHours: number;
  totalWorkingHours: number;
  cumulativeActualHours: number | null;
  // Targets
  targetHoursForDay: number;
  cumulativeTargetHours: number;
  // Predictions
  projectedDailyHours: number | null;
  projectedCumulativeHours: number;
  confidenceUpper: number;
  confidenceLower: number;
}

export interface DayOfWeekPattern {
  dayIndex: number;
  dayName: string;
  shortName: string;
  avgHours: number;
  totalHours: number;
  billableRatio: number;
  entryCount: number;
  isPeak: boolean;
}

export interface ProjectBurnForecast {
  id: string;
  name: string;
  color: string;
  client?: string;
  loggedHours: number;
  budgetHours: number;
  burnPercentage: number;
  weeklyBurnRate: number;
  estimatedWeeksRemaining: number | null;
  status: 'healthy' | 'warning' | 'exceeded' | 'unbudgeted';
}

export interface WorkloadInsightResults {
  // Horizon Context
  selectedYear: number;
  selectedMonth: number;
  monthName: string;
  totalDaysInMonth: number;
  elapsedWorkDays: number;
  remainingWorkDays: number;
  totalWorkingDays: number;

  // Actual Metrics to Date
  totalWorkingMinutes: number;
  totalBillableMinutes: number;
  totalNonBillableMinutes: number;
  totalUpskillingMinutes: number;
  totalLeaveMinutes: number;
  utilizationPercent: number;
  monthlyTargetMinutes: number;
  actualVsTargetDeltaMinutes: number;

  // Predictive Pacing
  currentDailyPaceHours: number;
  requiredDailyPaceHours: number;
  paceDeltaHours: number;
  projectedMonthEndHours: number;
  projectedTargetDeltaHours: number;
  projectedUtilizationPercent: number;
  projectedMilestoneDay: number | null;
  paceStatus: 'ahead' | 'on_track' | 'moderate_deficit' | 'critical_deficit';

  // Fatigue & Wellbeing Risk Index
  fatigueRiskScore: number; // 0 - 100
  fatigueRiskLevel: 'Optimal Rhythm' | 'Moderate Load' | 'Elevated Strain' | 'High Burnout Risk';
  heavyDayCount: number; // days > 9.5 hours
  weekendWorkCount: number; // weekend entries
  longestStreakDays: number;
  fatigueSignals: string[];

  // Skill Mix & Continuous Learning
  upskillingRatioPercent: number;
  deepWorkRatioPercent: number;
  overheadRatioPercent: number;
  learningInvestmentTier: 'Elite Growth' | 'Healthy Focus' | 'Needs Upskilling';

  // Day of Week Distribution
  dayOfWeekPatterns: DayOfWeekPattern[];
  peakProductivityDay: string;
  workloadConsistencyScore: number; // 0-100

  // Project Burn & Runway
  projectBurnForecasts: ProjectBurnForecast[];

  // Daily Chart Series
  dailySeries: DailyWorkDataPoint[];
}

export function computeWorkInsights(
  entries: BillingEntry[],
  projects: Project[],
  holidays: Holiday[],
  settings: AppSettings,
  selectedYear: number,
  selectedMonth: number,
  activeEmployeeFilter: string = 'all',
  selectedProjectFilter: string = 'all'
): WorkloadInsightResults {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[selectedMonth];

  const monthCalc = calculateMonthWorkingDays(
    selectedYear,
    selectedMonth,
    settings,
    holidays
  );

  const startStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const endStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  // Filter entries
  const monthEntries = entries.filter((e) => {
    if (e.date < startStr || e.date > endStr) return false;
    if (activeEmployeeFilter !== 'all' && e.employeeId !== activeEmployeeFilter) return false;
    if (selectedProjectFilter !== 'all' && e.projectId !== selectedProjectFilter) return false;
    return true;
  });

  // Aggregate Minutes
  let totalBillableMins = 0;
  let totalNonBillableMins = 0;
  let totalUpskillingMins = 0;
  let totalLeaveMins = 0;

  monthEntries.forEach((e) => {
    totalBillableMins += e.billableMinutes || 0;
    totalNonBillableMins += e.nonBillableMinutes || 0;
    totalUpskillingMins += e.upskillingMinutes || 0;
    totalLeaveMins += e.leaveMinutes || 0;
  });

  const totalWorkingMinutes = totalBillableMins + totalNonBillableMins + totalUpskillingMins;
  const utilizationPercent = calculateUtilization(totalBillableMins, totalWorkingMinutes);
  const monthlyTargetMinutes = monthCalc.monthlyTargetMinutes;
  const actualVsTargetDeltaMinutes = totalWorkingMinutes - monthlyTargetMinutes;

  // Calendar Elapsed vs Remaining Calculation
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;
  const isPastMonth = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());
  const effectiveCurrentDay = isCurrentMonth ? now.getDate() : isPastMonth ? lastDay : 0;

  let elapsedWorkDays = 0;
  let remainingWorkDays = 0;
  let totalWorkingDays = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const dayDate = new Date(selectedYear, selectedMonth, d);
    const isWorkingDay = settings.customWorkingDays.includes(dayDate.getDay());
    const isHoliday = holidays.some((h) => h.date === dateStr);

    if (isWorkingDay && !isHoliday) {
      totalWorkingDays++;
      if (d <= effectiveCurrentDay) {
        elapsedWorkDays++;
      } else {
        remainingWorkDays++;
      }
    }
  }

  // Workload Velocity & Required Run-Rate
  const currentTotalWorkHours = totalWorkingMinutes / 60;
  const currentDailyPaceHours = elapsedWorkDays > 0 ? Number((currentTotalWorkHours / elapsedWorkDays).toFixed(2)) : 0;

  const targetHours = monthlyTargetMinutes / 60;
  const remainingHoursNeeded = Math.max(0, targetHours - currentTotalWorkHours);
  const requiredDailyPaceHours = remainingWorkDays > 0 ? Number((remainingHoursNeeded / remainingWorkDays).toFixed(2)) : 0;
  const paceDeltaHours = Number((currentDailyPaceHours - requiredDailyPaceHours).toFixed(2));

  // Projected Month-End Hours
  const projectedMonthEndHours = isPastMonth
    ? Number(currentTotalWorkHours.toFixed(1))
    : Number((currentTotalWorkHours + currentDailyPaceHours * remainingWorkDays).toFixed(1));

  const projectedTargetDeltaHours = Number((projectedMonthEndHours - targetHours).toFixed(1));
  const projectedUtilizationPercent = targetHours > 0 ? Number(((projectedMonthEndHours / targetHours) * 100).toFixed(1)) : 100;

  // Pace status determination
  let paceStatus: 'ahead' | 'on_track' | 'moderate_deficit' | 'critical_deficit' = 'on_track';
  if (projectedTargetDeltaHours >= 5) {
    paceStatus = 'ahead';
  } else if (projectedTargetDeltaHours >= -4) {
    paceStatus = 'on_track';
  } else if (projectedTargetDeltaHours >= -15) {
    paceStatus = 'moderate_deficit';
  } else {
    paceStatus = 'critical_deficit';
  }

  // Projected Milestone Day (when cumulative hours cross target)
  let projectedMilestoneDay: number | null = null;
  if (currentDailyPaceHours > 0) {
    let runningCumulative = currentTotalWorkHours;
    for (let d = effectiveCurrentDay + 1; d <= lastDay; d++) {
      const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayDate = new Date(selectedYear, selectedMonth, d);
      const isWorkingDay = settings.customWorkingDays.includes(dayDate.getDay());
      const isHoliday = holidays.some((h) => h.date === dateStr);

      if (isWorkingDay && !isHoliday) {
        runningCumulative += currentDailyPaceHours;
        if (runningCumulative >= targetHours && projectedMilestoneDay === null) {
          projectedMilestoneDay = d;
          break;
        }
      }
    }
  }

  // Fatigue & Wellbeing Risk Engine
  let heavyDayCount = 0; // > 9.5 hours
  let weekendWorkCount = 0;
  let currentStreak = 0;
  let longestStreakDays = 0;
  const dayTotalsMap = new Map<string, number>();

  monthEntries.forEach((e) => {
    const totalDayMins = (e.billableMinutes || 0) + (e.nonBillableMinutes || 0) + (e.upskillingMinutes || 0);
    const existing = dayTotalsMap.get(e.date) || 0;
    dayTotalsMap.set(e.date, existing + totalDayMins);

    const dayOfWeek = new Date(e.date).getDay();
    if (!settings.customWorkingDays.includes(dayOfWeek)) {
      weekendWorkCount++;
    }
  });

  dayTotalsMap.forEach((mins) => {
    if (mins >= 570) {
      // >= 9.5 hrs
      heavyDayCount++;
    }
    if (mins > 0) {
      currentStreak++;
      if (currentStreak > longestStreakDays) longestStreakDays = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  // Fatigue Score calculation: Starts at 100, penalized by excessive overtime & weekend shifts
  let fatigueScore = 100;
  fatigueScore -= heavyDayCount * 7;
  fatigueScore -= weekendWorkCount * 8;
  if (currentDailyPaceHours > 9.5) fatigueScore -= 15;
  if (longestStreakDays > 7) fatigueScore -= 10;
  fatigueScore = Math.max(25, Math.min(100, fatigueScore));

  let fatigueRiskLevel: 'Optimal Rhythm' | 'Moderate Load' | 'Elevated Strain' | 'High Burnout Risk' = 'Optimal Rhythm';
  if (fatigueScore >= 80) fatigueRiskLevel = 'Optimal Rhythm';
  else if (fatigueScore >= 65) fatigueRiskLevel = 'Moderate Load';
  else if (fatigueScore >= 45) fatigueRiskLevel = 'Elevated Strain';
  else fatigueRiskLevel = 'High Burnout Risk';

  const fatigueSignals: string[] = [];
  if (heavyDayCount > 0) {
    fatigueSignals.push(`${heavyDayCount} heavy workday${heavyDayCount > 1 ? 's' : ''} logged (>9.5 hrs)`);
  }
  if (weekendWorkCount > 0) {
    fatigueSignals.push(`${weekendWorkCount} weekend shift${weekendWorkCount > 1 ? 's' : ''} recorded without rest period`);
  }
  if (currentDailyPaceHours > 9.0) {
    fatigueSignals.push(`Current pace (${currentDailyPaceHours}h/day) exceeds recommended 8.0h baseline`);
  }
  if (fatigueSignals.length === 0) {
    fatigueSignals.push('Balanced workload distribution with regular recovery cycles');
  }

  // Skill Mix & Continuous Learning
  const upskillingRatioPercent = totalWorkingMinutes > 0 ? Number(((totalUpskillingMins / totalWorkingMinutes) * 100).toFixed(1)) : 0;
  const deepWorkRatioPercent = totalWorkingMinutes > 0 ? Number(((totalBillableMins / totalWorkingMinutes) * 100).toFixed(1)) : 0;
  const overheadRatioPercent = totalWorkingMinutes > 0 ? Number(((totalNonBillableMins / totalWorkingMinutes) * 100).toFixed(1)) : 0;

  let learningInvestmentTier: 'Elite Growth' | 'Healthy Focus' | 'Needs Upskilling' = 'Healthy Focus';
  if (upskillingRatioPercent >= 12) learningInvestmentTier = 'Elite Growth';
  else if (upskillingRatioPercent >= 5) learningInvestmentTier = 'Healthy Focus';
  else learningInvestmentTier = 'Needs Upskilling';

  // Day of Week Pattern Breakdown (Monday to Sunday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeekStats = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    dayName: dayNames[i],
    shortName: shortDayNames[i],
    totalMinutes: 0,
    billableMinutes: 0,
    occurrences: 0,
  }));

  // Count day occurrences in month
  for (let d = 1; d <= lastDay; d++) {
    const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();
    dayOfWeekStats[dayOfWeek].occurrences++;
  }

  monthEntries.forEach((e) => {
    const dow = new Date(e.date).getDay();
    const workMins = (e.billableMinutes || 0) + (e.nonBillableMinutes || 0) + (e.upskillingMinutes || 0);
    dayOfWeekStats[dow].totalMinutes += workMins;
    dayOfWeekStats[dow].billableMinutes += e.billableMinutes || 0;
  });

  const dayOfWeekPatterns: DayOfWeekPattern[] = dayOfWeekStats.map((item) => {
    const avgHours = item.occurrences > 0 ? Number(((item.totalMinutes / item.occurrences) / 60).toFixed(2)) : 0;
    const totalHours = Number((item.totalMinutes / 60).toFixed(1));
    const billableRatio = item.totalMinutes > 0 ? Math.round((item.billableMinutes / item.totalMinutes) * 100) : 0;

    return {
      dayIndex: item.dayIndex,
      dayName: item.dayName,
      shortName: item.shortName,
      avgHours,
      totalHours,
      billableRatio,
      entryCount: item.occurrences,
      isPeak: false,
    };
  });

  // Identify Peak Day
  let maxAvg = 0;
  let peakDayName = 'Monday';
  dayOfWeekPatterns.forEach((p) => {
    if (p.avgHours > maxAvg) {
      maxAvg = p.avgHours;
      peakDayName = p.dayName;
      p.isPeak = true;
    }
  });

  // Workload Consistency Score based on variance across scheduled workdays
  const workingDayAverages = dayOfWeekPatterns
    .filter((p) => settings.customWorkingDays.includes(p.dayIndex))
    .map((p) => p.avgHours);
  const avgWorkHours = workingDayAverages.length > 0 ? workingDayAverages.reduce((a, b) => a + b, 0) / workingDayAverages.length : 8;
  const variance = workingDayAverages.length > 0
    ? workingDayAverages.reduce((acc, val) => acc + Math.pow(val - avgWorkHours, 2), 0) / workingDayAverages.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(50, Math.min(98, Math.round(100 - stdDev * 12)));

  // Project Burn & Capacity Runway Forecast
  const projectBurnForecasts: ProjectBurnForecast[] = projects.map((p) => {
    const projEntries = monthEntries.filter((e) => e.projectId === p.id);
    const loggedMins = projEntries.reduce(
      (sum, e) => sum + (e.billableMinutes || 0) + (e.nonBillableMinutes || 0) + (e.upskillingMinutes || 0),
      0
    );
    const loggedHours = Number((loggedMins / 60).toFixed(1));
    const budgetHours = p.budgetHours || 0;
    const burnPercentage = budgetHours > 0 ? Math.min(150, Math.round((loggedHours / budgetHours) * 100)) : 0;

    // Estimate weekly burn rate
    const elapsedWeeks = Math.max(1, elapsedWorkDays / 5);
    const weeklyBurnRate = Number((loggedHours / elapsedWeeks).toFixed(1));
    const remainingBudget = Math.max(0, budgetHours - loggedHours);
    const estimatedWeeksRemaining = weeklyBurnRate > 0 && budgetHours > 0 ? Number((remainingBudget / weeklyBurnRate).toFixed(1)) : null;

    let status: 'healthy' | 'warning' | 'exceeded' | 'unbudgeted' = 'healthy';
    if (budgetHours === 0) status = 'unbudgeted';
    else if (loggedHours > budgetHours) status = 'exceeded';
    else if (burnPercentage >= 85) status = 'warning';

    return {
      id: p.id,
      name: p.name,
      color: p.color || '#3b82f6',
      client: p.client,
      loggedHours,
      budgetHours,
      burnPercentage,
      weeklyBurnRate,
      estimatedWeeksRemaining,
      status,
    };
  }).filter((p) => p.loggedHours > 0 || p.budgetHours > 0);

  // Daily Chart Series: Past Actuals + Future Predictive Trajectory
  const dailySeries: DailyWorkDataPoint[] = [];
  let cumulativeActual = 0;
  let cumulativeTarget = 0;
  let cumulativeProjected = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const dayDate = new Date(selectedYear, selectedMonth, d);
    const isWorkingDay = settings.customWorkingDays.includes(dayDate.getDay());
    const isHoliday = holidays.some((h) => h.date === dateStr);
    const isPastOrToday = d <= effectiveCurrentDay;

    const dayTarget = isWorkingDay && !isHoliday ? settings.defaultDailyTargetMinutes / 60 : 0;
    cumulativeTarget += dayTarget;

    const dayEntries = monthEntries.filter((e) => e.date === dateStr);
    const billableHours = Number((dayEntries.reduce((sum, e) => sum + (e.billableMinutes || 0), 0) / 60).toFixed(2));
    const nonBillableHours = Number((dayEntries.reduce((sum, e) => sum + (e.nonBillableMinutes || 0), 0) / 60).toFixed(2));
    const upskillingHours = Number((dayEntries.reduce((sum, e) => sum + (e.upskillingMinutes || 0), 0) / 60).toFixed(2));
    const leaveHours = Number((dayEntries.reduce((sum, e) => sum + (e.leaveMinutes || 0), 0) / 60).toFixed(2));
    const totalWorkingHours = Number((billableHours + nonBillableHours + upskillingHours).toFixed(2));

    if (isPastOrToday) {
      cumulativeActual += totalWorkingHours;
      cumulativeProjected = cumulativeActual;
    } else {
      const projectedDayWork = isWorkingDay && !isHoliday ? currentDailyPaceHours : 0;
      cumulativeProjected += projectedDayWork;
    }

    // Confidence interval band: ±8% expanding slightly over future days
    const daysIntoFuture = Math.max(0, d - effectiveCurrentDay);
    const margin = daysIntoFuture * 0.45;
    const confidenceUpper = Number((cumulativeProjected + margin).toFixed(2));
    const confidenceLower = Number(Math.max(0, cumulativeProjected - margin).toFixed(2));

    dailySeries.push({
      day: d,
      date: dateStr,
      label: `${d} ${monthName.slice(0, 3)}`,
      isPastOrToday,
      isWorkingDay,
      isHoliday,
      billableHours,
      nonBillableHours,
      upskillingHours,
      leaveHours,
      totalWorkingHours,
      cumulativeActualHours: isPastOrToday ? Number(cumulativeActual.toFixed(2)) : null,
      targetHoursForDay: dayTarget,
      cumulativeTargetHours: Number(cumulativeTarget.toFixed(2)),
      projectedDailyHours: isPastOrToday ? null : (isWorkingDay && !isHoliday ? currentDailyPaceHours : 0),
      projectedCumulativeHours: Number(cumulativeProjected.toFixed(2)),
      confidenceUpper,
      confidenceLower,
    });
  }

  return {
    selectedYear,
    selectedMonth,
    monthName,
    totalDaysInMonth: lastDay,
    elapsedWorkDays,
    remainingWorkDays,
    totalWorkingDays,
    totalWorkingMinutes,
    totalBillableMinutes: totalBillableMins,
    totalNonBillableMinutes: totalNonBillableMins,
    totalUpskillingMinutes: totalUpskillingMins,
    totalLeaveMinutes: totalLeaveMins,
    utilizationPercent,
    monthlyTargetMinutes,
    actualVsTargetDeltaMinutes,
    currentDailyPaceHours,
    requiredDailyPaceHours,
    paceDeltaHours,
    projectedMonthEndHours,
    projectedTargetDeltaHours,
    projectedUtilizationPercent,
    projectedMilestoneDay,
    paceStatus,
    fatigueRiskScore: fatigueScore,
    fatigueRiskLevel,
    heavyDayCount,
    weekendWorkCount,
    longestStreakDays,
    fatigueSignals,
    upskillingRatioPercent,
    deepWorkRatioPercent,
    overheadRatioPercent,
    learningInvestmentTier,
    dayOfWeekPatterns,
    peakProductivityDay: peakDayName,
    workloadConsistencyScore: consistencyScore,
    projectBurnForecasts,
    dailySeries,
  };
}
