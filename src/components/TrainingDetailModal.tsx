import React, { useState } from 'react';
import { TrainingRecord, TrainingComment, AssignedWorkItem } from '../types';
import {
  X,
  Calendar,
  Clock,
  UserCheck,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Plus,
  Trash2,
  Award,
  Send,
  User,
  Share2,
} from 'lucide-react';
import { minutesToHHMM } from '../utils/timeCalculations';

interface TrainingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: TrainingRecord | null;
  onUpdateTraining: (updated: TrainingRecord) => void;
  onEdit: (training: TrainingRecord) => void;
  onLogToTimesheet?: (training: TrainingRecord) => void;
}

export const TrainingDetailModal: React.FC<TrainingDetailModalProps> = ({
  isOpen,
  onClose,
  training,
  onUpdateTraining,
  onEdit,
  onLogToTimesheet,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthorRole, setNewCommentAuthorRole] = useState<'trainer' | 'trainee' | 'reviewer'>('trainer');

  // New Assigned Work in detail view
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDueDate, setNewWorkDueDate] = useState('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newWorkEstimatedHours, setNewWorkEstimatedHours] = useState('');

  if (!isOpen || !training) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const authorName =
      newCommentAuthorRole === 'trainer'
        ? training.mentorOrTrainer
        : newCommentAuthorRole === 'trainee'
        ? training.employeeName
        : 'Quality Reviewer';

    const newComment: TrainingComment = {
      id: `tc-${Date.now()}`,
      author: authorName,
      authorRole: newCommentAuthorRole,
      date: new Date().toISOString().split('T')[0],
      content: newCommentText.trim(),
    };

    const updated: TrainingRecord = {
      ...training,
      comments: [...training.comments, newComment],
      updatedAt: new Date().toISOString(),
    };

    onUpdateTraining(updated);
    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updated: TrainingRecord = {
      ...training,
      comments: training.comments.filter((c) => c.id !== commentId),
      updatedAt: new Date().toISOString(),
    };
    onUpdateTraining(updated);
  };

  const handleToggleWorkStatus = (workId: string) => {
    const updatedTasks = training.assignedWork.map((w) => {
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

    // Auto-recalculate progress % based on completed tasks
    const completedCount = updatedTasks.filter((w) => w.status === 'completed').length;
    const calcProgress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : training.progressPercent;

    const updated: TrainingRecord = {
      ...training,
      assignedWork: updatedTasks,
      progressPercent: calcProgress,
      status: calcProgress === 100 ? 'completed' : training.status,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTraining(updated);
  };

  const handleAddAssignedWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkTitle.trim()) return;

    const newWork: AssignedWorkItem = {
      id: `aw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newWorkTitle.trim(),
      dueDate: newWorkDueDate || undefined,
      priority: newWorkPriority,
      estimatedHours: newWorkEstimatedHours ? parseFloat(newWorkEstimatedHours) : undefined,
      status: 'pending',
      assignedTo: training.employeeName,
    };

    const updatedWorkList = [...training.assignedWork, newWork];
    const completedCount = updatedWorkList.filter((w) => w.status === 'completed').length;
    const calcProgress = Math.round((completedCount / updatedWorkList.length) * 100);

    const updated: TrainingRecord = {
      ...training,
      assignedWork: updatedWorkList,
      progressPercent: calcProgress,
      updatedAt: new Date().toISOString(),
    };

    onUpdateTraining(updated);
    setNewWorkTitle('');
    setNewWorkDueDate('');
    setNewWorkEstimatedHours('');
  };

  const handleDeleteWork = (workId: string) => {
    const updatedWorkList = training.assignedWork.filter((w) => w.id !== workId);
    const completedCount = updatedWorkList.filter((w) => w.status === 'completed').length;
    const calcProgress = updatedWorkList.length > 0 ? Math.round((completedCount / updatedWorkList.length) * 100) : 0;

    const updated: TrainingRecord = {
      ...training,
      assignedWork: updatedWorkList,
      progressPercent: calcProgress,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTraining(updated);
  };

  const completedTasks = training.assignedWork.filter((w) => w.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {training.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    training.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : training.status === 'under-review'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  {training.status.replace('-', ' ')}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Progress: {training.progressPercent}%
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{training.title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Trainee: {training.employeeName}
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                  The Other (Mentor/Trainer): {training.mentorOrTrainer}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(training)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Grid: Days Taken, Time Taken by Other, Trainee Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Days Taken
              </span>
              <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">
                {training.daysTaken} <span className="text-xs font-normal">days</span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                {training.startDate} {training.completionDate ? `to ${training.completionDate}` : '(Active)'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Time Taken by The Other
              </span>
              <div className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1 font-mono">
                {minutesToHHMM(training.otherTimeMinutes)}
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">
                Mentor & Reviewer Time
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Trainee Time Spent
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {minutesToHHMM(training.traineeMinutes)}
              </div>
              <span className="text-[10px] text-slate-400">Hands-on Learning</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Assigned Work Done
              </span>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                {completedTasks}/{training.assignedWork.length}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Tasks Completed
              </span>
            </div>
          </div>

          {/* Deliverables / Objectives if present */}
          {(training.learningObjectives || training.certificationEarned || training.deliverables) && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              {training.learningObjectives && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Objectives: </span>
                  <span className="text-slate-600 dark:text-slate-400">{training.learningObjectives}</span>
                </div>
              )}
              {training.certificationEarned && (
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Certification / Badge: </span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{training.certificationEarned}</span>
                </div>
              )}
              {training.deliverables && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Deliverables: </span>
                  <span className="text-slate-600 dark:text-slate-400">{training.deliverables}</span>
                </div>
              )}
            </div>
          )}

          {/* Section: More Assigned Work */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  More Assigned Work & Practical Tasks ({training.assignedWork.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Click checkmark to toggle completion
              </span>
            </div>

            {training.assignedWork.length > 0 ? (
              <div className="space-y-2">
                {training.assignedWork.map((work) => (
                  <div
                    key={work.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                      work.status === 'completed'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 opacity-80'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleWorkStatus(work.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 transition-colors ${
                          work.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                        title="Toggle task completion"
                      >
                        {work.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-xs ${
                            work.status === 'completed'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'font-bold text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {work.title}
                        </p>
                        {work.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {work.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-400">
                          {work.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due: {work.dueDate}
                            </span>
                          )}
                          {work.estimatedHours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Est: {work.estimatedHours} hrs
                            </span>
                          )}
                          {work.completedAt && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Completed {work.completedAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          work.priority === 'high'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : work.priority === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {work.priority || 'medium'}
                      </span>
                      <button
                        onClick={() => handleDeleteWork(work.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400">No additional assigned work items recorded yet.</p>
              </div>
            )}

            {/* Quick Add Form for Assigned Work */}
            <form onSubmit={handleAddAssignedWork} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                Assign More Work to Trainee:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  required
                  value={newWorkTitle}
                  onChange={(e) => setNewWorkTitle(e.target.value)}
                  placeholder="Task title (e.g. Audit Software Configuration Management Plan)"
                  className="flex-1 min-w-[220px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={newWorkDueDate}
                  onChange={(e) => setNewWorkDueDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  title="Due Date"
                />
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Est. hrs"
                  value={newWorkEstimatedHours}
                  onChange={(e) => setNewWorkEstimatedHours(e.target.value)}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  title="Estimated Hours"
                />
                <select
                  value={newWorkPriority}
                  onChange={(e) => setNewWorkPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="low">Low Pri</option>
                  <option value="medium">Med Pri</option>
                  <option value="high">High Pri</option>
                </select>
                <button
                  type="submit"
                  disabled={!newWorkTitle.trim()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section: Comments & Feedback Thread */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Comments & Mentor Feedback ({training.comments.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Evaluation feedback and trainee updates
              </span>
            </div>

            {training.comments.length > 0 ? (
              <div className="space-y-2.5">
                {training.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 rounded-xl border ${
                      comment.authorRole === 'trainer'
                        ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/40'
                        : comment.authorRole === 'trainee'
                        ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200/80 dark:border-blue-900/40'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {comment.author}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase ${
                            comment.authorRole === 'trainer'
                              ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                              : comment.authorRole === 'trainee'
                              ? 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {comment.authorRole === 'trainer' ? 'The Other (Mentor)' : comment.authorRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{comment.date}</span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No comments or feedback logged yet.</p>
            )}

            {/* Post New Comment Box */}
            <form onSubmit={handleAddComment} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Post New Comment / Evaluation Note:
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="detailCommentRole"
                      checked={newCommentAuthorRole === 'trainer'}
                      onChange={() => setNewCommentAuthorRole('trainer')}
                      className="accent-amber-600"
                    />
                    <span>The Other ({training.mentorOrTrainer})</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="detailCommentRole"
                      checked={newCommentAuthorRole === 'trainee'}
                      onChange={() => setNewCommentAuthorRole('trainee')}
                      className="accent-amber-600"
                    />
                    <span>Trainee ({training.employeeName})</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write comments, assessment notes, or questions..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 self-end py-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Last updated: {new Date(training.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-3">
            {onLogToTimesheet && (
              <button
                type="button"
                onClick={() => onLogToTimesheet(training)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Log this training session to daily entries timesheet under Upskilling / Training"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Log to Timesheet</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
