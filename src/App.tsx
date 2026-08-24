import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, AppSettings, BillingEntry, Employee, Holiday, Project } from './types';
import {
  clearAllStorageData,
  DEFAULT_EMPLOYEES,
  DEFAULT_HOLIDAYS,
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
  initializeStorage,
  SAMPLE_AEROSPACE_ENTRIES,
  saveEmployees,
  saveEntries,
  saveHolidays,
  saveProjects,
  saveSettings,
} from './utils/storage';
import { exportToCSV, exportToJSON, parseImportJSON } from './utils/exportHelpers';
import { calculateMonthWorkingDays } from './utils/workingDays';
import { getTodayDateString, minutesToHHMM } from './utils/timeCalculations';

import { Navbar } from './components/Navbar';
import { DashboardCards } from './components/DashboardCards';
import { DailyEntriesTable } from './components/DailyEntriesTable';
import { WeeklySummary } from './components/WeeklySummary';
import { MonthlySummary } from './components/MonthlySummary';
import { SettingsView } from './components/SettingsView';

import { DailyEntryModal } from './components/DailyEntryModal';
import { ProjectModal } from './components/ProjectModal';
import { EmployeeModal } from './components/EmployeeModal';
import { HolidayModal } from './components/HolidayModal';
import { ConfirmationModal } from './components/ConfirmationModal';

export default function App() {
  // Load state from LocalStorage on mount
  const initialData = useMemo(() => initializeStorage(), []);

  const [entries, setEntries] = useState<BillingEntry[]>(initialData.entries);
  const [employees, setEmployees] = useState<Employee[]>(initialData.employees);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [holidays, setHolidays] = useState<Holiday[]>(initialData.holidays);
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);

  // Active View Tab (with URL Hash sync for 100% static GitHub Pages support)
  const getInitialTab = (): ActiveTab => {
    const hash = window.location.hash.replace('#', '') as ActiveTab;
    if (['dashboard', 'entries', 'weekly', 'monthly', 'settings'].includes(hash)) {
      return hash;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [activeEmployeeFilter, setActiveEmployeeFilter] = useState<string>('all');

  // Modal States
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<BillingEntry | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<Holiday | null>(null);

  // Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync tab with URL Hash
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveTab;
      if (['dashboard', 'entries', 'weekly', 'monthly', 'settings'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Theme synchronization with html element
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveHolidays(holidays);
  }, [holidays]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Filter entries by active global employee switcher if not "all"
  const employeeFilteredEntries = useMemo(() => {
    if (activeEmployeeFilter === 'all') return entries;
    return entries.filter((e) => e.employeeId === activeEmployeeFilter);
  }, [entries, activeEmployeeFilter]);

  // Month target calculation for the executive dashboard
  const currentMonthCalc = useMemo(() => {
    const now = new Date();
    return calculateMonthWorkingDays(now.getFullYear(), now.getMonth(), settings, holidays);
  }, [settings, holidays]);

  // Toggle Theme handler
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Quick Add Action
  const handleQuickAddToday = () => {
    setEntryToEdit(null);
    setPrefillDate(getTodayDateString());
    setIsEntryModalOpen(true);
  };

  // Save Entry (Create / Update)
  const handleSaveEntry = (entryData: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const nowISO = new Date().toISOString();

    if (entryData.id) {
      // Update
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryData.id
            ? {
                ...e,
                ...entryData,
                updatedAt: nowISO,
              }
            : e
        )
      );
      showToast('Daily entry updated successfully');
    } else {
      // Create new
      const newEntry: BillingEntry = {
        ...entryData,
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      setEntries((prev) => [newEntry, ...prev]);
      showToast('Daily billing entry logged');
    }
  };

  // Duplicate entry
  const handleDuplicateEntry = (entry: BillingEntry) => {
    const nowISO = new Date().toISOString();
    const duplicated: BillingEntry = {
      ...entry,
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: getTodayDateString(),
      remarks: `${entry.remarks ? entry.remarks + ' ' : ''}(Copy)`,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    setEntries((prev) => [duplicated, ...prev]);
    showToast('Entry duplicated for today');
  };

  // Delete Entry with confirmation
  const handleDeleteEntry = (entry: BillingEntry) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Billing Entry',
      message: `Are you sure you want to delete the entry for ${entry.projectName} on ${entry.date}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Entry deleted');
      },
    });
  };

  // Save Project
  const handleSaveProject = (projData: Omit<Project, 'id'> & { id?: string }) => {
    if (projData.id) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projData.id ? { ...p, ...projData } : p))
      );
      showToast('Project updated');
    } else {
      const newProj: Project = {
        ...projData,
        id: `proj-${Date.now()}`,
      };
      setProjects((prev) => [...prev, newProj]);
      showToast('New project created');
    }
  };

  // Delete Project
  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${proj?.name}"? Existing entries will keep their history.`,
      variant: 'danger',
      onConfirm: () => {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Project removed');
      },
    });
  };

  // Save Employee
  const handleSaveEmployee = (empData: Omit<Employee, 'id'> & { id?: string }) => {
    if (empData.id) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === empData.id ? { ...e, ...empData } : e))
      );
      showToast('Employee profile updated');
    } else {
      const newEmp: Employee = {
        ...empData,
        id: `emp-${Date.now()}`,
      };
      setEmployees((prev) => [...prev, newEmp]);
      showToast('New employee added');
    }
  };

  // Delete Employee
  const handleDeleteEmployee = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Employee',
      message: `Are you sure you want to delete profile for "${emp?.name}"?`,
      variant: 'danger',
      onConfirm: () => {
        setEmployees((prev) => prev.filter((e) => e.id !== empId));
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Employee profile removed');
      },
    });
  };

  // Save Holiday
  const handleSaveHoliday = (holidayData: Omit<Holiday, 'id'> & { id?: string }) => {
    if (holidayData.id) {
      setHolidays((prev) =>
        prev.map((h) => (h.id === holidayData.id ? { ...h, ...holidayData } : h))
      );
      showToast('Holiday updated');
    } else {
      const newHol: Holiday = {
        ...holidayData,
        id: `hol-${Date.now()}`,
      };
      setHolidays((prev) => [...prev, newHol]);
      showToast('Public holiday added');
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = (holidayId: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== holidayId));
    showToast('Holiday removed');
  };

  // Export JSON
  const handleExportJSON = () => {
    exportToJSON(entries, employees, projects, holidays, settings);
    showToast('JSON backup downloaded');
  };

  // Export CSV
  const handleExportCSV = () => {
    exportToCSV(employeeFilteredEntries);
    showToast('CSV report downloaded');
  };

  // Import JSON
  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseImportJSON(content);

      if (!parsed.success || !parsed.data) {
        alert(parsed.error || 'Failed to parse JSON file.');
        return;
      }

      setConfirmModalConfig({
        isOpen: true,
        title: 'Restore JSON Data',
        message: `Import found ${parsed.data.entries.length} billing entries, ${parsed.data.projects.length} projects, and ${parsed.data.employees.length} employees. Would you like to restore this data into your browser storage?`,
        variant: 'primary',
        onConfirm: () => {
          if (parsed.data!.entries.length > 0) setEntries(parsed.data!.entries);
          if (parsed.data!.employees.length > 0) setEmployees(parsed.data!.employees);
          if (parsed.data!.projects.length > 0) setProjects(parsed.data!.projects);
          if (parsed.data!.holidays.length > 0) setHolidays(parsed.data!.holidays);
          if (parsed.data!.settings) setSettings(parsed.data!.settings);

          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          showToast('Data successfully imported and restored');
        },
      });
    };
    reader.readAsText(file);
  };

  // Reset to Demo Data
  const handleResetToDemoData = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Load Aerospace Demo Dataset',
      message: 'This will seed sample aerospace engineering billing entries (Aircraft Certification, Flammability, etc.) for Mayur and default projects. Proceed?',
      variant: 'warning',
      onConfirm: () => {
        setEntries(SAMPLE_AEROSPACE_ENTRIES);
        setEmployees(DEFAULT_EMPLOYEES);
        setProjects(DEFAULT_PROJECTS);
        setHolidays(DEFAULT_HOLIDAYS);
        setSettings(DEFAULT_SETTINGS);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Sample aerospace dataset loaded');
      },
    });
  };

  // Wipe All Data
  const handleClearAllData = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Permanently Clear All Data',
      message: 'Are you sure you want to delete all entries, employees, projects, and settings from browser LocalStorage? This cannot be undone.',
      variant: 'danger',
      onConfirm: () => {
        clearAllStorageData();
        setEntries([]);
        setEmployees(DEFAULT_EMPLOYEES);
        setProjects(DEFAULT_PROJECTS);
        setHolidays([]);
        setSettings(DEFAULT_SETTINGS);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('LocalStorage cleared completely');
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        employees={employees}
        selectedEmployeeId={activeEmployeeFilter}
        onSelectEmployee={setActiveEmployeeFilter}
        onQuickAdd={handleQuickAddToday}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            id="app-toast-notification"
            className="fixed top-20 right-6 z-50 p-3.5 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <DashboardCards
              entries={employeeFilteredEntries}
              settings={settings}
              periodLabel="Executive Monthly Overview"
              targetMinutesForPeriod={currentMonthCalc.monthlyTargetMinutes}
              onQuickAddToday={handleQuickAddToday}
            />

            {/* Quick table of recent logs directly below dashboard */}
            <DailyEntriesTable
              entries={employeeFilteredEntries}
              employees={employees}
              projects={projects}
              onAddNewEntry={handleQuickAddToday}
              onEditEntry={(entry) => {
                setEntryToEdit(entry);
                setIsEntryModalOpen(true);
              }}
              onDeleteEntry={handleDeleteEntry}
              onDuplicateEntry={handleDuplicateEntry}
              onExportCSV={handleExportCSV}
            />
          </div>
        )}

        {/* Tab 2: Daily Entries View */}
        {activeTab === 'entries' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <DailyEntriesTable
              entries={employeeFilteredEntries}
              employees={employees}
              projects={projects}
              onAddNewEntry={handleQuickAddToday}
              onEditEntry={(entry) => {
                setEntryToEdit(entry);
                setIsEntryModalOpen(true);
              }}
              onDeleteEntry={handleDeleteEntry}
              onDuplicateEntry={handleDuplicateEntry}
              onExportCSV={handleExportCSV}
            />
          </div>
        )}

        {/* Tab 3: Weekly Summary */}
        {activeTab === 'weekly' && (
          <div className="animate-in fade-in duration-200">
            <WeeklySummary
              entries={employeeFilteredEntries}
              settings={settings}
              holidays={holidays}
              projects={projects}
            />
          </div>
        )}

        {/* Tab 4: Monthly Summary */}
        {activeTab === 'monthly' && (
          <div className="animate-in fade-in duration-200">
            <MonthlySummary
              entries={employeeFilteredEntries}
              settings={settings}
              holidays={holidays}
              projects={projects}
            />
          </div>
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-200">
            <SettingsView
              settings={settings}
              employees={employees}
              projects={projects}
              holidays={holidays}
              onUpdateSettings={setSettings}
              onOpenEmployeeModal={(emp) => {
                setEmployeeToEdit(emp || null);
                setIsEmployeeModalOpen(true);
              }}
              onDeleteEmployee={handleDeleteEmployee}
              onOpenProjectModal={(proj) => {
                setProjectToEdit(proj || null);
                setIsProjectModalOpen(true);
              }}
              onDeleteProject={handleDeleteProject}
              onOpenHolidayModal={(hol) => {
                setHolidayToEdit(hol || null);
                setIsHolidayModalOpen(true);
              }}
              onDeleteHoliday={handleDeleteHoliday}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
              onImportJSON={handleImportJSON}
              onResetToDemoData={handleResetToDemoData}
              onClearAllData={handleClearAllData}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Billing Hours Tracker
            </span>{' '}
            — 100% Client-Side Static App optimized for GitHub Pages.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTabChange('settings')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Configure Target Hours ({minutesToHHMM(settings.defaultDailyTargetMinutes)})
            </button>
            <span>•</span>
            <button
              onClick={handleExportCSV}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DailyEntryModal
        isOpen={isEntryModalOpen}
        entryToEdit={entryToEdit}
        employees={employees}
        projects={projects}
        settings={settings}
        prefillDate={prefillDate}
        onSave={handleSaveEntry}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEntryToEdit(null);
        }}
        onOpenNewProjectModal={() => {
          setProjectToEdit(null);
          setIsProjectModalOpen(true);
        }}
        onOpenNewEmployeeModal={() => {
          setEmployeeToEdit(null);
          setIsEmployeeModalOpen(true);
        }}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        project={projectToEdit}
        onSave={handleSaveProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
      />

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        employee={employeeToEdit}
        onSave={handleSaveEmployee}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEmployeeToEdit(null);
        }}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        holiday={holidayToEdit}
        onSave={handleSaveHoliday}
        onClose={() => {
          setIsHolidayModalOpen(false);
          setHolidayToEdit(null);
        }}
      />

      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        variant={confirmModalConfig.variant}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
