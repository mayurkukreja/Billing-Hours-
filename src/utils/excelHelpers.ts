import * as XLSX from 'xlsx';
import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import { calculateUtilization, minutesToDecimal, minutesToHHMM } from './timeCalculations';

export interface ParsedExcelResult {
  success: boolean;
  entries: BillingEntry[];
  newEmployees: Employee[];
  newProjects: Project[];
  error?: string;
  rowCount: number;
}

/**
 * Trigger browser file download for a Blob
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download an advanced, multi-sheet Excel Workbook (.xlsx)
 * featuring:
 *  1. Dashboard & KPI Summary
 *  2. Visual Activity Heatmap Matrix (12 months x 31 days + weekly breakdown)
 *  3. Itemized Daily Billing Logs
 *  4. Project & Consultant Cross-Tabulation
 */
export function exportToExcel(
  entries: BillingEntry[],
  employees: Employee[],
  projects: Project[],
  holidays: Holiday[],
  settings: AppSettings,
  activeYear: number = new Date().getFullYear()
): void {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // SHEET 1: Overview & KPI Summary
  // ----------------------------------------------------
  const totalBillable = entries.reduce((s, e) => s + e.billableMinutes, 0);
  const totalNonBillable = entries.reduce((s, e) => s + e.nonBillableMinutes, 0);
  const totalUpskilling = entries.reduce((s, e) => s + e.upskillingMinutes, 0);
  const totalLeave = entries.reduce((s, e) => s + e.leaveMinutes, 0);
  const totalWorking = totalBillable + totalNonBillable + totalUpskilling;
  const overallUtil = calculateUtilization(totalBillable, totalWorking);

  let totalRevenue = 0;
  entries.forEach((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    const emp = employees.find((em) => em.id === e.employeeId);
    const rate = e.hourlyRate || proj?.hourlyRate || emp?.defaultHourlyRate || settings.defaultHourlyRate || 150;
    totalRevenue += (e.billableMinutes / 60) * rate;
  });

  const summaryData: (string | number)[][] = [
    ['BILLING HOURS TRACKER — EXECUTIVE SUMMARY & HEATMAP REPORT'],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Currency: ${settings.currency}`, `Default Target: ${minutesToHHMM(settings.defaultDailyTargetMinutes)}/day`],
    [],
    ['KEY PERFORMANCE INDICATORS (KPIs)'],
    ['Metric', 'Value (HH:MM)', 'Value (Decimal / USD)'],
    ['Total Billable Time', minutesToHHMM(totalBillable), minutesToDecimal(totalBillable)],
    ['Total Non-Billable Time', minutesToHHMM(totalNonBillable), minutesToDecimal(totalNonBillable)],
    ['Total Upskilling & Training', minutesToHHMM(totalUpskilling), minutesToDecimal(totalUpskilling)],
    ['Total Paid Leave', minutesToHHMM(totalLeave), minutesToDecimal(totalLeave)],
    ['Total Effective Working Time', minutesToHHMM(totalWorking), minutesToDecimal(totalWorking)],
    ['Overall Billable Utilization Rate', `${overallUtil}%`, overallUtil / 100],
    ['Total Gross Revenue Billed', `${settings.currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalRevenue],
    ['Total Logged Entries', entries.length, entries.length],
    [],
    ['PROJECT BREAKDOWN & BUDGET UTILIZATION'],
    ['Project Name', 'Project Code', 'Client', 'Hourly Rate', 'Billed Hours (HH:MM)', 'Billed (Dec)', 'Revenue Amount', 'Budget (Hours)', 'Budget Spent %']
  ];

  projects.forEach((proj) => {
    const projEntries = entries.filter((e) => e.projectId === proj.id);
    const pBillable = projEntries.reduce((s, e) => s + e.billableMinutes, 0);
    const rate = proj.hourlyRate || settings.defaultHourlyRate || 150;
    const rev = (pBillable / 60) * rate;
    const budgetHrs = proj.budgetHours || 0;
    const budgetSpent = budgetHrs > 0 ? `${((pBillable / 60 / budgetHrs) * 100).toFixed(1)}%` : 'N/A';

    summaryData.push([
      proj.name,
      proj.code || '',
      proj.client || '',
      rate,
      minutesToHHMM(pBillable),
      minutesToDecimal(pBillable),
      rev,
      budgetHrs || '—',
      budgetSpent
    ]);
  });

  summaryData.push([]);
  summaryData.push(['CONSULTANT PERFORMANCE SUMMARY']);
  summaryData.push(['Consultant Name', 'Email', 'Role', 'Billable Hours (HH:MM)', 'Total Working (HH:MM)', 'Utilization %', 'Estimated Revenue']);

  employees.forEach((emp) => {
    const empEntries = entries.filter((e) => e.employeeId === emp.id);
    const eBillable = empEntries.reduce((s, e) => s + e.billableMinutes, 0);
    const eNonBill = empEntries.reduce((s, e) => s + e.nonBillableMinutes, 0);
    const eUpskill = empEntries.reduce((s, e) => s + e.upskillingMinutes, 0);
    const eTotalWork = eBillable + eNonBill + eUpskill;
    const eUtil = calculateUtilization(eBillable, eTotalWork);
    const eRate = emp.defaultHourlyRate || settings.defaultHourlyRate || 150;
    const eRev = (eBillable / 60) * eRate;

    summaryData.push([
      emp.name,
      emp.email || '',
      emp.role || 'Consultant',
      minutesToHHMM(eBillable),
      minutesToHHMM(eTotalWork),
      `${eUtil}%`,
      eRev
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary & KPIs');

  // ----------------------------------------------------
  // SHEET 2: ACTIVITY HEATMAP & CALENDAR MATRIX
  // ----------------------------------------------------
  // Build a 12-month x 31-day activity matrix (Total billable hours per day)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysHeader = ['Month', ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`), 'Month Total (HH:MM)', 'Month Total (Dec)', 'Active Days', 'Avg Hours/Day'];

  const heatmapData: (string | number)[][] = [
    [`ANNUAL BILLING ACTIVITY HEATMAP MATRIX (${activeYear})`],
    ['Intensity Scale: 0h (Empty) | 1-4h (Low) | 4-7h (Normal) | 7-9h (Target 9h) | >9h (Overtime)'],
    [],
    daysHeader
  ];

  // Map entries by YYYY-MM-DD
  const dailyHoursMap: Record<string, number> = {};
  entries.forEach((e) => {
    dailyHoursMap[e.date] = (dailyHoursMap[e.date] || 0) + e.billableMinutes;
  });

  months.forEach((monthName, mIdx) => {
    const mNum = mIdx + 1;
    const mStr = mNum.toString().padStart(2, '0');
    const daysInMonth = new Date(activeYear, mNum, 0).getDate();

    let monthTotalMin = 0;
    let activeDaysCount = 0;
    const row: (string | number)[] = [monthName];

    for (let day = 1; day <= 31; day++) {
      if (day > daysInMonth) {
        row.push(''); // Invalid day in month
      } else {
        const dStr = day.toString().padStart(2, '0');
        const dateKey = `${activeYear}-${mStr}-${dStr}`;
        const dayMinutes = dailyHoursMap[dateKey] || 0;
        monthTotalMin += dayMinutes;
        if (dayMinutes > 0) activeDaysCount++;

        row.push(dayMinutes > 0 ? minutesToDecimal(dayMinutes) : 0);
      }
    }

    const avgHours = activeDaysCount > 0 ? Number((monthTotalMin / 60 / activeDaysCount).toFixed(2)) : 0;
    row.push(minutesToHHMM(monthTotalMin));
    row.push(minutesToDecimal(monthTotalMin));
    row.push(activeDaysCount);
    row.push(avgHours);

    heatmapData.push(row);
  });

  // Add Day-of-Week Distribution
  heatmapData.push([]);
  heatmapData.push(['DAY OF WEEK ACTIVITY DISTRIBUTION']);
  heatmapData.push(['Day of Week', 'Total Billed Hours (HH:MM)', 'Total Hours (Dec)', 'Total Days Worked', 'Average Hours/Day']);

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekTotals = Array(7).fill(0);
  const dayOfWeekCounts = Array(7).fill(0);

  Object.entries(dailyHoursMap).forEach(([dateStr, min]) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y === activeYear && min > 0) {
      const dayIdx = new Date(y, m - 1, d).getDay();
      dayOfWeekTotals[dayIdx] += min;
      dayOfWeekCounts[dayIdx]++;
    }
  });

  dayOfWeekNames.forEach((dName, idx) => {
    const min = dayOfWeekTotals[idx];
    const cnt = dayOfWeekCounts[idx];
    const avg = cnt > 0 ? Number((min / 60 / cnt).toFixed(2)) : 0;
    heatmapData.push([dName, minutesToHHMM(min), minutesToDecimal(min), cnt, avg]);
  });

  const wsHeatmap = XLSX.utils.aoa_to_sheet(heatmapData);
  XLSX.utils.book_append_sheet(wb, wsHeatmap, 'Activity Heatmap Matrix');

  // ----------------------------------------------------
  // SHEET 3: Itemized Daily Billing Logs
  // ----------------------------------------------------
  const entriesHeaders = [
    'Date (YYYY-MM-DD)',
    'Day of Week',
    'Consultant',
    'Project Name',
    'Project Code',
    'Status',
    'Billable (HH:MM)',
    'Billable (Hours Dec)',
    'Non-Billable (HH:MM)',
    'Non-Billable (Hours Dec)',
    'Upskilling (HH:MM)',
    'Upskilling (Hours Dec)',
    'Leave (HH:MM)',
    'Total Working (HH:MM)',
    'Total Working (Hours Dec)',
    'Hourly Rate ($)',
    'Billed Revenue ($)',
    'Utilization (%)',
    'Remarks / Task Notes',
    'Created At',
  ];

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const entriesRows = sortedEntries.map((e) => {
    const totalW = e.billableMinutes + e.nonBillableMinutes + e.upskillingMinutes;
    const util = calculateUtilization(e.billableMinutes, totalW);
    const proj = projects.find((p) => p.id === e.projectId);
    const emp = employees.find((em) => em.id === e.employeeId);
    const rate = e.hourlyRate || proj?.hourlyRate || emp?.defaultHourlyRate || settings.defaultHourlyRate || 150;
    const amount = (e.billableMinutes / 60) * rate;

    let dayName = '';
    try {
      const [y, m, d] = e.date.split('-').map(Number);
      dayName = dayOfWeekNames[new Date(y, m - 1, d).getDay()];
    } catch {
      dayName = '';
    }

    return [
      e.date,
      dayName,
      e.employeeName || emp?.name || '',
      e.projectName || proj?.name || '',
      proj?.code || '',
      (e.status || 'submitted').toUpperCase(),
      minutesToHHMM(e.billableMinutes),
      minutesToDecimal(e.billableMinutes),
      minutesToHHMM(e.nonBillableMinutes),
      minutesToDecimal(e.nonBillableMinutes),
      minutesToHHMM(e.upskillingMinutes),
      minutesToDecimal(e.upskillingMinutes),
      minutesToHHMM(e.leaveMinutes),
      minutesToHHMM(totalW),
      minutesToDecimal(totalW),
      rate,
      amount,
      `${util}%`,
      e.remarks || '',
      e.createdAt || '',
    ];
  });

  const wsEntries = XLSX.utils.aoa_to_sheet([entriesHeaders, ...entriesRows]);
  XLSX.utils.book_append_sheet(wb, wsEntries, 'Daily Billing Entries');

  // ----------------------------------------------------
  // SHEET 4: Project Monthly Pivot Cross-Tab
  // ----------------------------------------------------
  const projectPivotData: (string | number)[][] = [
    ['MONTHLY BILLED HOURS BY PROJECT (HH:MM)'],
    ['Project Name', ...months, 'Full Year Total']
  ];

  projects.forEach((proj) => {
    const row: (string | number)[] = [proj.name];
    let projYearTotal = 0;

    for (let m = 0; m < 12; m++) {
      const mStr = (m + 1).toString().padStart(2, '0');
      const pMonthEntries = entries.filter((e) => e.projectId === proj.id && e.date.startsWith(`${activeYear}-${mStr}`));
      const pMonthBill = pMonthEntries.reduce((s, e) => s + e.billableMinutes, 0);
      projYearTotal += pMonthBill;
      row.push(pMonthBill > 0 ? minutesToHHMM(pMonthBill) : '00:00');
    }

    row.push(minutesToHHMM(projYearTotal));
    projectPivotData.push(row);
  });

  const wsProjectPivot = XLSX.utils.aoa_to_sheet(projectPivotData);
  XLSX.utils.book_append_sheet(wb, wsProjectPivot, 'Project Monthly Breakdown');

  // Generate binary XLSX and download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `billing-hours-tracker-report-${dateStr}.xlsx`);
}

/**
 * Universal Excel & CSV Reader
 * Handles .xlsx, .xls, .csv files from user uploads
 */
export async function parseExcelOrCsvFile(file: File): Promise<ParsedExcelResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, entries: [], newEmployees: [], newProjects: [], rowCount: 0, error: 'Empty workbook. No sheets found.' };
    }

    // Try to find the entries sheet (e.g. 'Daily Billing Entries', 'Entries', or the first sheet)
    let targetSheetName = workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      const lower = name.toLowerCase();
      if (lower.includes('entries') || lower.includes('logs') || lower.includes('billing') || lower.includes('timesheet') || lower.includes('daily')) {
        targetSheetName = name;
        break;
      }
    }

    const sheet = workbook.Sheets[targetSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, entries: [], newEmployees: [], newProjects: [], rowCount: 0, error: 'No data rows found in uploaded sheet.' };
    }

    const parsedEntries: BillingEntry[] = [];
    const discoveredEmployeesMap = new Map<string, Employee>();
    const discoveredProjectsMap = new Map<string, Project>();

    rawRows.forEach((row, idx) => {
      // Find keys flexibly
      const keys = Object.keys(row);
      const findKey = (searchTerms: string[]) => {
        return keys.find((k) => {
          const lower = k.toLowerCase().trim();
          return searchTerms.some((term) => lower.includes(term.toLowerCase()));
        });
      };

      const dateKey = findKey(['date', 'day']);
      const empKey = findKey(['employee', 'consultant', 'user', 'name', 'worker']);
      const projKey = findKey(['project', 'client', 'task']);
      const billKey = findKey(['billable', 'bill hrs', 'bill hours', 'billable minutes']);
      const nonBillKey = findKey(['non-billable', 'non bill', 'internal', 'admin']);
      const upskillKey = findKey(['upskilling', 'training', 'learning']);
      const leaveKey = findKey(['leave', 'vacation', 'time off', 'pto']);
      const remarksKey = findKey(['remarks', 'notes', 'description', 'comments']);
      const rateKey = findKey(['rate', 'hourly rate', 'price']);
      const statusKey = findKey(['status', 'state']);

      // Parse Date
      let dateVal = '';
      if (dateKey && row[dateKey]) {
        const rawDate = row[dateKey];
        if (rawDate instanceof Date) {
          const y = rawDate.getFullYear();
          const m = (rawDate.getMonth() + 1).toString().padStart(2, '0');
          const d = rawDate.getDate().toString().padStart(2, '0');
          dateVal = `${y}-${m}-${d}`;
        } else if (typeof rawDate === 'string') {
          const trimmed = rawDate.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            dateVal = trimmed;
          } else {
            // Attempt standard parse
            const dObj = new Date(trimmed);
            if (!isNaN(dObj.getTime())) {
              const y = dObj.getFullYear();
              const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
              const d = dObj.getDate().toString().padStart(2, '0');
              dateVal = `${y}-${m}-${d}`;
            }
          }
        } else if (typeof rawDate === 'number') {
          // Excel serial date number
          const parsed = XLSX.SSF.parse_date_code(rawDate);
          if (parsed) {
            const y = parsed.y;
            const m = parsed.m.toString().padStart(2, '0');
            const d = parsed.d.toString().padStart(2, '0');
            dateVal = `${y}-${m}-${d}`;
          }
        }
      }

      if (!dateVal) {
        // Fallback to today if not provided or valid
        dateVal = new Date().toISOString().split('T')[0];
      }

      // Parse Employee
      const employeeName = (empKey && row[empKey] ? String(row[empKey]).trim() : '') || 'Consultant';
      const employeeId = `emp-${employeeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!discoveredEmployeesMap.has(employeeId)) {
        discoveredEmployeesMap.set(employeeId, {
          id: employeeId,
          name: employeeName,
          role: 'Consultant',
          isDefault: discoveredEmployeesMap.size === 0,
          defaultHourlyRate: 150
        });
      }

      // Parse Project
      const projectName = (projKey && row[projKey] ? String(row[projKey]).trim() : '') || 'General Project';
      const projectId = `proj-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!discoveredProjectsMap.has(projectId)) {
        const palette = ['#0284c7', '#4f46e5', '#e11d48', '#0d9488', '#d97706', '#059669', '#7c3aed'];
        const color = palette[discoveredProjectsMap.size % palette.length];
        discoveredProjectsMap.set(projectId, {
          id: projectId,
          name: projectName,
          color,
          isActive: true,
          hourlyRate: 150
        });
      }

      // Parse Minutes Helpers
      const parseDurationValue = (raw: any): number => {
        if (raw === undefined || raw === null || raw === '') return 0;
        if (typeof raw === 'number') {
          // If value is between 0 and 24, assume decimal hours; if > 24, assume minutes
          return raw <= 24 ? Math.round(raw * 60) : Math.round(raw);
        }
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            const h = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 0;
            return Math.max(0, h * 60 + m);
          }
          const dec = parseFloat(trimmed);
          if (!isNaN(dec)) {
            return dec <= 24 ? Math.round(dec * 60) : Math.round(dec);
          }
        }
        return 0;
      };

      const billableMinutes = billKey ? parseDurationValue(row[billKey]) : 0;
      const nonBillableMinutes = nonBillKey ? parseDurationValue(row[nonBillKey]) : 0;
      const upskillingMinutes = upskillKey ? parseDurationValue(row[upskillKey]) : 0;
      const leaveMinutes = leaveKey ? parseDurationValue(row[leaveKey]) : 0;
      const remarks = (remarksKey && row[remarksKey] ? String(row[remarksKey]).trim() : '');
      const rate = rateKey && !isNaN(parseFloat(row[rateKey])) ? parseFloat(row[rateKey]) : undefined;
      const rawStatus = statusKey && row[statusKey] ? String(row[statusKey]).toLowerCase().trim() : 'submitted';
      const status = (['draft', 'submitted', 'approved', 'invoiced'].includes(rawStatus) ? rawStatus : 'submitted') as BillingEntry['status'];

      const nowISO = new Date().toISOString();

      parsedEntries.push({
        id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        date: dateVal,
        employeeId,
        employeeName,
        projectId,
        projectName,
        billableMinutes,
        nonBillableMinutes,
        upskillingMinutes,
        leaveMinutes,
        remarks,
        hourlyRate: rate,
        status,
        createdAt: nowISO,
        updatedAt: nowISO
      });
    });

    return {
      success: true,
      entries: parsedEntries,
      newEmployees: Array.from(discoveredEmployeesMap.values()),
      newProjects: Array.from(discoveredProjectsMap.values()),
      rowCount: parsedEntries.length
    };
  } catch (err) {
    return {
      success: false,
      entries: [],
      newEmployees: [],
      newProjects: [],
      rowCount: 0,
      error: `Failed to process spreadsheet file: ${(err as Error).message}`
    };
  }
}
