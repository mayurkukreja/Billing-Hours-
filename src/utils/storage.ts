import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'billing_tracker_entries_v1',
  EMPLOYEES: 'billing_tracker_employees_v1',
  PROJECTS: 'billing_tracker_projects_v1',
  HOLIDAYS: 'billing_tracker_holidays_v1',
  SETTINGS: 'billing_tracker_settings_v1',
  INITIALIZED: 'billing_tracker_init_flag_v1',
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-mayur',
    name: 'Mayur',
    email: 'mayurkukreja4321@gmail.com',
    role: 'Aerospace Certification Engineer',
    isDefault: true,
  },
  {
    id: 'emp-sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@aerotech.io',
    role: 'Structures Specialist',
    isDefault: false,
  },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-ac',
    name: 'Aircraft Certification',
    code: 'AC-101',
    client: 'Skyline Aerospace',
    color: '#0284c7', // Sky blue
    isActive: true,
  },
  {
    id: 'proj-ci',
    name: 'Cabin Interior Certification',
    code: 'CI-204',
    client: 'AeroLux Interiors',
    color: '#4f46e5', // Indigo
    isActive: true,
  },
  {
    id: 'proj-fl',
    name: 'Flammability',
    code: 'FL-305',
    client: 'Part 25 Compliance Lab',
    color: '#e11d48', // Rose
    isActive: true,
  },
  {
    id: 'proj-hc',
    name: 'Helicopter Certification',
    code: 'HC-402',
    client: 'RotorCraft Systems',
    color: '#0d9488', // Teal
    isActive: true,
  },
  {
    id: 'proj-tr',
    name: 'Training',
    code: 'TR-501',
    client: 'Internal',
    color: '#d97706', // Amber
    isActive: true,
  },
  {
    id: 'proj-ip',
    name: 'Internal Project',
    code: 'IP-600',
    client: 'Aero Engineering',
    color: '#059669', // Emerald
    isActive: true,
  },
];

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 'hol-1', name: 'New Year Day', date: '2026-01-01' },
  { id: 'hol-2', name: 'Memorial Day', date: '2026-05-25' },
  { id: 'hol-3', name: 'Independence Day', date: '2026-07-04' },
  { id: 'hol-4', name: 'Labor Day', date: '2026-09-07' },
  { id: 'hol-5', name: 'Thanksgiving', date: '2026-11-26' },
  { id: 'hol-6', name: 'Christmas Day', date: '2026-12-25' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  defaultEmployeeId: 'emp-mayur',
  defaultDailyTargetMinutes: 540, // 9 hours
  workingDaysPreset: 'mon-fri',
  customWorkingDays: [1, 2, 3, 4, 5],
  currency: 'USD',
  timeInputFormat: 'HH:MM',
  theme: 'light',
};

export const SAMPLE_AEROSPACE_ENTRIES: BillingEntry[] = [
  {
    id: 'entry-1',
    date: '2026-08-24',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-ac',
    projectName: 'Aircraft Certification',
    billableMinutes: 390, // 06:30
    nonBillableMinutes: 90, // 01:30
    upskillingMinutes: 60, // 01:00
    leaveMinutes: 0,
    remarks: 'STC documentation & compliance checklist review',
    createdAt: '2026-08-24T08:00:00.000Z',
    updatedAt: '2026-08-24T17:30:00.000Z',
  },
  {
    id: 'entry-2',
    date: '2026-08-21',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-fl',
    projectName: 'Flammability',
    billableMinutes: 420, // 07:00
    nonBillableMinutes: 60, // 01:00
    upskillingMinutes: 60, // 01:00
    leaveMinutes: 0,
    remarks: 'FAR 25.853 test witnessing report preparation',
    createdAt: '2026-08-21T08:30:00.000Z',
    updatedAt: '2026-08-21T17:00:00.000Z',
  },
  {
    id: 'entry-3',
    date: '2026-08-20',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-ci',
    projectName: 'Cabin Interior Certification',
    billableMinutes: 360, // 06:00
    nonBillableMinutes: 120, // 02:00
    upskillingMinutes: 60, // 01:00
    leaveMinutes: 0,
    remarks: 'Monument load path structural evaluation',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T17:00:00.000Z',
  },
  {
    id: 'entry-4',
    date: '2026-08-19',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-hc',
    projectName: 'Helicopter Certification',
    billableMinutes: 450, // 07:30
    nonBillableMinutes: 60, // 01:00
    upskillingMinutes: 30, // 00:30
    leaveMinutes: 0,
    remarks: 'Rotorcraft flight manual supplement drafting',
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-08-19T17:00:00.000Z',
  },
  {
    id: 'entry-5',
    date: '2026-08-18',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-ac',
    projectName: 'Aircraft Certification',
    billableMinutes: 480, // 08:00
    nonBillableMinutes: 60, // 01:00
    upskillingMinutes: 0,
    leaveMinutes: 0,
    remarks: 'FAA conformity inspection preparation',
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T17:00:00.000Z',
  },
  {
    id: 'entry-6',
    date: '2026-08-17',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-tr',
    projectName: 'Training',
    billableMinutes: 180, // 03:00
    nonBillableMinutes: 60, // 01:00
    upskillingMinutes: 300, // 05:00
    leaveMinutes: 0,
    remarks: 'DO-178C Airborne Software Certification Seminar',
    createdAt: '2026-08-17T08:00:00.000Z',
    updatedAt: '2026-08-17T17:00:00.000Z',
  },
  {
    id: 'entry-7',
    date: '2026-08-14',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    projectId: 'proj-ip',
    projectName: 'Internal Project',
    billableMinutes: 0,
    nonBillableMinutes: 0,
    upskillingMinutes: 0,
    leaveMinutes: 540, // Full day leave (9h)
    remarks: 'Approved Annual Leave - Personal day',
    createdAt: '2026-08-14T08:00:00.000Z',
    updatedAt: '2026-08-14T08:00:00.000Z',
  },
];

// Helper to safely get from localStorage
function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

// Helper to safely set in localStorage
function safeSetItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

/**
 * Initializes LocalStorage on first run with clean seed data
 */
export function initializeStorage(): {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
} {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

  if (!isInitialized) {
    safeSetItem(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    safeSetItem(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS);
    safeSetItem(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
    safeSetItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    safeSetItem(STORAGE_KEYS.ENTRIES, SAMPLE_AEROSPACE_ENTRIES);
    safeSetItem(STORAGE_KEYS.INITIALIZED, 'true');

    return {
      entries: SAMPLE_AEROSPACE_ENTRIES,
      employees: DEFAULT_EMPLOYEES,
      projects: DEFAULT_PROJECTS,
      holidays: DEFAULT_HOLIDAYS,
      settings: DEFAULT_SETTINGS,
    };
  }

  return {
    entries: safeGetItem<BillingEntry[]>(STORAGE_KEYS.ENTRIES, SAMPLE_AEROSPACE_ENTRIES),
    employees: safeGetItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES),
    projects: safeGetItem<Project[]>(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS),
    holidays: safeGetItem<Holiday[]>(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS),
    settings: safeGetItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  };
}

export function saveEntries(entries: BillingEntry[]): void {
  safeSetItem(STORAGE_KEYS.ENTRIES, entries);
}

export function saveEmployees(employees: Employee[]): void {
  safeSetItem(STORAGE_KEYS.EMPLOYEES, employees);
}

export function saveProjects(projects: Project[]): void {
  safeSetItem(STORAGE_KEYS.PROJECTS, projects);
}

export function saveHolidays(holidays: Holiday[]): void {
  safeSetItem(STORAGE_KEYS.HOLIDAYS, holidays);
}

export function saveSettings(settings: AppSettings): void {
  safeSetItem(STORAGE_KEYS.SETTINGS, settings);
}

export function clearAllStorageData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  } catch (err) {
    console.error('Error clearing data:', err);
  }
}
