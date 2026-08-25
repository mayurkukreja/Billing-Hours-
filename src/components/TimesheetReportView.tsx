import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Calendar,
  Building,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  Filter,
  Download,
} from 'lucide-react';
import { AppSettings, BillingEntry, Employee, Project } from '../types';
import {
  formatDateDisplay,
  formatDateWithDay,
  minutesToHHMM,
  minutesToReadable,
} from '../utils/timeCalculations';
import { exportToCSV } from '../utils/exportHelpers';

interface TimesheetReportViewProps {
  entries: BillingEntry[];
  employees: Employee[];
  projects: Project[];
  settings: AppSettings;
  activeEmployeeFilter: string;
}

export function TimesheetReportView({
  entries,
  employees,
  projects,
  settings,
  activeEmployeeFilter,
}: TimesheetReportViewProps) {
  // Date range filters (default to current month)
  const today = new Date();
  const firstDayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`;
  const lastDayStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [dateFrom, setDateFrom] = useState<string>(firstDayStr);
  const [dateTo, setDateTo] = useState<string>(lastDayStr);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    activeEmployeeFilter !== 'all' ? activeEmployeeFilter : 'all'
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}-001`);
  const [poNumber, setPoNumber] = useState<string>('PO-AERO-2026');

  // Filtered entries
  const reportEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
        if (selectedEmployeeId !== 'all' && e.employeeId !== selectedEmployeeId) return false;
        if (selectedProjectId !== 'all' && e.projectId !== selectedProjectId) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, dateFrom, dateTo, selectedEmployeeId, selectedProjectId]);

  // Aggregate stats
  const totals = useMemo(() => {
    let billableMins = 0;
    let nonBillableMins = 0;
    let upskillingMins = 0;
    let leaveMins = 0;
    let totalGrossAmount = 0;

    reportEntries.forEach((e) => {
      billableMins += e.billableMinutes || 0;
      nonBillableMins += e.nonBillableMinutes || 0;
      upskillingMins += e.upskillingMinutes || 0;
      leaveMins += e.leaveMinutes || 0;

      const proj = projects.find((p) => p.id === e.projectId);
      const rate = e.hourlyRate || proj?.hourlyRate || settings.defaultHourlyRate || 150;
      totalGrossAmount += (e.billableMinutes / 60) * rate;
    });

    const totalWorkMins = billableMins + nonBillableMins + upskillingMins;

    return {
      billableMins,
      nonBillableMins,
      upskillingMins,
      leaveMins,
      totalWorkMins,
      totalGrossAmount,
    };
  }, [reportEntries, projects, settings]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exportToCSV(reportEntries);
  };


  return (
    <div id="timesheet-report-container" className="space-y-6 animate-fadeIn">
      {/* Control Bar (Hidden when printing) */}
      <div className="print:hidden p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Formal Timesheet & Invoice Documentation
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Executive Timesheet Generator
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="export-report-csv-btn"
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>
            <button
              id="print-timesheet-btn"
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Consultant / Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">All Consultants</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Project Scope
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-1.5 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Sheet Surface */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-5xl mx-auto space-y-8 font-sans">
        {/* Top Header & Branding */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter text-blue-700 uppercase">
                AEROTECH CONSULTING GROUP
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Aerospace Certification & Engineering Services
            </p>
            <p className="text-xs text-slate-500 font-medium">
              FAA Part 23 / 25 / 27 / 29 Compliance Specialists
            </p>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              TIMESHEET INVOICE
            </h1>
            <div className="text-xs font-mono font-bold text-slate-600 mt-1 space-y-0.5">
              <div>Invoice No: <span className="font-black text-slate-900">{invoiceNumber}</span></div>
              <div>Billing Period: <span className="font-black text-slate-900">{formatDateDisplay(dateFrom)} to {formatDateDisplay(dateTo)}</span></div>
              <div>Issue Date: <span className="font-black text-slate-900">{formatDateDisplay(new Date().toISOString().split('T')[0])}</span></div>
            </div>
          </div>
        </div>

        {/* Recipient & Consultant Info */}
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Billed To (Client / Project)
            </span>
            <div className="text-sm font-black text-slate-900">
              {selectedProject?.client || 'Skyline Aerospace Systems'}
            </div>
            <div className="font-bold text-slate-600">
              Project: {selectedProject ? `${selectedProject.name} (${selectedProject.code})` : 'All Active Projects'}
            </div>
            <div className="text-slate-500 font-medium">
              Contract Ref: {poNumber}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Consultant / Engineering Staff
            </span>
            <div className="text-sm font-black text-slate-900">
              {selectedEmployee?.name || 'Mayur'}
            </div>
            <div className="font-bold text-slate-600">
              Title: {selectedEmployee?.role || 'Aerospace Certification Engineer'}
            </div>
            <div className="text-slate-500 font-medium">
              Email: {selectedEmployee?.email || 'mayurkukreja4321@gmail.com'}
            </div>
          </div>
        </div>

        {/* Detailed Itemized Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Itemized Daily Activity & Hours Breakdown ({reportEntries.length} Records)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-900 text-white font-black uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Project & Scope</th>
                  <th className="p-2.5">Task Description / Deliverables</th>
                  <th className="p-2.5 text-right">Billable</th>
                  <th className="p-2.5 text-right">Non-Bill</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold">
                {reportEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      No billing entries found for the selected filter range.
                    </td>
                  </tr>
                ) : (
                  reportEntries.map((e) => {
                    const proj = projects.find((p) => p.id === e.projectId);
                    const rate = e.hourlyRate || proj?.hourlyRate || 150;
                    const amount = (e.billableMinutes / 60) * rate;

                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold whitespace-nowrap">{formatDateDisplay(e.date)}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-black text-slate-900">{e.projectName}</span>
                        </td>
                        <td className="p-2.5 text-slate-700 max-w-xs">{e.remarks || 'Standard engineering analysis'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700">{minutesToHHMM(e.billableMinutes)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{minutesToHHMM(e.nonBillableMinutes)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{settings.currency} {rate}</td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900">
                          {settings.currency} {amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Box & Sign-off */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-semibold">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Payment Terms & Remittance
              </span>
              <p className="text-slate-600">
                Payment due within 30 days of invoice date. Electronic bank wire or ACH transfers accepted.
              </p>
              <p className="text-slate-500 font-mono text-[11px]">
                Wire Ref: AEROTECH-{invoiceNumber}
              </p>
            </div>

            {/* Signature Block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <div className="border-b border-slate-400 h-8 mb-1" />
                <span className="font-black text-slate-800 block">Consultant Signature</span>
                <span className="text-slate-500">Mayur, Lead Engineer</span>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8 mb-1" />
                <span className="font-black text-slate-800 block">Client Approval Sign-Off</span>
                <span className="text-slate-500">Authorized Officer</span>
              </div>
            </div>
          </div>

          {/* Grand Totals Table */}
          <div className="space-y-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs font-bold">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Total Billable Hours:</span>
                <span className="font-mono font-black text-blue-700">{minutesToHHMM(totals.billableMins)} ({minutesToReadable(totals.billableMins)})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Non-Billable & Upskilling Hours:</span>
                <span className="font-mono text-slate-700">{minutesToHHMM(totals.nonBillableMins + totals.upskillingMins)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Total Working Duration:</span>
                <span className="font-mono text-slate-900">{minutesToHHMM(totals.totalWorkMins)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-black border-t-2 border-slate-900 pt-3">
                <span className="text-slate-900 uppercase">Total Billable Due:</span>
                <span className="font-mono text-emerald-700">
                  {settings.currency} {totals.totalGrossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
