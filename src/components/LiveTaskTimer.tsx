import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { ActiveTimer, BillingEntry, Employee, Project } from '../types';
import { formatDurationHHMMSS, minutesToHHMM } from '../utils/timeCalculations';

interface LiveTaskTimerProps {
  employees: Employee[];
  projects: Project[];
  activeEmployeeId?: string;
  onSaveEntry: (entryData: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onOpenEntryModalWithPrefill?: (prefill: Partial<BillingEntry>) => void;
  currency?: string;
}

const STORAGE_TIMER_KEY = 'billing_tracker_active_timer_v1';

export function LiveTaskTimer({
  employees,
  projects,
  activeEmployeeId = 'all',
  onSaveEntry,
  onOpenEntryModalWithPrefill,
  currency = '$',
}: LiveTaskTimerProps) {

  const [isExpanded, setIsExpanded] = useState(false);
  const [timer, setTimer] = useState<ActiveTimer>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TIMER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it was running, calculate elapsed time since start
        if (parsed.isRunning && parsed.startTime) {
          const now = Date.now();
          const additionalSeconds = Math.floor((now - parsed.startTime) / 1000);
          return {
            ...parsed,
            elapsedSeconds: (parsed.elapsedSeconds || 0) + additionalSeconds,
            startTime: now,
          };
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0,
      employeeId: activeEmployeeId || (employees[0]?.id ?? ''),
      projectId: projects[0]?.id ?? '',
      category: 'billable',
      remarks: '',
    };
  });

  // Keep employee synced if empty
  useEffect(() => {
    if (!timer.employeeId && activeEmployeeId) {
      setTimer((prev) => ({ ...prev, employeeId: activeEmployeeId }));
    }
  }, [activeEmployeeId, timer.employeeId]);

  // Interval ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer.isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const updated = {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1,
          };
          localStorage.setItem(STORAGE_TIMER_KEY, JSON.stringify(updated));
          return updated;
        });
      }, 1000);
    } else {
      localStorage.setItem(STORAGE_TIMER_KEY, JSON.stringify(timer));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning]);

  const handleStart = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));
  };

  const handlePause = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      startTime: null,
    }));
  };

  const handleReset = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0,
      remarks: '',
    }));
    localStorage.removeItem(STORAGE_TIMER_KEY);
  };

  const handleLogTimesheet = () => {
    const elapsedMinutes = Math.max(1, Math.round(timer.elapsedSeconds / 60));
    const targetEmployee = employees.find((e) => e.id === timer.employeeId) || employees[0];
    const targetProject = projects.find((p) => p.id === timer.projectId) || projects[0];

    const todayStr = new Date().toISOString().split('T')[0];

    const billableMinutes = timer.category === 'billable' ? elapsedMinutes : 0;
    const nonBillableMinutes = timer.category === 'non-billable' ? elapsedMinutes : 0;
    const upskillingMinutes = timer.category === 'upskilling' ? elapsedMinutes : 0;

    const entryData: Omit<BillingEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      date: todayStr,
      employeeId: targetEmployee?.id || 'emp-default',
      employeeName: targetEmployee?.name || 'Default Employee',
      projectId: targetProject?.id || 'proj-default',
      projectName: targetProject?.name || 'Default Project',
      billableMinutes,
      nonBillableMinutes,
      upskillingMinutes,
      leaveMinutes: 0,
      remarks: timer.remarks || `Logged from Live Timer (${formatDurationHHMMSS(timer.elapsedSeconds)})`,
      status: 'submitted',
      hourlyRate: targetProject?.hourlyRate || targetEmployee?.defaultHourlyRate || 150,
    };

    onSaveEntry(entryData);
    handleReset();
    setIsExpanded(false);
  };

  const selectedProject = projects.find((p) => p.id === timer.projectId);
  const hourlyRate = selectedProject?.hourlyRate || 150;
  const accruedValue = ((timer.elapsedSeconds / 3600) * hourlyRate).toFixed(2);

  return (
    <div
      id="live-task-timer-dock"
      className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 transition-all duration-300 overflow-hidden max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] sm:w-auto font-sans"
    >
      {/* Compact Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 px-4 flex items-center justify-between gap-3 cursor-pointer bg-slate-900 hover:bg-slate-800/90 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${
                timer.isRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'
              }`}
            />
            <div
              className={`w-3 h-3 rounded-full absolute inset-0 ${
                timer.isRunning ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Live Punch Clock
            </div>
            <div className="text-base font-black font-mono-nums tracking-tight text-white flex items-center gap-2">
              <span>{formatDurationHHMMSS(timer.elapsedSeconds)}</span>
              {timer.category === 'billable' && timer.elapsedSeconds > 0 && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-800">
                  {currency} {accruedValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick play/pause buttons */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {timer.isRunning ? (
            <button
              id="pause-timer-btn"
              type="button"
              onClick={handlePause}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs"
              title="Pause Timer"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              id="start-timer-btn"
              type="button"
              onClick={handleStart}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
              title="Start Timer"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            id="toggle-timer-expand-btn"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-slate-800 bg-slate-950/95 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Consultant
              </label>
              <select
                id="timer-employee-select"
                value={timer.employeeId}
                onChange={(e) => setTimer((prev) => ({ ...prev, employeeId: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden text-xs"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Project
              </label>
              <select
                id="timer-project-select"
                value={timer.projectId}
                onChange={(e) => setTimer((prev) => ({ ...prev, projectId: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden text-xs"
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

          {/* Category Tabs */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Billing Category
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTimer((prev) => ({ ...prev, category: 'billable' }))}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-colors ${
                  timer.category === 'billable'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Billable
              </button>
              <button
                type="button"
                onClick={() => setTimer((prev) => ({ ...prev, category: 'non-billable' }))}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-colors ${
                  timer.category === 'non-billable'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Non-Bill
              </button>
              <button
                type="button"
                onClick={() => setTimer((prev) => ({ ...prev, category: 'upskilling' }))}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-colors ${
                  timer.category === 'upskilling'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upskill
              </button>
            </div>
          </div>

          {/* Task Remarks */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Active Task Notes / STC Compliance Scope
            </label>
            <input
              type="text"
              placeholder="e.g. FAA Flammability certification analysis..."
              value={timer.remarks}
              onChange={(e) => setTimer((prev) => ({ ...prev, remarks: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              id="reset-timer-btn"
              type="button"
              onClick={handleReset}
              disabled={timer.elapsedSeconds === 0}
              className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" /> Clear
            </button>

            <button
              id="log-timer-entry-btn"
              type="button"
              onClick={handleLogTimesheet}
              disabled={timer.elapsedSeconds < 10}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black tracking-tight rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save to Timesheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
