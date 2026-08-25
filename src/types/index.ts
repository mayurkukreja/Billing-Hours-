export type ProductivityRating = 'Low' | 'Moderate' | 'Good' | 'Excellent';

export type WorkingDaysPreset = 'mon-fri' | 'mon-sat' | 'custom';

export type ActiveTab = 'dashboard' | 'entries' | 'heatmap' | 'analytics' | 'weekly' | 'monthly' | 'reports' | 'settings';

export type TimeFormat = 'HH:MM' | 'decimal';

export type EntryStatus = 'draft' | 'submitted' | 'approved' | 'invoiced';

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  isDefault?: boolean;
  defaultHourlyRate?: number; // e.g. $125/hr
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  client?: string;
  color?: string; // e.g. blue, indigo, emerald, amber, purple
  isActive: boolean;
  hourlyRate?: number; // e.g. $150/hr billable rate
  budgetHours?: number; // e.g. 500 hours
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export interface BillingEntry {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  // Durations stored in minutes internally for precision
  billableMinutes: number;
  nonBillableMinutes: number;
  upskillingMinutes: number;
  leaveMinutes: number;
  remarks: string;
  taskCategory?: string; // e.g. 'STC Certification', 'FAA Compliance', 'CAD Engineering', 'Client Review', 'Admin'
  status?: EntryStatus; // 'draft' | 'submitted' | 'approved' | 'invoiced'
  hourlyRate?: number; // Cached rate at time of billing
  overtimeAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimer {
  isRunning: boolean;
  startTime: number | null; // timestamp
  elapsedSeconds: number;
  employeeId: string;
  projectId: string;
  category: 'billable' | 'non-billable' | 'upskilling';
  remarks: string;
}

export interface AppSettings {
  defaultEmployeeId: string;
  defaultDailyTargetMinutes: number; // e.g. 9 hours = 540 minutes
  workingDaysPreset: WorkingDaysPreset;
  customWorkingDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  currency: string;
  defaultHourlyRate: number;
  timeInputFormat: TimeFormat;
  theme: 'light' | 'dark' | 'system';
  enableLiveTimer: boolean;
  enableAuditAlerts: boolean;
}

export interface FilterState {
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  projectId: string;
  employeeId: string;
  status?: string;
  billingType: 'all' | 'billable' | 'non-billable' | 'upskilling' | 'leave';
  sortBy: 'date-desc' | 'date-asc' | 'hours-desc' | 'hours-asc' | 'utilization-desc';
}

export interface DaySummary {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  targetMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  upskillingMinutes: number;
  leaveMinutes: number;
  totalWorkingMinutes: number;
  utilizationPercent: number;
  entriesCount: number;
  estimatedRevenue?: number;
}

