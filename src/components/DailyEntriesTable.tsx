import React, { useState, useMemo } from 'react';
import { BillingEntry, Employee, FilterState, Project } from '../types';
import {
  calculateUtilization,
  formatDateDisplay,
  formatDateWithDay,
  getProductivityBadgeProps,
  getProductivityRating,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Copy,
  Edit2,
  FileSpreadsheet,
  Filter,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

interface DailyEntriesTableProps {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  currency: string;
  onAddNewEntry: () => void;
  onOpenBatchModal: () => void;
  onEditEntry: (entry: BillingEntry) => void;
  onDeleteEntry: (entry: BillingEntry) => void;
  onDuplicateEntry: (entry: BillingEntry) => void;
  onBulkDelete?: (entryIds: string[]) => void;
  onBulkUpdateStatus?: (entryIds: string[], status: 'draft' | 'submitted' | 'approved' | 'invoiced') => void;
  onExportCSV: () => void;
  onExportExcel?: () => void;
  onOpenImportModal?: () => void;
}

export const DailyEntriesTable: React.FC<DailyEntriesTableProps> = ({
  entries,
  employees,
  projects,
  currency,
  onAddNewEntry,
  onOpenBatchModal,
  onEditEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onBulkDelete,
  onBulkUpdateStatus,
  onExportCSV,
  onExportExcel,
  onOpenImportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [selectedBillingType, setSelectedBillingType] = useState<'all' | 'billable' | 'non-billable' | 'upskilling' | 'leave'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'hours-desc' | 'hours-asc' | 'util-desc'>('date-desc');
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter and Sort Logic
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchProject = (entry.projectName || '').toLowerCase().includes(q);
          const matchEmployee = (entry.employeeName || '').toLowerCase().includes(q);
          const matchRemarks = (entry.remarks || '').toLowerCase().includes(q);
          const matchDate = (entry.date || '').includes(q);
          if (!matchProject && !matchEmployee && !matchRemarks && !matchDate) return false;
        }

        // Project filter
        if (selectedProjectId !== 'all' && entry.projectId !== selectedProjectId) {
          return false;
        }

        // Employee filter
        if (selectedEmployeeId !== 'all' && entry.employeeId !== selectedEmployeeId) {
          return false;
        }

        // Status filter
        if (selectedStatusFilter !== 'all' && (entry.status || 'submitted') !== selectedStatusFilter) {
          return false;
        }

        // Billing Type filter
        if (selectedBillingType === 'billable' && entry.billableMinutes <= 0) return false;
        if (selectedBillingType === 'non-billable' && entry.nonBillableMinutes <= 0) return false;
        if (selectedBillingType === 'upskilling' && entry.upskillingMinutes <= 0) return false;
        if (selectedBillingType === 'leave' && entry.leaveMinutes <= 0) return false;

        // Custom Date Filter
        if (dateFilterPreset === 'custom') {
          if (customDateFrom && entry.date < customDateFrom) return false;
          if (customDateTo && entry.date > customDateTo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const totalA = a.billableMinutes + a.nonBillableMinutes + a.upskillingMinutes;
        const totalB = b.billableMinutes + b.nonBillableMinutes + b.upskillingMinutes;
        const utilA = calculateUtilization(a.billableMinutes, totalA);
        const utilB = calculateUtilization(b.billableMinutes, totalB);

        switch (sortBy) {
          case 'date-asc':
            return a.date.localeCompare(b.date);
          case 'date-desc':
            return b.date.localeCompare(a.date);
          case 'hours-desc':
            return totalB - totalA;
          case 'hours-asc':
            return totalA - totalB;
          case 'util-desc':
            return utilB - utilA;
          default:
            return b.date.localeCompare(a.date);
        }
      });
  }, [
    entries,
    searchQuery,
    selectedProjectId,
    selectedEmployeeId,
    selectedStatusFilter,
    selectedBillingType,
    sortBy,
    dateFilterPreset,
    customDateFrom,
    customDateTo,
  ]);

  // Handle multi-select checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEntries.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };


  // Aggregate column totals
  const totals = useMemo(() => {
    const billable = filteredEntries.reduce((sum, e) => sum + e.billableMinutes, 0);
    const nonBillable = filteredEntries.reduce((sum, e) => sum + e.nonBillableMinutes, 0);
    const upskilling = filteredEntries.reduce((sum, e) => sum + e.upskillingMinutes, 0);
    const leave = filteredEntries.reduce((sum, e) => sum + e.leaveMinutes, 0);
    const totalWorking = billable + nonBillable + upskilling;
    const util = calculateUtilization(billable, totalWorking);

    let totalRevenue = 0;
    filteredEntries.forEach((e) => {
      const proj = projects.find((p) => p.id === e.projectId);
      const emp = employees.find((em) => em.id === e.employeeId);
      const rate = e.hourlyRate || proj?.hourlyRate || emp?.defaultHourlyRate || 150;
      totalRevenue += (e.billableMinutes / 60) * rate;
    });

    return {
      billable,
      nonBillable,
      upskilling,
      leave,
      totalWorking,
      util,
      totalRevenue,
    };
  }, [filteredEntries, projects, employees]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProjectId('all');
    setSelectedEmployeeId('all');
    setSelectedBillingType('all');
    setDateFilterPreset('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSortBy('date-desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedProjectId !== 'all' ||
    selectedEmployeeId !== 'all' ||
    selectedBillingType !== 'all' ||
    dateFilterPreset !== 'all' ||
    customDateFrom !== '' ||
    customDateTo !== '';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Daily Billing Entries
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Showing {filteredEntries.length} of {entries.length} recorded entries
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenImportModal && (
              <button
                id="import-excel-table-btn"
                type="button"
                onClick={onOpenImportModal}
                className="px-3 py-2 text-xs font-bold tracking-tight text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors flex items-center gap-1.5"
                title="Import Excel (.xlsx) or CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Import Excel</span>
              </button>
            )}

            {onExportExcel && (
              <button
                id="export-excel-table-btn"
                type="button"
                onClick={onExportExcel}
                className="px-3 py-2 text-xs font-bold tracking-tight text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center gap-1.5"
                title="Download multi-sheet Excel (.xlsx) report"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export Excel</span>
              </button>
            )}

            <button
              id="batch-log-btn"
              onClick={onOpenBatchModal}
              className="px-3 py-2 text-xs font-bold tracking-tight text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              title="Generate batch logs for multiple dates"
            >
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Batch Log</span>
            </button>

            <button
              id="export-csv-btn"
              onClick={onExportCSV}
              className="px-3 py-2 text-xs font-bold tracking-tight text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              title="Download CSV report"
            >
              <span>CSV</span>
            </button>

            <button
              id="add-entry-table-btn"
              onClick={onAddNewEntry}
              className="px-4 py-2 text-xs font-black tracking-tight text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Floating Bar (if items selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                {selectedIds.length}
              </span>
              <span>entries selected</span>
            </div>

            <div className="flex items-center gap-2">
              {onBulkUpdateStatus && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onBulkUpdateStatus(selectedIds, 'approved');
                      setSelectedIds([]);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    Mark Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onBulkUpdateStatus(selectedIds, 'invoiced');
                      setSelectedIds([]);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    Mark Invoiced
                  </button>
                </>
              )}
              {onBulkDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected entries?`)) {
                      onBulkDelete(selectedIds);
                      setSelectedIds([]);
                    }
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="entries-search-input"
              type="text"
              placeholder="Search remarks, project, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div>
            <select
              id="filter-project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              id="filter-employee-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-status-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>
        </div>

        {/* Sort & Quick Reset Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setSortBy('date-desc')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortBy === 'date-desc'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Date (Newest)
              </button>
              <button
                onClick={() => setSortBy('date-asc')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortBy === 'date-asc'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Date (Oldest)
              </button>
              <button
                onClick={() => setSortBy('hours-desc')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortBy === 'hours-desc'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Highest Hours
              </button>
              <button
                onClick={() => setSortBy('util-desc')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortBy === 'util-desc'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Highest Utilization
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table id="daily-entries-table" className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={filteredEntries.length > 0 && selectedIds.length === filteredEntries.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  title="Select all entries"
                />
              </th>
              <th className="py-3.5 px-3">Date</th>
              <th className="py-3.5 px-4">Project</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-3 text-right">Billable</th>
              <th className="py-3.5 px-3 text-right">Non-Bill</th>
              <th className="py-3.5 px-3 text-right">Upskill</th>
              <th className="py-3.5 px-3 text-right">Leave</th>
              <th className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                Total
              </th>
              <th className="py-3.5 px-3 text-right">Amount</th>
              <th className="py-3.5 px-3 text-center">Utilization</th>
              <th className="py-3.5 px-4 max-w-[180px]">Remarks</th>
              <th className="py-3.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {entries.length === 0 ? 'No billing entries yet.' : 'No matching entries found.'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {entries.length === 0
                          ? 'Get started by adding your first daily working entry.'
                          : 'Try adjusting your search query or filter criteria.'}
                      </p>
                    </div>
                    {entries.length === 0 ? (
                      <button
                        id="empty-state-add-btn"
                        onClick={onAddNewEntry}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add your first daily entry</span>
                      </button>
                    ) : (
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const totalWorking = entry.billableMinutes + entry.nonBillableMinutes + entry.upskillingMinutes;
                const utilPercent = calculateUtilization(entry.billableMinutes, totalWorking);
                const rating = getProductivityRating(utilPercent);
                const badgeProps = getProductivityBadgeProps(rating);
                const projectObj = projects.find((p) => p.id === entry.projectId);
                const isSelected = selectedIds.includes(entry.id);

                const rate = entry.hourlyRate || projectObj?.hourlyRate || 150;
                const amountEarned = (entry.billableMinutes / 60) * rate;

                const status = entry.status || 'submitted';
                const statusStyles = {
                  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                  submitted: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  invoiced: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                }[status];

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(entry.id)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100 font-mono-nums">
                        {formatDateDisplay(entry.date)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {entry.employeeName}
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: projectObj?.color || '#0284c7' }}
                        />
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                          {entry.projectName}
                        </span>
                      </div>
                      {projectObj?.code && (
                        <span className="text-[10px] text-slate-400 font-mono pl-4.5">
                          {projectObj.code}
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${statusStyles}`}>
                        {status}
                      </span>
                    </td>

                    {/* Billable */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums">
                      <span className={entry.billableMinutes > 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}>
                        {minutesToHHMM(entry.billableMinutes)}
                      </span>
                    </td>

                    {/* Non-Billable */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums text-slate-600 dark:text-slate-400">
                      {minutesToHHMM(entry.nonBillableMinutes)}
                    </td>

                    {/* Upskilling */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums">
                      <span className={entry.upskillingMinutes > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}>
                        {minutesToHHMM(entry.upskillingMinutes)}
                      </span>
                    </td>

                    {/* Leave */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums">
                      <span className={entry.leaveMinutes > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}>
                        {minutesToHHMM(entry.leaveMinutes)}
                      </span>
                    </td>

                    {/* Total Working */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums font-bold text-slate-900 dark:text-slate-100">
                      {minutesToHHMM(totalWorking)}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono-nums font-black text-slate-900 dark:text-slate-100">
                      {entry.billableMinutes > 0 ? `${currency} ${amountEarned.toFixed(0)}` : '—'}
                    </td>

                    {/* Utilization */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-nums border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dot}`} />
                        <span>{utilPercent}%</span>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[180px] truncate" title={entry.remarks}>
                      {entry.remarks || <span className="text-slate-300 dark:text-slate-700 italic">No remarks</span>}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onDuplicateEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Duplicate entry"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Summary Footer */}
          {filteredEntries.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                <td colSpan={4} className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Summary Totals ({filteredEntries.length} entries)
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums text-blue-700 dark:text-blue-400 font-extrabold text-sm">
                  {minutesToHHMM(totals.billable)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums text-slate-700 dark:text-slate-300 text-sm">
                  {minutesToHHMM(totals.nonBillable)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums text-amber-700 dark:text-amber-400 text-sm">
                  {minutesToHHMM(totals.upskilling)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums text-rose-700 dark:text-rose-400 text-sm">
                  {minutesToHHMM(totals.leave)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums text-slate-900 dark:text-white font-extrabold text-sm">
                  {minutesToHHMM(totals.totalWorking)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono-nums font-black text-slate-900 dark:text-slate-100 text-sm">
                  {currency} {totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                <td className="py-3.5 px-3 text-center font-mono-nums text-blue-700 dark:text-blue-300 font-extrabold text-sm">
                  {totals.util}%
                </td>
                <td colSpan={2} className="py-3.5 px-4 text-right text-[11px] text-slate-500 font-semibold">
                  {minutesToReadable(totals.totalWorking)} Total Working
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
