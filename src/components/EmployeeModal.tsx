import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { User, X } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  employee?: Employee | null;
  onSave: (emp: Omit<Employee, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  employee,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email || '');
      setRole(employee.role || '');
      setIsDefault(!!employee.isDefault);
    } else {
      setName('');
      setEmail('');
      setRole('Certification Engineer');
      setIsDefault(false);
    }
    setError('');
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Employee name is required');
      return;
    }

    onSave({
      ...(employee?.id ? { id: employee.id } : {}),
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      isDefault,
    });
    onClose();
  };

  return (
    <div
      id="employee-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="employee-modal-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 id="employee-modal-title" className="text-base font-black tracking-tight">
                {employee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Manage consultant or engineering staff profile
              </p>
            </div>
          </div>
          <button
            id="employee-modal-close"
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
            <label htmlFor="employee-name-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Employee Name *
            </label>
            <input
              id="employee-name-input"
              type="text"
              required
              placeholder="e.g. Mayur"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="employee-role-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Job Title / Designation
            </label>
            <input
              id="employee-role-input"
              type="text"
              placeholder="e.g. Aerospace Certification Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="employee-email-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              id="employee-email-input"
              type="email"
              placeholder="e.g. mayur@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="employee-default-checkbox"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="employee-default-checkbox" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Set as default employee for new daily entries
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="employee-cancel-button"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="employee-submit-button"
              type="submit"
              className="px-4 py-2 text-xs font-black tracking-tight text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {employee ? 'Update Profile' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
