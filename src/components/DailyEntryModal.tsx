import React, { useState, useEffect } from 'react';
import { AppSettings, BillingEntry, Employee, Project } from '../types';
import {
  calculateUtilization,
  getProductivityBadgeProps,
  getProductivityRating,
  getTodayDateString,
  minutesToHHMM,
  minutesToReadable,
  parseTimeToMinutes,
} from '../utils/timeCalculations';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Sparkles,
  User,
  X,
} from 'lucide-react';

interface DailyEntryModalProps {
  isOpen: boolean;
  entryToEdit?: BillingEntry | null;
  employees: Employee[];
  projects: Project[];
  settings: AppSettings;
  prefillDate?: string;
  onSave: (entry: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
  onOpenNewProjectModal: () => void;
  onOpenNewEmployeeModal: () => void;
}

export const DailyEntryModal: React.FC<DailyEntryModalProps> = ({
  isOpen,
  entryToEdit,
  employees,
  projects,
  settings,
  prefillDate,
  onSave,
  onClose,
  onOpenNewProjectModal,
  onOpenNewEmployeeModal,
}) => {
  const [date, setDate] = useState(getTodayDateString());
  const [employeeId, setEmployeeId] = useState(settings.defaultEmployeeId || '');
  const [projectId, setProjectId] = useState('');
  
  // Time inputs stored as strings to allow typing HH:MM or decimals seamlessly
  const [billableInput, setBillableInput] = useState('06:30');
  const [nonBillableInput, setNonBillableInput] = useState('01:30');
  const [upskillingInput, setUpskillingInput] = useState('01:00');
  const [leaveInput, setLeaveInput] = useState('00:00');
  const [remarks, setRemarks] = useState('');
  
  const [overtimeConfirmed, setOvertimeConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate when opening
  useEffect(() => {
    if (!isOpen) return;

    if (entryToEdit) {
      setDate(entryToEdit.date);
      setEmployeeId(entryToEdit.employeeId);
      setProjectId(entryToEdit.projectId);
      setBillableInput(minutesToHHMM(entryToEdit.billableMinutes));
      setNonBillableInput(minutesToHHMM(entryToEdit.nonBillableMinutes));
      setUpskillingInput(minutesToHHMM(entryToEdit.upskillingMinutes));
      setLeaveInput(minutesToHHMM(entryToEdit.leaveMinutes));
      setRemarks(entryToEdit.remarks || '');
      setOvertimeConfirmed(!!entryToEdit.overtimeAcknowledged);
    } else {
      setDate(prefillDate || getTodayDateString());
      // Find default employee
      const defaultEmp = employees.find((e) => e.isDefault) || employees[0];
      setEmployeeId(defaultEmp ? defaultEmp.id : '');

      // Pick first active project
      const activeProjects = projects.filter((p) => p.isActive);
      setProjectId(activeProjects.length > 0 ? activeProjects[0].id : '');

      setBillableInput('06:30');
      setNonBillableInput('01:30');
      setUpskillingInput('01:00');
      setLeaveInput('00:00');
      setRemarks('');
      setOvertimeConfirmed(false);
    }
    setErrors({});
  }, [isOpen, entryToEdit, prefillDate, employees, projects, settings]);

  if (!isOpen) return null;

  // Real-time parsed minutes
  const billableMinutes = parseTimeToMinutes(billableInput);
  const nonBillableMinutes = parseTimeToMinutes(nonBillableInput);
  const upskillingMinutes = parseTimeToMinutes(upskillingInput);
  const leaveMinutes = parseTimeToMinutes(leaveInput);

  const totalWorkingMinutes = billableMinutes + nonBillableMinutes + upskillingMinutes;
  const utilizationPercent = calculateUtilization(billableMinutes, totalWorkingMinutes);
  const productivityRating = getProductivityRating(utilizationPercent);
  const badgeProps = getProductivityBadgeProps(productivityRating);

  const targetMinutes = settings.defaultDailyTargetMinutes;
  const isOvertime = totalWorkingMinutes > targetMinutes;
  const overtimeMinutes = Math.max(0, totalWorkingMinutes - targetMinutes);

  // Quick fill helper
  const setQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const yStr = d.getFullYear();
    const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = d.getDate().toString().padStart(2, '0');
    setDate(`${yStr}-${mStr}-${dayStr}`);
  };

  const handlePresetHours = (billable: string, nonBill: string, upskill: string) => {
    setBillableInput(billable);
    setNonBillableInput(nonBill);
    setUpskillingInput(upskill);
    setLeaveInput('00:00');
  };

  const handleFullDayLeave = () => {
    setBillableInput('00:00');
    setNonBillableInput('00:00');
    setUpskillingInput('00:00');
    setLeaveInput(minutesToHHMM(settings.defaultDailyTargetMinutes));
    if (!remarks) {
      setRemarks('Approved Leave');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = 'Date is required';
    if (!employeeId) newErrors.employeeId = 'Employee is required';
    if (!projectId) newErrors.projectId = 'Project is required';

    if (totalWorkingMinutes === 0 && leaveMinutes === 0) {
      newErrors.hours = 'Please enter working hours or leave hours';
    }

    if (isOvertime && !overtimeConfirmed && !entryToEdit) {
      newErrors.overtime = `Total hours exceed the daily target of ${minutesToReadable(targetMinutes)}. Please review and confirm overtime.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === employeeId);
    const selectedProject = projects.find((p) => p.id === projectId);

    onSave({
      ...(entryToEdit?.id ? { id: entryToEdit.id } : {}),
      date,
      employeeId,
      employeeName: selectedEmployee ? selectedEmployee.name : 'Unknown',
      projectId,
      projectName: selectedProject ? selectedProject.name : 'Unknown',
      billableMinutes,
      nonBillableMinutes,
      upskillingMinutes,
      leaveMinutes,
      remarks: remarks.trim(),
      overtimeAcknowledged: isOvertime,
    });

    onClose();
  };

  return (
    <div
      id="daily-entry-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="daily-entry-modal-card"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="daily-entry-modal-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                {entryToEdit ? 'Edit Daily Entry' : 'Add Daily Billing Entry'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Log daily working hours, project assignment, and leave
              </p>
            </div>
          </div>
          <button
            id="daily-entry-modal-close"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick templates / Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePresetHours('06:30', '01:30', '01:00')}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-700 dark:text-slate-300 rounded-md border border-blue-200 dark:border-blue-800 transition-colors font-mono-nums font-bold"
              >
                Standard (6:30 Billable + 1:30 Non + 1:00 Upskill)
              </button>
              <button
                type="button"
                onClick={() => handlePresetHours('08:00', '01:00', '00:00')}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-700 dark:text-slate-300 rounded-md border border-blue-200 dark:border-blue-800 transition-colors font-mono-nums font-bold"
              >
                8h Billable + 1h Non
              </button>
              <button
                type="button"
                onClick={handleFullDayLeave}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-700 dark:text-slate-300 rounded-md border border-blue-200 dark:border-blue-800 transition-colors font-mono-nums font-bold"
              >
                Full Day Leave
              </button>
            </div>
          </div>

          {/* Row 1: Date & Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="entry-date-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Date *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate('today')}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1"
                  >
                    Today
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setQuickDate('yesterday')}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  id="entry-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums font-bold"
                />
              </div>
              {errors.date && <p className="mt-1 text-xs text-red-500 font-bold">{errors.date}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="entry-employee-select" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Employee *
                </label>
                <button
                  type="button"
                  onClick={onOpenNewEmployeeModal}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Employee
                </button>
              </div>
              <select
                id="entry-employee-select"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.role ? `(${emp.role})` : ''}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="mt-1 text-xs text-red-500 font-bold">{errors.employeeId}</p>}
            </div>
          </div>

          {/* Row 2: Project Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="entry-project-select" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Project Name *
              </label>
              <button
                type="button"
                onClick={onOpenNewProjectModal}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> New Project
              </button>
            </div>
            <select
              id="entry-project-select"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
            >
              <option value="" disabled>
                Select a project...
              </option>
              {projects
                .filter((p) => p.isActive || p.id === projectId)
                .map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.code ? `[${proj.code}] ` : ''}
                    {proj.name}
                    {proj.client ? ` (${proj.client})` : ''}
                  </option>
                ))}
            </select>
            {errors.projectId && <p className="mt-1 text-xs text-red-500 font-bold">{errors.projectId}</p>}
          </div>

          {/* Row 3: 4 Category Time Inputs (HH:MM or Decimal) */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hours Breakdown (HH:MM or Decimal)
              </span>
              <span className="text-[11px] font-semibold text-slate-400">e.g. 06:30 or 6.5</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Billable */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl shadow-2xs">
                <label htmlFor="billable-hours-input" className="block text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1">
                  Billable Hours
                </label>
                <input
                  id="billable-hours-input"
                  type="text"
                  placeholder="06:30"
                  value={billableInput}
                  onChange={(e) => setBillableInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-blue-950 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums"
                />
                <span className="block mt-1 text-[11px] font-bold text-slate-500 font-mono-nums">
                  {minutesToReadable(billableMinutes)}
                </span>
              </div>

              {/* Non-Billable */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
                <label htmlFor="non-billable-hours-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Non-Billable
                </label>
                <input
                  id="non-billable-hours-input"
                  type="text"
                  placeholder="01:30"
                  value={nonBillableInput}
                  onChange={(e) => setNonBillableInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums"
                />
                <span className="block mt-1 text-[11px] font-bold text-slate-500 font-mono-nums">
                  {minutesToReadable(nonBillableMinutes)}
                </span>
              </div>

              {/* Upskilling */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-xl shadow-2xs">
                <label htmlFor="upskilling-hours-input" className="block text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                  Upskilling
                </label>
                <input
                  id="upskilling-hours-input"
                  type="text"
                  placeholder="01:00"
                  value={upskillingInput}
                  onChange={(e) => setUpskillingInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-amber-950 dark:text-amber-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums"
                />
                <span className="block mt-1 text-[11px] font-bold text-slate-500 font-mono-nums">
                  {minutesToReadable(upskillingMinutes)}
                </span>
              </div>

              {/* Leave */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
                <label htmlFor="leave-hours-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Leave Hours
                </label>
                <input
                  id="leave-hours-input"
                  type="text"
                  placeholder="00:00"
                  value={leaveInput}
                  onChange={(e) => setLeaveInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums"
                />
                <span className="block mt-1 text-[11px] font-bold text-slate-500 font-mono-nums">
                  {minutesToReadable(leaveMinutes)}
                </span>
              </div>
            </div>
            {errors.hours && <p className="text-xs text-red-500 font-bold">{errors.hours}</p>}
          </div>

          {/* Automatic Calculation Preview Card */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-inner space-y-3 dark:bg-slate-950 dark:border dark:border-slate-800">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Live Calculation Preview
            </div>
            <div className="grid grid-cols-3 gap-3 text-center divide-x divide-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-400">Total Working</div>
                <div className="text-lg font-black font-mono-nums text-white mt-0.5 tracking-tight">
                  {minutesToHHMM(totalWorkingMinutes)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono-nums">
                  {minutesToReadable(totalWorkingMinutes)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Daily Target</div>
                <div className="text-lg font-bold font-mono-nums text-slate-300 mt-0.5">
                  {minutesToHHMM(targetMinutes)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono-nums">
                  {minutesToReadable(targetMinutes)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Billing Utilization</div>
                <div className="text-lg font-bold font-mono-nums text-blue-400 mt-0.5">
                  {utilizationPercent}%
                </div>
                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-200">
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dot}`} />
                  {badgeProps.label}
                </div>
              </div>
            </div>

            {/* Overtime Alert */}
            {isOvertime && (
              <div className="mt-3 p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-300">
                    Overtime detected: {minutesToReadable(overtimeMinutes)} ({minutesToHHMM(overtimeMinutes)}) above target
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id="overtime-confirm-checkbox"
                      type="checkbox"
                      checked={overtimeConfirmed}
                      onChange={(e) => setOvertimeConfirmed(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-amber-400 focus:ring-blue-500"
                    />
                    <label htmlFor="overtime-confirm-checkbox" className="text-[11px] text-amber-100 cursor-pointer">
                      I confirm and authorize these overtime hours
                    </label>
                  </div>
                </div>
              </div>
            )}
            {errors.overtime && <p className="text-xs text-amber-400">{errors.overtime}</p>}
          </div>

          {/* Row 4: Remarks */}
          <div>
            <label htmlFor="entry-remarks-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Task Description
            </label>
            <textarea
              id="entry-remarks-input"
              rows={2}
              placeholder="e.g. STC documentation, DO-160 section review, DER coordination..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="daily-entry-cancel-button"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="daily-entry-save-button"
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {entryToEdit ? 'Save Changes' : 'Save Daily Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
