import React, { useState } from 'react';
import { X, CalendarRange, Sparkles, Check, Layers, AlertCircle } from 'lucide-react';
import { AppSettings, BillingEntry, Employee, Holiday, Project } from '../types';
import { minutesToHHMM, parseTimeToMinutes } from '../utils/timeCalculations';

interface BatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (newEntries: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'>[], overwriteExisting: boolean) => void;
  employees: Employee[];
  projects: Project[];
  holidays: Holiday[];
  settings: AppSettings;
  activeEmployeeFilter: string;
}

export function BatchEntryModal({
  isOpen,
  onClose,
  onSaveBatch,
  employees,
  projects,
  holidays,
  settings,
  activeEmployeeFilter,
}: BatchEntryModalProps) {
  if (!isOpen) return null;

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); // Monday of this week
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultStart.getDate() + 4); // Friday of this week

  const [startDate, setStartDate] = useState<string>(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(defaultEnd.toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState<string>(
    activeEmployeeFilter !== 'all' ? activeEmployeeFilter : (employees[0]?.id || '')
  );
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [template, setTemplate] = useState<'standard' | 'billable-heavy' | 'training' | 'leave' | 'custom'>('standard');

  const [billableInput, setBillableInput] = useState<string>('06:30');
  const [nonBillableInput, setNonBillableInput] = useState<string>('01:30');
  const [upskillingInput, setUpskillingInput] = useState<string>('01:00');
  const [leaveInput, setLeaveInput] = useState<string>('00:00');
  const [remarks, setRemarks] = useState<string>('STC compliance review & engineering tasks');
  const [weekdaysOnly, setWeekdaysOnly] = useState<boolean>(true);
  const [skipHolidays, setSkipHolidays] = useState<boolean>(true);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleTemplateChange = (t: 'standard' | 'billable-heavy' | 'training' | 'leave' | 'custom') => {
    setTemplate(t);
    if (t === 'standard') {
      setBillableInput('06:30');
      setNonBillableInput('01:30');
      setUpskillingInput('01:00');
      setLeaveInput('00:00');
      setRemarks('STC compliance documentation & engineering analysis');
    } else if (t === 'billable-heavy') {
      setBillableInput('08:00');
      setNonBillableInput('01:00');
      setUpskillingInput('00:00');
      setLeaveInput('00:00');
      setRemarks('Critical path aerospace certification deliverables');
    } else if (t === 'training') {
      setBillableInput('00:00');
      setNonBillableInput('01:00');
      setUpskillingInput('08:00');
      setLeaveInput('00:00');
      setRemarks('FAA Part 25 certification course & technical training');
    } else if (t === 'leave') {
      setBillableInput('00:00');
      setNonBillableInput('00:00');
      setUpskillingInput('00:00');
      setLeaveInput('09:00');
      setRemarks('Annual paid leave / approved time off');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please provide valid start and end dates.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    const bMins = parseTimeToMinutes(billableInput);
    const nbMins = parseTimeToMinutes(nonBillableInput);
    const upMins = parseTimeToMinutes(upskillingInput);
    const lvMins = parseTimeToMinutes(leaveInput);

    if (bMins + nbMins + upMins + lvMins <= 0) {
      setError('Total daily hours must be greater than 0.');
      return;
    }

    const targetEmployee = employees.find((emp) => emp.id === employeeId) || employees[0];
    const targetProject = projects.find((p) => p.id === projectId) || projects[0];

    const generatedEntries: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    const curr = new Date(startDate);
    const end = new Date(endDate);

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayOfWeek = curr.getDay();
      const isWorkingDay = settings.customWorkingDays.includes(dayOfWeek);
      const isHoliday = holidays.some((h) => h.date === dateStr);

      let shouldInclude = true;
      if (weekdaysOnly && !isWorkingDay) {
        shouldInclude = false;
      }
      if (skipHolidays && isHoliday) {
        shouldInclude = false;
      }

      if (shouldInclude) {
        generatedEntries.push({
          date: dateStr,
          employeeId: targetEmployee?.id || 'emp-default',
          employeeName: targetEmployee?.name || 'Default Employee',
          projectId: targetProject?.id || 'proj-default',
          projectName: targetProject?.name || 'Default Project',
          billableMinutes: bMins,
          nonBillableMinutes: nbMins,
          upskillingMinutes: upMins,
          leaveMinutes: lvMins,
          remarks: remarks || 'Batch logged entry',
          status: 'submitted',
          hourlyRate: targetProject?.hourlyRate || targetEmployee?.defaultHourlyRate || 150,
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (generatedEntries.length === 0) {
      setError('No matching days found in the selected range after applying weekday and holiday filters.');
      return;
    }

    onSaveBatch(generatedEntries, overwriteExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="batch-entry-modal"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-scaleUp text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Batch Multi-Day Quick Logger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Generate uniform timesheet logs across multiple dates or full weeks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          {/* Presets Selection */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Quick Hours Template Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateChange('standard')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'standard'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Standard (9h)</div>
                <div className="text-[10px] text-slate-500 font-mono">6:30 B / 1:30 NB</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateChange('billable-heavy')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'billable-heavy'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Heavy Billable</div>
                <div className="text-[10px] text-slate-500 font-mono">8:00 B / 1:00 NB</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateChange('training')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'training'
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Upskilling / TR</div>
                <div className="text-[10px] text-slate-500 font-mono">8:00 Training</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateChange('leave')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'leave'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Vacation / Leave</div>
                <div className="text-[10px] text-slate-500 font-mono">9:00 Leave</div>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                From Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-nums"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                To Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-nums"
                required
              />
            </div>
          </div>

          {/* Employee & Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {projects
                  .filter((p) => p.isActive)
                  .map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} {proj.code ? `(${proj.code})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Hours Input Row */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                Billable (HH:MM)
              </label>
              <input
                type="text"
                value={billableInput}
                onChange={(e) => setBillableInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Non-Bill (HH:MM)
              </label>
              <input
                type="text"
                value={nonBillableInput}
                onChange={(e) => setNonBillableInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                Upskill (HH:MM)
              </label>
              <input
                type="text"
                value={upskillingInput}
                onChange={(e) => setUpskillingInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                Leave (HH:MM)
              </label>
              <input
                type="text"
                value={leaveInput}
                onChange={(e) => setLeaveInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums text-center"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Task Notes / Deliverables
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              placeholder="e.g. STC Certification engineering documentation"
            />
          </div>

          {/* Rules Checkboxes */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batch-weekdays-only"
                checked={weekdaysOnly}
                onChange={(e) => setWeekdaysOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="batch-weekdays-only" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Apply to scheduled working days only (skip weekends)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batch-skip-holidays"
                checked={skipHolidays}
                onChange={(e) => setSkipHolidays(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="batch-skip-holidays" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Automatically skip public holidays in date range
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batch-overwrite"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="batch-overwrite" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Overwrite existing entries on matching dates
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Apply Batch Entries
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
