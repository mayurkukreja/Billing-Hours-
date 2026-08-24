import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Briefcase, X } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  onSave: (project: Omit<Project, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const PROJECT_COLORS = [
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Slate', value: '#475569' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  project,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCode(project.code || '');
      setClient(project.client || '');
      setColor(project.color || '#0284c7');
      setIsActive(project.isActive ?? true);
    } else {
      setName('');
      setCode('');
      setClient('');
      setColor('#0284c7');
      setIsActive(true);
    }
    setError('');
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    onSave({
      ...(project?.id ? { id: project.id } : {}),
      name: name.trim(),
      code: code.trim(),
      client: client.trim(),
      color,
      isActive,
    });
    onClose();
  };

  return (
    <div
      id="project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="project-modal-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 id="project-modal-title" className="text-base font-black tracking-tight">
                {project ? 'Edit Project' : 'Add New Project'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Define project code and billing categories
              </p>
            </div>
          </div>
          <button
            id="project-modal-close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="project-name-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              id="project-name-input"
              type="text"
              required
              placeholder="e.g. Aircraft Certification"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-code-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Project Code
              </label>
              <input
                id="project-code-input"
                type="text"
                placeholder="e.g. AC-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label htmlFor="project-client-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Client / Department
              </label>
              <input
                id="project-client-input"
                type="text"
                placeholder="e.g. Skyline Aero"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform border-2 flex items-center justify-center ${
                    color === c.value
                      ? 'scale-110 border-slate-900 dark:border-white shadow-xs'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="project-active-checkbox"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="project-active-checkbox" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Active project (available in daily entry dropdown)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="project-cancel-button"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="project-submit-button"
              type="submit"
              className="px-4 py-2 text-xs font-black tracking-tight text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {project ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
