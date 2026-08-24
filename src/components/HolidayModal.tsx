import React, { useState, useEffect } from 'react';
import { Holiday } from '../types';
import { Calendar, X } from 'lucide-react';

interface HolidayModalProps {
  isOpen: boolean;
  holiday?: Holiday | null;
  onSave: (holiday: Omit<Holiday, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  holiday,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (holiday) {
      setName(holiday.name);
      setDate(holiday.date);
    } else {
      setName('');
      setDate('');
    }
    setError('');
  }, [holiday, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Holiday name is required');
      return;
    }
    if (!date) {
      setError('Holiday date is required');
      return;
    }

    onSave({
      ...(holiday?.id ? { id: holiday.id } : {}),
      name: name.trim(),
      date,
    });
    onClose();
  };

  return (
    <div
      id="holiday-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="holiday-modal-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="holiday-modal-title" className="text-base font-black tracking-tight">
                {holiday ? 'Edit Holiday' : 'Add Public Holiday'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Holidays are automatically excluded from target working hours
              </p>
            </div>
          </div>
          <button
            id="holiday-modal-close"
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
            <label htmlFor="holiday-name-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Holiday Name *
            </label>
            <input
              id="holiday-name-input"
              type="text"
              required
              placeholder="e.g. Labor Day"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="holiday-date-input" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Holiday Date *
            </label>
            <input
              id="holiday-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="holiday-cancel-button"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="holiday-submit-button"
              type="submit"
              className="px-4 py-2 text-xs font-black tracking-tight text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {holiday ? 'Update Holiday' : 'Save Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
