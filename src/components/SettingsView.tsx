import React, { useState, useRef } from 'react';
import { AppSettings, Employee, Holiday, Project, WorkingDaysPreset } from '../types';
import { minutesToHHMM, minutesToReadable, parseTimeToMinutes } from '../utils/timeCalculations';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCode,
  FileSpreadsheet,
  Moon,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenEmployeeModal: (employee?: Employee | null) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onOpenProjectModal: (project?: Project | null) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenHolidayModal: (holiday?: Holiday | null) => void;
  onDeleteHoliday: (holidayId: string) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (file: File) => void;
  onResetToDemoData: () => void;
  onClearAllData: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  employees,
  projects,
  holidays,
  onUpdateSettings,
  onOpenEmployeeModal,
  onDeleteEmployee,
  onOpenProjectModal,
  onDeleteProject,
  onOpenHolidayModal,
  onDeleteHoliday,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onResetToDemoData,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dailyHoursInput, setDailyHoursInput] = useState(minutesToHHMM(settings.defaultDailyTargetMinutes));
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveWorkingHours = () => {
    const minutes = parseTimeToMinutes(dailyHoursInput);
    if (minutes > 0) {
      onUpdateSettings({
        ...settings,
        defaultDailyTargetMinutes: minutes,
      });
      triggerSavedNotice();
    }
  };

  const handleWorkingDaysPresetChange = (preset: WorkingDaysPreset) => {
    let customDays = settings.customWorkingDays;
    if (preset === 'mon-fri') {
      customDays = [1, 2, 3, 4, 5];
    } else if (preset === 'mon-sat') {
      customDays = [1, 2, 3, 4, 5, 6];
    }
    onUpdateSettings({
      ...settings,
      workingDaysPreset: preset,
      customWorkingDays: customDays,
    });
    triggerSavedNotice();
  };

  const handleToggleCustomDay = (dayIndex: number) => {
    const isCurrentlySelected = settings.customWorkingDays.includes(dayIndex);
    const updated = isCurrentlySelected
      ? settings.customWorkingDays.filter((d) => d !== dayIndex)
      : [...settings.customWorkingDays, dayIndex].sort();

    onUpdateSettings({
      ...settings,
      workingDaysPreset: 'custom',
      customWorkingDays: updated,
    });
    triggerSavedNotice();
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    onUpdateSettings({
      ...settings,
      theme,
    });
  };

  const triggerSavedNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Saved Banner Toast */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved to LocalStorage</span>
        </div>
      )}

      {/* Page Header */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              System Settings & Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Configure daily targets, working schedules, public holidays, employees, and data backup
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            id="theme-light-btn"
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-tight flex items-center gap-1.5 transition-colors ${
              settings.theme === 'light'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            id="theme-dark-btn"
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-tight flex items-center gap-1.5 transition-colors ${
              settings.theme === 'dark'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Section 1: Working Schedule & Target Hours */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Working Schedule & Daily Targets
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Working Target */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
            <label htmlFor="daily-target-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Default Daily Target Hours (HH:MM or Decimal)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="daily-target-input"
                type="text"
                value={dailyHoursInput}
                onChange={(e) => setDailyHoursInput(e.target.value)}
                placeholder="09:00"
                className="px-3 py-2 text-base font-black font-mono-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                id="save-daily-target-btn"
                type="button"
                onClick={handleSaveWorkingHours}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-tight rounded-lg transition-colors"
              >
                Update Target
              </button>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Current: <strong className="font-black text-slate-900 dark:text-slate-100">{minutesToHHMM(settings.defaultDailyTargetMinutes)}</strong> ({minutesToReadable(settings.defaultDailyTargetMinutes)} per work day).
            </p>
          </div>

          {/* Working Days Configuration */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Standard Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleWorkingDaysPresetChange('mon-fri')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.workingDaysPreset === 'mon-fri'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                Monday – Friday (5 Days)
              </button>
              <button
                type="button"
                onClick={() => handleWorkingDaysPresetChange('mon-sat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.workingDaysPreset === 'mon-sat'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                Monday – Saturday (6 Days)
              </button>
              <button
                type="button"
                onClick={() => handleWorkingDaysPresetChange('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.workingDaysPreset === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                Custom Schedule
              </button>
            </div>

            {/* Custom Day Checkboxes */}
            <div className="pt-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">
                Active Days of the Week:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((name, idx) => {
                  const isChecked = settings.customWorkingDays.includes(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleToggleCustomDay(idx)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600'
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Employee Management */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Employee & Consultant Profiles
              </h4>
              <p className="text-xs text-slate-500">
                Manage individuals submitting daily billing logs
              </p>
            </div>
          </div>
          <button
            id="add-employee-btn"
            type="button"
            onClick={() => onOpenEmployeeModal(null)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {emp.name}
                  </span>
                  {emp.isDefault && (
                    <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {emp.role || 'Certification Engineer'}
                </div>
                {emp.email && (
                  <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    {emp.email}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenEmployeeModal(emp)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700"
                  title="Edit employee"
                >
                  Edit
                </button>
                {employees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteEmployee(emp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete employee"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Project Management */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Project Catalog
              </h4>
              <p className="text-xs text-slate-500">
                Aerospace certification and customer project codes
              </p>
            </div>
          </div>
          <button
            id="add-project-btn"
            type="button"
            onClick={() => onOpenProjectModal(null)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color || '#0284c7' }}
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {proj.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {proj.code ? `[${proj.code}] ` : ''}
                    {proj.client || ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenProjectModal(proj)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-xs font-medium"
                >
                  Edit
                </button>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteProject(proj.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Public Holiday Management */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Public Holidays (Target Exclusions)
              </h4>
              <p className="text-xs text-slate-500">
                Holidays automatically reduce monthly target working hours
              </p>
            </div>
          </div>
          <button
            id="add-holiday-btn"
            type="button"
            onClick={() => onOpenHolidayModal(null)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Holiday</span>
          </button>
        </div>

        {holidays.length === 0 ? (
          <p className="text-xs text-slate-400 py-2 italic">
            No public holidays configured. Add holidays to adjust target hours.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-purple-950 dark:text-purple-200">
                    {h.name}
                  </div>
                  <div className="text-[11px] font-mono-nums text-purple-700 dark:text-purple-400">
                    {h.date}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenHolidayModal(h)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(h.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Data Storage, Import & Export */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Data Management & Backup
            </h4>
            <p className="text-xs text-slate-500">
              Export data for reporting or backup, import previously saved snapshots, or reset
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Export JSON */}
          <button
            id="export-json-btn"
            type="button"
            onClick={onExportJSON}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left group"
          >
            <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Export JSON Backup
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Complete state backup with settings & catalog
            </div>
          </button>

          {/* Export CSV */}
          <button
            id="export-csv-settings-btn"
            type="button"
            onClick={onExportCSV}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors text-left group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Export CSV Report
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Detailed spreadsheet for Excel / Sheets
            </div>
          </button>

          {/* Import JSON */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id="import-json-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left group"
            >
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Import JSON Data
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Restore previously exported JSON file
              </div>
            </button>
          </div>

          {/* Load Sample Demo Data */}
          <button
            id="load-demo-data-btn"
            type="button"
            onClick={onResetToDemoData}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-500 dark:hover:border-amber-400 transition-colors text-left group"
          >
            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Load Aerospace Demo
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Seed sample certification logs & metrics
            </div>
          </button>
        </div>

        {/* Danger Zone: Clear Data */}
        <div className="mt-6 pt-4 border-t border-red-100 dark:border-red-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/50 dark:bg-red-950/20 p-4 rounded-xl border">
          <div>
            <div className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone: Wipe LocalStorage
            </div>
            <div className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">
              Permanently delete all billing logs, custom projects, and settings from browser storage.
            </div>
          </div>
          <button
            id="clear-all-data-btn"
            type="button"
            onClick={onClearAllData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
