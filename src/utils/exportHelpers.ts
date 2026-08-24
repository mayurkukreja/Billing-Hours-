import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import { calculateUtilization, minutesToDecimal, minutesToHHMM } from './timeCalculations';

export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  appName: string;
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
}

/**
 * Trigger browser file download for a string blob
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
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
 * Export full application state as JSON
 */
export function exportToJSON(
  entries: BillingEntry[],
  employees: Employee[],
  projects: Project[],
  holidays: Holiday[],
  settings: AppSettings
): void {
  const payload: ExportDataPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Billing Hours Tracker',
    entries,
    employees,
    projects,
    holidays,
    settings,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(jsonStr, `billing-hours-export-${timestamp}.json`, 'application/json');
}

/**
 * Export entries as CSV report
 */
export function exportToCSV(entries: BillingEntry[]): void {
  const headers = [
    'Date',
    'Employee',
    'Project',
    'Billable (HH:MM)',
    'Billable (Decimal)',
    'Non-Billable (HH:MM)',
    'Non-Billable (Decimal)',
    'Upskilling (HH:MM)',
    'Upskilling (Decimal)',
    'Leave (HH:MM)',
    'Total Working (HH:MM)',
    'Utilization (%)',
    'Remarks',
  ];

  // Sort by date descending
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const rows = sorted.map((e) => {
    const totalWorking = e.billableMinutes + e.nonBillableMinutes + e.upskillingMinutes;
    const util = calculateUtilization(e.billableMinutes, totalWorking);

    // Escape quotes and commas in remarks
    const escapedRemarks = `"${(e.remarks || '').replace(/"/g, '""')}"`;
    const escapedProject = `"${(e.projectName || '').replace(/"/g, '""')}"`;
    const escapedEmployee = `"${(e.employeeName || '').replace(/"/g, '""')}"`;

    return [
      e.date,
      escapedEmployee,
      escapedProject,
      minutesToHHMM(e.billableMinutes),
      minutesToDecimal(e.billableMinutes),
      minutesToHHMM(e.nonBillableMinutes),
      minutesToDecimal(e.nonBillableMinutes),
      minutesToHHMM(e.upskillingMinutes),
      minutesToDecimal(e.upskillingMinutes),
      minutesToHHMM(e.leaveMinutes),
      minutesToHHMM(totalWorking),
      `${util}%`,
      escapedRemarks,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `billing-entries-${timestamp}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Validates and parses imported JSON data
 */
export function parseImportJSON(jsonString: string): {
  success: boolean;
  error?: string;
  data?: ExportDataPayload;
} {
  try {
    const data = JSON.parse(jsonString) as ExportDataPayload;

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid JSON format. Expected an object.' };
    }

    if (!Array.isArray(data.entries)) {
      return { success: false, error: 'Malformed data: "entries" array is missing.' };
    }

    // Basic sanitize and validate entries
    const sanitizedEntries: BillingEntry[] = data.entries.map((e, idx) => ({
      id: e.id || `imported-${Date.now()}-${idx}`,
      date: e.date || new Date().toISOString().split('T')[0],
      employeeId: e.employeeId || 'emp-default',
      employeeName: e.employeeName || 'Employee',
      projectId: e.projectId || 'proj-default',
      projectName: e.projectName || 'Project',
      billableMinutes: Number(e.billableMinutes) || 0,
      nonBillableMinutes: Number(e.nonBillableMinutes) || 0,
      upskillingMinutes: Number(e.upskillingMinutes) || 0,
      leaveMinutes: Number(e.leaveMinutes) || 0,
      remarks: e.remarks || '',
      createdAt: e.createdAt || new Date().toISOString(),
      updatedAt: e.updatedAt || new Date().toISOString(),
    }));

    return {
      success: true,
      data: {
        version: data.version || 1,
        exportedAt: data.exportedAt || new Date().toISOString(),
        appName: data.appName || 'Billing Hours Tracker',
        entries: sanitizedEntries,
        employees: Array.isArray(data.employees) ? data.employees : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        holidays: Array.isArray(data.holidays) ? data.holidays : [],
        settings: data.settings || ({} as AppSettings),
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to parse file: ${(err as Error).message}` };
  }
}
