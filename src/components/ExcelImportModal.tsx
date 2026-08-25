import React, { useState, useRef } from 'react';
import { BillingEntry, Employee, Project } from '../types';
import { parseExcelOrCsvFile, ParsedExcelResult } from '../utils/excelHelpers';
import { calculateUtilization, formatDateDisplay, minutesToHHMM } from '../utils/timeCalculations';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (
    importedEntries: BillingEntry[],
    newEmployees: Employee[],
    newProjects: Project[],
    clearExistingFirst: boolean
  ) => void;
  currentEntriesCount: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  currentEntriesCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParsedExcelResult | null>(null);
  const [clearDefaultDetails, setClearDefaultDetails] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValid) {
      setErrorMessage('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) spreadsheet.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const result = await parseExcelOrCsvFile(file);
      setIsProcessing(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to read spreadsheet file.');
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(`Error parsing file: ${(err as Error).message}`);
      setParseResult(null);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = () => {
    if (!parseResult || parseResult.entries.length === 0) return;
    onConfirmImport(
      parseResult.entries,
      parseResult.newEmployees,
      parseResult.newProjects,
      clearDefaultDetails
    );
    handleReset();
    onClose();
  };

  // Calculate totals for preview
  const previewTotals = parseResult
    ? {
        totalBillable: parseResult.entries.reduce((s, e) => s + e.billableMinutes, 0),
        totalWorking: parseResult.entries.reduce(
          (s, e) => s + e.billableMinutes + e.nonBillableMinutes + e.upskillingMinutes,
          0
        ),
      }
    : { totalBillable: 0, totalWorking: 0 };

  return (
    <div
      id="excel-import-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Import Excel or CSV Timesheet
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Upload `.xlsx`, `.xls`, or `.csv` files to populate heatmap & daily entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Area (if no file chosen yet) */}
          {!parseResult && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Parsing Excel spreadsheet...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Drag & Drop your Excel or CSV file here
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Supports standard columns: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Date</code>,{' '}
                      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Project</code>,{' '}
                      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Billable</code>,{' '}
                      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Non-Billable</code>,{' '}
                      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Remarks</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Browse Local Files
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Parsed Result Preview */}
          {parseResult && (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-emerald-950 dark:text-emerald-200 truncate max-w-md">
                      {selectedFile?.name}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-2">
                      <span>✓ {parseResult.entries.length} valid rows found</span>
                      <span>•</span>
                      <span>{minutesToHHMM(previewTotals.totalBillable)} Billed Time</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  title="Change file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Clear Default Details Checkbox Option */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clearDefaultDetails}
                    onChange={(e) => setClearDefaultDetails(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      Clear all default / existing details before importing
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Recommended: Clears sample dummy records ({currentEntriesCount} current entries) so only your spreadsheet data populates the heatmap and dashboards.
                    </p>
                  </div>
                </label>
              </div>

              {/* Sample Rows Table Preview */}
              <div>
                <div className="flex items-center justify-between pb-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>First 5 Rows Preview:</span>
                  <span className="font-mono text-[11px]">{parseResult.entries.length} total entries</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Project</th>
                        <th className="py-2 px-3 text-right">Billable</th>
                        <th className="py-2 px-3 text-right">Non-Bill</th>
                        <th className="py-2 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono-nums">
                      {parseResult.entries.slice(0, 5).map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-semibold">{formatDateDisplay(entry.date)}</td>
                          <td className="py-2 px-3 font-sans truncate max-w-[120px]">{entry.projectName}</td>
                          <td className="py-2 px-3 text-right text-blue-600 font-bold">{minutesToHHMM(entry.billableMinutes)}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{minutesToHHMM(entry.nonBillableMinutes)}</td>
                          <td className="py-2 px-3 font-sans text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            {entry.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl"
          >
            Cancel
          </button>
          <button
            id="confirm-import-execute-btn"
            type="button"
            disabled={!parseResult || parseResult.entries.length === 0}
            onClick={handleExecuteImport}
            className="px-5 py-2 text-xs font-black tracking-tight text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {clearDefaultDetails ? 'Clear Defaults & Import Data' : 'Append & Import Data'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
