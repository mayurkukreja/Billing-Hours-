import React, { useState, useMemo } from 'react';
import {
  Employee,
  Project,
  TrainingRecord,
  TrainingStatus,
  TrainingFilterState,
  AssignedWorkItem,
} from '../types';
import {
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Award,
  MessageSquare,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  List,
  User,
  Sparkles,
} from 'lucide-react';
import { minutesToHHMM } from '../utils/timeCalculations';
import { TrainingModal } from './TrainingModal';
import { TrainingDetailModal } from './TrainingDetailModal';

interface TrainingViewProps {
  trainings: TrainingRecord[];
  employees: Employee[];
  projects: Project[];
  activeEmployeeFilter?: string;
  onSaveTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (id: string) => void;
  onLogToTimesheet: (training: TrainingRecord) => void;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  trainings,
  employees,
  projects,
  activeEmployeeFilter = 'all',
  onSaveTraining,
  onDeleteTraining,
  onLogToTimesheet,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trainingToEdit, setTrainingToEdit] = useState<TrainingRecord | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTrainingForDetail, setSelectedTrainingForDetail] = useState<TrainingRecord | null>(null);

  // View layout mode: 'grid' cards vs 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter state
  const [filters, setFilters] = useState<TrainingFilterState>({
    searchQuery: '',
    employeeId: activeEmployeeFilter !== 'all' ? activeEmployeeFilter : 'all',
    mentorOrTrainer: 'all',
    category: 'all',
    status: 'all',
    sortBy: 'date-desc',
  });

  // Distinct mentors/trainers ("the other") for filter dropdown
  const distinctMentors = useMemo(() => {
    const set = new Set<string>();
    trainings.forEach((t) => {
      if (t.mentorOrTrainer) set.add(t.mentorOrTrainer);
    });
    return Array.from(set).sort();
  }, [trainings]);

  // Distinct categories
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    trainings.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [trainings]);

  // Filtered & sorted records
  const filteredTrainings = useMemo(() => {
    return trainings
      .filter((t) => {
        // Employee / Trainee filter
        if (filters.employeeId !== 'all' && t.employeeId !== filters.employeeId) {
          return false;
        }
        // Mentor / Trainer ("the other") filter
        if (filters.mentorOrTrainer !== 'all' && t.mentorOrTrainer !== filters.mentorOrTrainer) {
          return false;
        }
        // Category filter
        if (filters.category !== 'all' && t.category !== filters.category) {
          return false;
        }
        // Status filter
        if (filters.status !== 'all' && t.status !== filters.status) {
          return false;
        }
        // Search query
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchEmp = t.employeeName.toLowerCase().includes(q);
          const matchMentor = t.mentorOrTrainer.toLowerCase().includes(q);
          const matchCategory = t.category.toLowerCase().includes(q);
          const matchComments = t.comments.some((c) => c.content.toLowerCase().includes(q) || c.author.toLowerCase().includes(q));
          const matchTasks = t.assignedWork.some((w) => w.title.toLowerCase().includes(q));
          if (!matchTitle && !matchEmp && !matchMentor && !matchCategory && !matchComments && !matchTasks) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'date-desc') {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        if (filters.sortBy === 'date-asc') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (filters.sortBy === 'days-desc') {
          return (b.daysTaken || 0) - (a.daysTaken || 0);
        }
        if (filters.sortBy === 'progress-desc') {
          return b.progressPercent - a.progressPercent;
        }
        if (filters.sortBy === 'other-time-desc') {
          return (b.otherTimeMinutes || 0) - (a.otherTimeMinutes || 0);
        }
        return 0;
      });
  }, [trainings, filters]);

  // High-Level Metrics
  const summaryMetrics = useMemo(() => {
    let totalDays = 0;
    let totalTraineeMinutes = 0;
    let totalOtherMinutes = 0;
    let totalAssignedTasks = 0;
    let completedAssignedTasks = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    trainings.forEach((t) => {
      totalDays += t.daysTaken || 0;
      totalTraineeMinutes += t.traineeMinutes || 0;
      totalOtherMinutes += t.otherTimeMinutes || 0;
      if (t.status === 'in-progress' || t.status === 'under-review') inProgressCount++;
      if (t.status === 'completed') completedCount++;

      t.assignedWork?.forEach((w) => {
        totalAssignedTasks++;
        if (w.status === 'completed') completedAssignedTasks++;
      });
    });

    const taskCompletionRate = totalAssignedTasks > 0 ? Math.round((completedAssignedTasks / totalAssignedTasks) * 100) : 0;

    return {
      totalPrograms: trainings.length,
      inProgressCount,
      completedCount,
      totalDays,
      totalTraineeMinutes,
      totalOtherMinutes,
      totalAssignedTasks,
      completedAssignedTasks,
      taskCompletionRate,
    };
  }, [trainings]);

  // Handle open detail modal
  const handleOpenDetail = (training: TrainingRecord) => {
    setSelectedTrainingForDetail(training);
    setIsDetailOpen(true);
  };

  // Handle quick toggle of assigned work item
  const handleToggleWorkStatus = (trainingId: string, workId: string) => {
    const target = trainings.find((t) => t.id === trainingId);
    if (!target) return;

    const updatedTasks = target.assignedWork.map((w) => {
      if (w.id === workId) {
        const nextStatus = w.status === 'completed' ? 'pending' : 'completed';
        return {
          ...w,
          status: nextStatus as 'pending' | 'completed',
          completedAt: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return w;
    });

    const completedCount = updatedTasks.filter((w) => w.status === 'completed').length;
    const calcProgress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : target.progressPercent;

    const updated: TrainingRecord = {
      ...target,
      assignedWork: updatedTasks,
      progressPercent: calcProgress,
      status: calcProgress === 100 ? 'completed' : target.status,
      updatedAt: new Date().toISOString(),
    };
    onSaveTraining(updated);
  };

  // Export Training to CSV
  const handleExportCSV = () => {
    const headers = [
      'Training ID',
      'Title',
      'Category',
      'Trainee',
      'The Other (Mentor/Trainer)',
      'Start Date',
      'Completion Date',
      'Days Taken',
      'Trainee Hours',
      'Time Taken by The Other (HH:MM)',
      'Status',
      'Progress %',
      'Assigned Tasks Total',
      'Assigned Tasks Completed',
      'Comments Count',
      'Certification Earned',
    ];

    const rows = filteredTrainings.map((t) => [
      `"${t.id}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.employeeName.replace(/"/g, '""')}"`,
      `"${t.mentorOrTrainer.replace(/"/g, '""')}"`,
      `"${t.startDate}"`,
      `"${t.completionDate || ''}"`,
      t.daysTaken || 1,
      (t.traineeMinutes / 60).toFixed(2),
      `"${minutesToHHMM(t.otherTimeMinutes)}"`,
      `"${t.status}"`,
      `${t.progressPercent}%`,
      t.assignedWork?.length || 0,
      t.assignedWork?.filter((w) => w.status === 'completed').length || 0,
      t.comments?.length || 0,
      `"${(t.certificationEarned || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Training_Skill_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Training & Skill Development
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Engineering Upskilling
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Track days taken, mentor guidance hours, collaborative review feedback, and follow-up assigned work
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
              title="Export training metrics to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setTrainingToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Training Record</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Card 1: Total Programs */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Training Programs
              </span>
              <BookOpen className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {summaryMetrics.totalPrograms}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {summaryMetrics.completedCount} completed
              </span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {summaryMetrics.inProgressCount} in progress
              </span>
            </div>
          </div>

          {/* Card 2: Number of Days Taken */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Total Days Taken
              </span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1">
              {summaryMetrics.totalDays}{' '}
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                training days
              </span>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
              Avg {(summaryMetrics.totalDays / Math.max(1, summaryMetrics.totalPrograms)).toFixed(1)} days / course
            </p>
          </div>

          {/* Card 3: Time Taken by The Other */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                Time Taken by The Other
              </span>
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-950 dark:text-blue-200 mt-1 font-mono">
              {minutesToHHMM(summaryMetrics.totalOtherMinutes)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-700/80 dark:text-blue-400">
              <span>Mentor Guidance</span>
              <span>vs</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {minutesToHHMM(summaryMetrics.totalTraineeMinutes)}
              </span>
              <span>Trainee</span>
            </div>
          </div>

          {/* Card 4: More Assigned Work Execution */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Assigned Work Done
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
              {summaryMetrics.completedAssignedTasks} / {summaryMetrics.totalAssignedTasks}
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 ml-1.5">
                ({summaryMetrics.taskCompletionRate}%)
              </span>
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${summaryMetrics.taskCompletionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search trainings, topics, comments, assigned work, mentors..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Trainee filter */}
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="all">All Trainees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Mentor / "The Other" filter */}
            <select
              value={filters.mentorOrTrainer}
              onChange={(e) => setFilters({ ...filters, mentorOrTrainer: e.target.value })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="all">All Mentors / Others</option>
              {distinctMentors.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="under-review">Under Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* Sort by */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="days-desc">Most Days Taken</option>
              <option value="other-time-desc">Most Time by Other</option>
              <option value="progress-desc">Highest Progress</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dense Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Cards Grid or Table */}
      {filteredTrainings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No training records found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Try adjusting your search query, trainee filter, or add a new training program to get started.
          </p>
          <button
            onClick={() => {
              setTrainingToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Training</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTrainings.map((t) => {
            const completedCount = t.assignedWork?.filter((w) => w.status === 'completed').length || 0;
            const totalTasks = t.assignedWork?.length || 0;

            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top line badges & title */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : t.status === 'under-review'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {t.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    <h3
                      onClick={() => handleOpenDetail(t)}
                      className="text-base font-black text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors leading-snug"
                    >
                      {t.title}
                    </h3>
                  </div>

                  {/* Key Highlights Grid: Number of Days Taken & Time Taken by The Other */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        Number of Days Taken
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {t.daysTaken || 1} <span className="text-xs font-semibold text-slate-400">days</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Started {t.startDate}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        <UserCheck className="w-3 h-3 text-blue-500" />
                        Time Taken by Other
                      </div>
                      <div className="text-base font-black text-blue-900 dark:text-blue-200 mt-0.5 font-mono">
                        {minutesToHHMM(t.otherTimeMinutes)}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block" title={t.mentorOrTrainer}>
                        By: {t.mentorOrTrainer}
                      </span>
                    </div>
                  </div>

                  {/* Trainee & Other details line */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      Trainee: {t.employeeName}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Trainee: {minutesToHHMM(t.traineeMinutes)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        Progress
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {t.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${t.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* More Assigned Work Preview */}
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        More Assigned Work ({completedCount}/{totalTasks})
                      </span>
                      <button
                        onClick={() => handleOpenDetail(t)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Manage Work
                      </button>
                    </div>

                    {t.assignedWork && t.assignedWork.length > 0 ? (
                      <div className="space-y-1">
                        {t.assignedWork.slice(0, 2).map((work) => (
                          <div
                            key={work.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleWorkStatus(t.id, work.id)}
                                className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center transition-colors ${
                                  work.status === 'completed'
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                }`}
                              >
                                {work.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </button>
                              <span
                                className={`truncate text-[11px] ${
                                  work.status === 'completed'
                                    ? 'line-through text-slate-400'
                                    : 'font-semibold text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {work.title}
                              </span>
                            </div>
                            {work.dueDate && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {work.dueDate.substring(5)}
                              </span>
                            )}
                          </div>
                        ))}
                        {t.assignedWork.length > 2 && (
                          <button
                            onClick={() => handleOpenDetail(t)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 block text-left pl-1"
                          >
                            +{t.assignedWork.length - 2} more assigned tasks...
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No assigned work yet.</p>
                    )}
                  </div>

                  {/* Latest Comment / Feedback snippet */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        Comments ({t.comments?.length || 0})
                      </span>
                      <button
                        onClick={() => handleOpenDetail(t)}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        View Thread
                      </button>
                    </div>
                    {t.comments && t.comments.length > 0 ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        "{t.comments[t.comments.length - 1].content}"
                        <span className="block text-[10px] font-bold not-italic text-slate-400 mt-1">
                          — {t.comments[t.comments.length - 1].author}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No comments recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onLogToTimesheet(t)}
                      className="px-2.5 py-1.5 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors flex items-center gap-1"
                      title="Log this training into the daily billing timesheet"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Log Timesheet</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenDetail(t)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
                      title="Open full training details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setTrainingToEdit(t);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                      title="Edit training record"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete training "${t.title}"?`)) {
                          onDeleteTraining(t.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete training record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Program / Course</th>
                  <th className="py-3 px-3">Trainee</th>
                  <th className="py-3 px-3">The Other (Mentor)</th>
                  <th className="py-3 px-3 text-center">Days Taken</th>
                  <th className="py-3 px-3 text-right">Time by Other</th>
                  <th className="py-3 px-3 text-right">Trainee Time</th>
                  <th className="py-3 px-3 text-center">Progress</th>
                  <th className="py-3 px-3">Assigned Work</th>
                  <th className="py-3 px-3">Comments</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrainings.map((t) => {
                  const completedCount = t.assignedWork?.filter((w) => w.status === 'completed').length || 0;
                  const totalTasks = t.assignedWork?.length || 0;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 max-w-[220px]">
                        <div
                          onClick={() => handleOpenDetail(t)}
                          className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">
                          {t.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                        {t.employeeName}
                      </td>

                      <td className="py-3 px-3 text-amber-700 dark:text-amber-400 font-medium max-w-[160px] truncate" title={t.mentorOrTrainer}>
                        {t.mentorOrTrainer}
                      </td>

                      <td className="py-3 px-3 text-center font-black text-amber-800 dark:text-amber-300">
                        {t.daysTaken || 1} d
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                        {minutesToHHMM(t.otherTimeMinutes)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {minutesToHHMM(t.traineeMinutes)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {t.progressPercent}%
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {completedCount}/{totalTasks} tasks
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {t.comments?.length || 0} notes
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(t)}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors"
                            title="Inspect Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTrainingToEdit(t);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete training "${t.title}"?`)) {
                                onDeleteTraining(t.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <TrainingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setTrainingToEdit(null);
          }}
          onSave={(record) => {
            onSaveTraining(record);
            setIsModalOpen(false);
            setTrainingToEdit(null);
          }}
          trainingToEdit={trainingToEdit}
          employees={employees}
          defaultEmployeeId={activeEmployeeFilter !== 'all' ? activeEmployeeFilter : undefined}
        />
      )}

      {/* Detailed Inspection Modal with full comments & assigned work */}
      {isDetailOpen && selectedTrainingForDetail && (
        <TrainingDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTrainingForDetail(null);
          }}
          training={selectedTrainingForDetail}
          onUpdateTraining={(updated) => {
            onSaveTraining(updated);
            setSelectedTrainingForDetail(updated);
          }}
          onEdit={(t) => {
            setIsDetailOpen(false);
            setTrainingToEdit(t);
            setIsModalOpen(true);
          }}
          onLogToTimesheet={(t) => {
            onLogToTimesheet(t);
          }}
        />
      )}
    </div>
  );
};
