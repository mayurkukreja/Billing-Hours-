import React, { useState, useEffect } from 'react';
import { Employee, TrainingRecord, TrainingStatus, AssignedWorkItem, TrainingComment } from '../types';
import { X, Calendar, Clock, UserCheck, BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { minutesToHHMM, parseTimeToMinutes } from '../utils/timeCalculations';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (training: TrainingRecord) => void;
  trainingToEdit?: TrainingRecord | null;
  employees: Employee[];
  defaultEmployeeId?: string;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  trainingToEdit,
  employees,
  defaultEmployeeId,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Aeronautical Certification');
  const [customCategory, setCustomCategory] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mentorOrTrainer, setMentorOrTrainer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [daysTaken, setDaysTaken] = useState<number>(1);
  const [traineeHours, setTraineeHours] = useState('08:00');
  const [otherTime, setOtherTime] = useState('02:00'); // Time taken by the other
  const [status, setStatus] = useState<TrainingStatus>('in-progress');
  const [progressPercent, setProgressPercent] = useState<number>(50);
  const [learningObjectives, setLearningObjectives] = useState('');
  const [certificationEarned, setCertificationEarned] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [syncWithTimesheet, setSyncWithTimesheet] = useState(true);

  // New comment input (if creating or adding)
  const [initialComment, setInitialComment] = useState('');
  const [commentAuthorRole, setCommentAuthorRole] = useState<'trainer' | 'trainee' | 'reviewer'>('trainer');

  // Assigned work items in modal
  const [assignedWork, setAssignedWork] = useState<AssignedWorkItem[]>([]);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDueDate, setNewWorkDueDate] = useState('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const categories = [
    'Aeronautical Certification',
    'CAD / FEA Structural',
    'Avionics & Software Safety',
    'DO-178C / DO-254 Standards',
    'Flammability & Materials (FAR 25.853)',
    'Quality Assurance & Auditing',
    'Systems Engineering',
    'Aerospace Leadership & Project Management',
    'Other Custom Category',
  ];

  useEffect(() => {
    if (trainingToEdit) {
      setTitle(trainingToEdit.title);
      if (categories.includes(trainingToEdit.category)) {
        setCategory(trainingToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Other Custom Category');
        setCustomCategory(trainingToEdit.category);
      }
      setEmployeeId(trainingToEdit.employeeId);
      setMentorOrTrainer(trainingToEdit.mentorOrTrainer);
      setStartDate(trainingToEdit.startDate);
      setCompletionDate(trainingToEdit.completionDate || '');
      setDaysTaken(trainingToEdit.daysTaken || 1);
      setTraineeHours(minutesToHHMM(trainingToEdit.traineeMinutes));
      setOtherTime(minutesToHHMM(trainingToEdit.otherTimeMinutes));
      setStatus(trainingToEdit.status);
      setProgressPercent(trainingToEdit.progressPercent);
      setLearningObjectives(trainingToEdit.learningObjectives || '');
      setCertificationEarned(trainingToEdit.certificationEarned || '');
      setDeliverables(trainingToEdit.deliverables || '');
      setSyncWithTimesheet(trainingToEdit.syncWithTimesheet ?? true);
      setAssignedWork(trainingToEdit.assignedWork || []);
      setInitialComment('');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setCategory('Aeronautical Certification');
      setCustomCategory('');
      const defaultEmp = employees.find((e) => e.isDefault) || employees[0];
      setEmployeeId(defaultEmployeeId || (defaultEmp ? defaultEmp.id : ''));
      setMentorOrTrainer('Sarah Chen (Lead Structures DER)');
      setStartDate(today);
      setCompletionDate('');
      setDaysTaken(5);
      setTraineeHours('16:00');
      setOtherTime('04:30');
      setStatus('in-progress');
      setProgressPercent(25);
      setLearningObjectives('');
      setCertificationEarned('');
      setDeliverables('');
      setSyncWithTimesheet(true);
      setAssignedWork([]);
      setInitialComment('');
    }
  }, [trainingToEdit, isOpen, employees, defaultEmployeeId]);

  if (!isOpen) return null;

  // Auto-calculate days taken from start and completion date
  const handleAutoCalcDays = () => {
    if (!startDate) return;
    const end = completionDate || new Date().toISOString().split('T')[0];
    const d1 = new Date(startDate);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setDaysTaken(Math.max(1, diffDays));
  };

  const handleAddWorkItem = () => {
    if (!newWorkTitle.trim()) return;
    const item: AssignedWorkItem = {
      id: `aw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newWorkTitle.trim(),
      dueDate: newWorkDueDate || undefined,
      priority: newWorkPriority,
      status: 'pending',
    };
    setAssignedWork([...assignedWork, item]);
    setNewWorkTitle('');
    setNewWorkDueDate('');
  };

  const handleRemoveWorkItem = (id: string) => {
    setAssignedWork(assignedWork.filter((w) => w.id !== id));
  };

  const handleToggleWorkStatus = (id: string) => {
    setAssignedWork(
      assignedWork.map((w) =>
        w.id === id
          ? {
              ...w,
              status: w.status === 'completed' ? 'pending' : 'completed',
              completedAt: w.status === 'completed' ? undefined : new Date().toISOString().split('T')[0],
            }
          : w
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !employeeId) return;

    const assignedEmployee = employees.find((e) => e.id === employeeId);
    const resolvedCategory = category === 'Other Custom Category' ? customCategory || 'General' : category;

    const existingComments: TrainingComment[] = trainingToEdit ? [...trainingToEdit.comments] : [];
    if (initialComment.trim()) {
      existingComments.push({
        id: `tc-${Date.now()}`,
        author:
          commentAuthorRole === 'trainer'
            ? mentorOrTrainer || 'Trainer / Mentor'
            : assignedEmployee?.name || 'Trainee',
        authorRole: commentAuthorRole,
        date: new Date().toISOString().split('T')[0],
        content: initialComment.trim(),
      });
    }

    const traineeMins = parseTimeToMinutes(traineeHours);
    const otherMins = parseTimeToMinutes(otherTime);

    const record: TrainingRecord = {
      id: trainingToEdit ? trainingToEdit.id : `trn-${Date.now()}`,
      title: title.trim(),
      category: resolvedCategory,
      employeeId,
      employeeName: assignedEmployee ? assignedEmployee.name : 'Unknown Engineer',
      mentorOrTrainer: mentorOrTrainer.trim() || 'Internal Reviewer',
      startDate,
      completionDate: completionDate || undefined,
      daysTaken: Number(daysTaken) || 1,
      traineeMinutes: traineeMins,
      otherTimeMinutes: otherMins,
      status,
      progressPercent: Number(progressPercent),
      comments: existingComments,
      assignedWork,
      learningObjectives: learningObjectives.trim() || undefined,
      certificationEarned: certificationEarned.trim() || undefined,
      deliverables: deliverables.trim() || undefined,
      syncWithTimesheet,
      createdAt: trainingToEdit ? trainingToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {trainingToEdit ? 'Edit Training Program' : 'New Training & Skill Development Record'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track days taken, mentor guidance time, review feedback, and follow-up assigned work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Training Program / Course Name *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. FAA Part 25 Airworthiness & STC Certification"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category / Domain
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {category === 'Other Custom Category' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Specify Custom Category
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Composite Materials Non-Destructive Testing"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trainee (Employee) *
                </label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.role ? `(${emp.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  The Other (Trainer / Mentor / Reviewer) *
                </label>
                <input
                  type="text"
                  required
                  value={mentorOrTrainer}
                  onChange={(e) => setMentorOrTrainer(e.target.value)}
                  placeholder="e.g. Sarah Chen (Lead Structures DER) or Dr. Vance"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Days Taken & Time Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Duration, Days Taken & Time Taken by The Other
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Completion / Target Date
                </label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Number of Days Taken *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCalcDays}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                    title="Auto-calculate from dates"
                  >
                    Auto-calc
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={daysTaken}
                    onChange={(e) => setDaysTaken(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black"
                  />
                  <span className="absolute right-3 top-1.5 text-[11px] text-slate-400 font-bold pointer-events-none">
                    days
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Time Taken by Other *
                </label>
                <input
                  type="text"
                  required
                  value={otherTime}
                  onChange={(e) => setOtherTime(e.target.value)}
                  placeholder="HH:MM (e.g. 04:30)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">Mentor/Trainer guidance</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trainee Time Spent
                </label>
                <input
                  type="text"
                  required
                  value={traineeHours}
                  onChange={(e) => setTraineeHours(e.target.value)}
                  placeholder="HH:MM (e.g. 16:00)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">Hours invested by trainee</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TrainingStatus)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="under-review">Under Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Progress: {progressPercent}%
                  </label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: More Assigned Work & Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                More Assigned Work / Follow-up Tasks ({assignedWork.length})
              </label>
              <span className="text-[11px] text-slate-400">
                Action items, hands-on deliverables, follow-up projects
              </span>
            </div>

            {/* Existing Assigned Work List */}
            {assignedWork.length > 0 ? (
              <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
                {assignedWork.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleWorkStatus(item.id)}
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                          item.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <span
                        className={`text-xs truncate ${
                          item.status === 'completed'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.dueDate && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.dueDate}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase ${
                          item.priority === 'high'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.priority === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No assigned follow-up work added yet.</p>
            )}

            {/* Add New Assigned Work Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={newWorkTitle}
                onChange={(e) => setNewWorkTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWorkItem();
                  }
                }}
                placeholder="Assign more work / follow-up deliverable..."
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="date"
                value={newWorkDueDate}
                onChange={(e) => setNewWorkDueDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                title="Due Date"
              />
              <select
                value={newWorkPriority}
                onChange={(e) => setNewWorkPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>
              <button
                type="button"
                onClick={handleAddWorkItem}
                disabled={!newWorkTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Section 4: Comments & Feedback */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {trainingToEdit ? 'Add New Comment / Review Note' : 'Initial Comments & Feedback'}
            </label>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-xs text-slate-500 font-semibold">Author Role:</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="authorRole"
                  checked={commentAuthorRole === 'trainer'}
                  onChange={() => setCommentAuthorRole('trainer')}
                  className="accent-amber-600"
                />
                <span>The Other (Trainer/Mentor)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="authorRole"
                  checked={commentAuthorRole === 'trainee'}
                  onChange={() => setCommentAuthorRole('trainee')}
                  className="accent-amber-600"
                />
                <span>Trainee</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              placeholder="e.g. Mentor feedback: Demonstrates solid mastery of crashworthiness load factors; ready for independent delegation."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Section 5: Learning Objectives & Certificate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Learning Objectives / Description
              </label>
              <input
                type="text"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="e.g. Master 14 CFR Part 25 structural substantiation"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Certification / Recognized Outcome
              </label>
              <input
                type="text"
                value={certificationEarned}
                onChange={(e) => setCertificationEarned(e.target.value)}
                placeholder="e.g. FAA STC Compliance Practitioner"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            * Mandatory fields. All data is saved locally in your browser session.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>{trainingToEdit ? 'Save Changes' : 'Create Training Record'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
