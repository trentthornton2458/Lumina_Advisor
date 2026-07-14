import React, { useState, useMemo } from 'react';
import { SavedAdvisorReport, Contact, Company } from '../types';
import { Archive, Trash2, Calendar, User, Building2, Sparkles } from 'lucide-react';
import AdvisorReportView from './AdvisorReportView';

interface AdvisorReportsProps {
  reports: SavedAdvisorReport[];
  contacts: Contact[];
  companies: Company[];
  onDelete: (id: string) => void;
}

const CATEGORY_LABELS: Record<SavedAdvisorReport['adviceCategory'], string> = {
  meetingPrep: 'Meeting Prep',
  frictionRedline: 'Friction & Redline',
  strategicActionList: 'Strategic Actions',
  customTemplate: 'Custom Template'
};

export default function AdvisorReports({ reports, contacts, companies, onDelete }: AdvisorReportsProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [contactFilter, setContactFilter] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesCategory = !categoryFilter || r.adviceCategory === categoryFilter;
      const matchesContact = !contactFilter || r.contactId === contactFilter;
      return matchesCategory && matchesContact;
    });
  }, [reports, categoryFilter, contactFilter]);

  const contactsWithReports = useMemo(() => {
    const ids = new Set(reports.map(r => r.contactId).filter(Boolean));
    return contacts.filter(c => ids.has(c.id));
  }, [reports, contacts]);

  const executeDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">

      {/* Overview Intro Banner */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Archive size={20} className="text-blue-600" />
            Saved Advisor Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Every report you save from the AI Advisor tab lives here for later reference — and the AI itself
            reviews your most recent saved reports for a contact or company on future runs to avoid repeating advice.
          </p>
        </div>
      </div>

      {/* Filter row */}
      {reports.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Filter:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Contacts</option>
            {contactsWithReports.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {(categoryFilter || contactFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setContactFilter(''); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-[10px] text-slate-400 font-mono">{filteredReports.length} of {reports.length} report{reports.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-12 text-center shadow-xs">
            <Archive size={40} className="mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700">No Saved Reports Yet</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
              Run an analysis in the AI Advisor tab and click "Save Report" to build a reference library the AI
              can draw on for future advice.
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-10 text-center shadow-xs">
            <p className="text-slate-400 text-xs">No reports match the current filters.</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div key={report.id} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-blue-50 text-blue-700 border-blue-200">
                      {CATEGORY_LABELS[report.adviceCategory]}
                    </span>
                    {report.contactName && (
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <User size={11} /> {report.contactName}
                      </span>
                    )}
                    {report.companyName && (
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <Building2 size={11} /> {report.companyName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar size={11} /> {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-2">{report.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 flex items-start gap-1.5">
                    <Sparkles size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    {report.response.assessment}
                  </p>
                </div>

                {deleteConfirmId === report.id ? (
                  <div className="flex items-center gap-1 border border-rose-200 bg-rose-50 rounded-lg pr-1 pl-3 py-0.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider mr-1">Confirm</span>
                    <button
                      onClick={() => executeDelete(report.id)}
                      className="px-3 py-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 text-xs font-semibold transition"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1 bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300 text-xs font-semibold transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(report.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shrink-0"
                    title="Delete report"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <details className="mt-3 group">
                <summary className="text-[10px] text-slate-450 hover:text-slate-700 cursor-pointer font-bold uppercase tracking-wider select-none outline-none">
                  View Full Report
                </summary>
                <div className="mt-3">
                  <AdvisorReportView response={report.response} />
                </div>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
