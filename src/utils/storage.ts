import { AppSettings, BillingEntry, Employee, Holiday, Project, TrainingRecord } from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'billing_tracker_entries_v1',
  EMPLOYEES: 'billing_tracker_employees_v1',
  PROJECTS: 'billing_tracker_projects_v1',
  HOLIDAYS: 'billing_tracker_holidays_v1',
  SETTINGS: 'billing_tracker_settings_v1',
  TRAININGS: 'billing_tracker_trainings_v1',
  INITIALIZED: 'billing_tracker_init_flag_v1',
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-mayur',
    name: 'Mayur',
    email: 'mayurkukreja4321@gmail.com',
    role: 'Aerospace Certification Engineer',
    isDefault: true,
    defaultHourlyRate: 150,
  },
  {
    id: 'emp-sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@aerotech.io',
    role: 'Structures Specialist',
    isDefault: false,
    defaultHourlyRate: 135,
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
    hourlyRate: 160,
    budgetHours: 400,
  },
  {
    id: 'proj-ci',
    name: 'Cabin Interior Certification',
    code: 'CI-204',
    client: 'AeroLux Interiors',
    color: '#4f46e5', // Indigo
    isActive: true,
    hourlyRate: 145,
    budgetHours: 250,
  },
  {
    id: 'proj-fl',
    name: 'Flammability',
    code: 'FL-305',
    client: 'Part 25 Compliance Lab',
    color: '#e11d48', // Rose
    isActive: true,
    hourlyRate: 175,
    budgetHours: 180,
  },
  {
    id: 'proj-hc',
    name: 'Helicopter Certification',
    code: 'HC-402',
    client: 'RotorCraft Systems',
    color: '#0d9488', // Teal
    isActive: true,
    hourlyRate: 155,
    budgetHours: 320,
  },
  {
    id: 'proj-tr',
    name: 'Training',
    code: 'TR-501',
    client: 'Internal',
    color: '#d97706', // Amber
    isActive: true,
    hourlyRate: 90,
    budgetHours: 80,
  },
  {
    id: 'proj-ip',
    name: 'Internal Project',
    code: 'IP-600',
    client: 'Aero Engineering',
    color: '#059669', // Emerald
    isActive: true,
    hourlyRate: 100,
    budgetHours: 150,
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
  defaultHourlyRate: 150,
  timeInputFormat: 'HH:MM',
  theme: 'light',
  enableLiveTimer: true,
  enableAuditAlerts: true,
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

export const DEFAULT_TRAININGS: TrainingRecord[] = [
  {
    id: 'trn-1',
    title: 'FAA Part 25 Airworthiness & STC Certification',
    category: 'Aeronautical Certification',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    mentorOrTrainer: 'Sarah Chen (Lead Structures DER)',
    mentorEmployeeId: 'emp-sarah',
    startDate: '2026-08-03',
    completionDate: '2026-08-21',
    daysTaken: 15,
    traineeMinutes: 2880, // 48h 00m
    otherTimeMinutes: 750, // 12h 30m mentor/trainer guidance and review
    status: 'completed',
    progressPercent: 100,
    learningObjectives: 'Master 14 CFR Part 25 structural substantiation, DER 8110-3 approvals, and Supplemental Type Certificate (STC) application workflows.',
    certificationEarned: 'FAA STC Compliance Practitioner',
    deliverables: 'Complete STC data package with certified mock conformity report for Skyline AC-101.',
    comments: [
      {
        id: 'tc-1',
        author: 'Sarah Chen (Lead Structures DER)',
        authorRole: 'trainer',
        date: '2026-08-07',
        content: 'Reviewed initial Section 25.561/562 crashworthiness load case calculations. Clean presentation and thorough margin of safety derivations.',
      },
      {
        id: 'tc-2',
        author: 'Mayur',
        authorRole: 'trainee',
        date: '2026-08-12',
        content: 'Completed advisory circular review AC 25-17A. Prepared FAA conformity checklist for the forward galley monument install.',
      },
      {
        id: 'tc-3',
        author: 'Sarah Chen (Lead Structures DER)',
        authorRole: 'trainer',
        date: '2026-08-21',
        content: 'Final STC mock audit completed with zero non-conformances. Highly commendable work. Ready for live project delegation!',
      },
    ],
    assignedWork: [
      {
        id: 'aw-1',
        title: 'Draft STC Project Specific Certification Plan (PSCP)',
        description: 'Prepare full PSCP document adhering to FAA Order 8110.4C guidelines.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-10',
        status: 'completed',
        priority: 'high',
        estimatedHours: 12,
        completedAt: '2026-08-09',
      },
      {
        id: 'aw-2',
        title: 'Review FAR 25.853 Flammability Test Witness Procedures',
        description: 'Verify 12-second and 60-second vertical burn specimen specifications.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-16',
        status: 'completed',
        priority: 'medium',
        estimatedHours: 8,
        completedAt: '2026-08-15',
      },
      {
        id: 'aw-3',
        title: 'Execute Mock Form 8110-3 Statement of Compliance',
        description: 'Finalize signoff document package for cabin interior alterations.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-20',
        status: 'completed',
        priority: 'high',
        estimatedHours: 10,
        completedAt: '2026-08-21',
      },
    ],
    syncWithTimesheet: true,
    createdAt: '2026-08-03T08:00:00.000Z',
    updatedAt: '2026-08-21T17:00:00.000Z',
  },
  {
    id: 'trn-2',
    title: 'DO-178C Airborne Software & Systems Safety Standards',
    category: 'Avionics & Software Safety',
    employeeId: 'emp-mayur',
    employeeName: 'Mayur',
    mentorOrTrainer: 'Dr. Gregory Vance (Principal Systems Safety Lead)',
    startDate: '2026-08-10',
    completionDate: '2026-08-28',
    daysTaken: 12,
    traineeMinutes: 2160, // 36h 00m
    otherTimeMinutes: 540, // 9h 00m trainer time
    status: 'in-progress',
    progressPercent: 75,
    learningObjectives: 'Understand software life cycle processes, Level A through D verification objectives, and tool qualification criteria.',
    deliverables: 'Software Accomplishment Summary (SAS) template and bi-directional requirement-to-code traceability matrix.',
    comments: [
      {
        id: 'tc-4',
        author: 'Dr. Gregory Vance (Principal Systems Safety Lead)',
        authorRole: 'trainer',
        date: '2026-08-14',
        content: 'Good grasp of structural coverage metrics (MC/DC). Make sure to separate derived requirements into dedicated tracking buckets.',
      },
      {
        id: 'tc-5',
        author: 'Mayur',
        authorRole: 'trainee',
        date: '2026-08-18',
        content: 'Drafted trace matrix linking High-Level Requirements (HLR) to Low-Level Requirements (LLR). Awaiting mentor feedback on tool qualification for compiler validation.',
      },
    ],
    assignedWork: [
      {
        id: 'aw-4',
        title: 'Build DO-178C Level B Traceability Matrix',
        description: 'Map 45 system requirements to code units and test cases in Jira/Polarion.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-25',
        status: 'in-progress',
        priority: 'high',
        estimatedHours: 14,
      },
      {
        id: 'aw-5',
        title: 'Audit Software Configuration Management Plan (SCMP)',
        description: 'Verify branch protection policies and baseline tagging procedures.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-27',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 6,
      },
      {
        id: 'aw-6',
        title: 'Complete DO-178C End of Module Certification Exam',
        description: 'Pass the 60-question FAA-recognized systems safety test.',
        assignedTo: 'Mayur',
        dueDate: '2026-08-28',
        status: 'pending',
        priority: 'high',
        estimatedHours: 3,
      },
    ],
    syncWithTimesheet: true,
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-22T14:30:00.000Z',
  },
  {
    id: 'trn-3',
    title: 'Advanced Non-Linear Finite Element Analysis (FEA)',
    category: 'CAD / FEA Structural',
    employeeId: 'emp-sarah',
    employeeName: 'Sarah Chen',
    mentorOrTrainer: 'Marcus Aurelius (Aerospace Chief Stress Engineer)',
    startDate: '2026-08-01',
    completionDate: '2026-08-22',
    daysTaken: 18,
    traineeMinutes: 3360, // 56h 00m
    otherTimeMinutes: 960, // 16h 00m other time
    status: 'under-review',
    progressPercent: 90,
    learningObjectives: 'Perform post-buckling, plasticity, and contact non-linear structural modeling for airframe fuselage frames in Nastran/Abaqus.',
    deliverables: 'Non-linear stress analysis dossier for RotorCraft HC-402 lateral bulkhead frames.',
    comments: [
      {
        id: 'tc-6',
        author: 'Marcus Aurelius (Aerospace Chief Stress Engineer)',
        authorRole: 'trainer',
        date: '2026-08-15',
        content: 'Mesh convergence check around rivet hole concentrations looks very rigorous. Verification of boundary condition fixity is complete.',
      },
      {
        id: 'tc-7',
        author: 'Sarah Chen',
        authorRole: 'trainee',
        date: '2026-08-20',
        content: 'Incorporated ultimate load factor 1.5 with thermal stress distribution. Buckling eigenvalue margin of safety is +0.18.',
      },
    ],
    assignedWork: [
      {
        id: 'aw-7',
        title: 'Run Nastran SOL 106 non-linear material run',
        description: 'Verify plastic deformation limits for Al 7075-T6 extruded stiffeners.',
        assignedTo: 'Sarah Chen',
        dueDate: '2026-08-18',
        status: 'completed',
        priority: 'high',
        estimatedHours: 16,
        completedAt: '2026-08-18',
      },
      {
        id: 'aw-8',
        title: 'Present Stress Dossier to Chief Technical Review Board',
        description: 'Deliver 30-minute structural substantiation presentation with Q&A.',
        assignedTo: 'Sarah Chen',
        dueDate: '2026-08-25',
        status: 'in-progress',
        priority: 'high',
        estimatedHours: 5,
      },
    ],
    syncWithTimesheet: true,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-20T16:00:00.000Z',
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
  trainings: TrainingRecord[];
} {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

  if (!isInitialized) {
    safeSetItem(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    safeSetItem(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS);
    safeSetItem(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
    safeSetItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    safeSetItem(STORAGE_KEYS.ENTRIES, SAMPLE_AEROSPACE_ENTRIES);
    safeSetItem(STORAGE_KEYS.TRAININGS, DEFAULT_TRAININGS);
    safeSetItem(STORAGE_KEYS.INITIALIZED, 'true');

    return {
      entries: SAMPLE_AEROSPACE_ENTRIES,
      employees: DEFAULT_EMPLOYEES,
      projects: DEFAULT_PROJECTS,
      holidays: DEFAULT_HOLIDAYS,
      settings: DEFAULT_SETTINGS,
      trainings: DEFAULT_TRAININGS,
    };
  }

  // Ensure default trainings if migrating from existing localStorage
  const existingTrainings = safeGetItem<TrainingRecord[] | null>(STORAGE_KEYS.TRAININGS, null);
  const trainings = existingTrainings && existingTrainings.length > 0 ? existingTrainings : DEFAULT_TRAININGS;
  if (!existingTrainings) {
    safeSetItem(STORAGE_KEYS.TRAININGS, DEFAULT_TRAININGS);
  }

  return {
    entries: safeGetItem<BillingEntry[]>(STORAGE_KEYS.ENTRIES, SAMPLE_AEROSPACE_ENTRIES),
    employees: safeGetItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES),
    projects: safeGetItem<Project[]>(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS),
    holidays: safeGetItem<Holiday[]>(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS),
    settings: safeGetItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    trainings,
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

export function saveTrainings(trainings: TrainingRecord[]): void {
  safeSetItem(STORAGE_KEYS.TRAININGS, trainings);
}

export function clearAllStorageData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.TRAININGS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  } catch (err) {
    console.error('Error clearing data:', err);
  }
}

