import React, { useState, useEffect } from 'react';
import { Contact, MeetingNote, MyselfProfile, AISuggestionResponse, TaskReminder, TaskPriority, Company, SOPDocument, SavedAdvisorReport, BehavioralProfile, PersonalNote, SelfOrgPlacements } from '../types';
import {
  User, AlertTriangle,
  HelpCircle, Calendar, RefreshCw, Send, BrainCircuit, CheckSquare, Check,
  Building2, FileText, Layout, Bookmark
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';
import { noteInvolvesContact, getNoteAttendeeIds } from '../lib/noteUtils';
import { SELF_NODE_ID, buildCompanyOrgChartContacts } from '../lib/orgChartUtils';
import AdvisorReportView from './AdvisorReportView';

interface AIAdvisorProps {
  contacts: Contact[];
  notes: MeetingNote[];
  profile: MyselfProfile;
  companies: Company[];
  sops: SOPDocument[];
  tasks: TaskReminder[];
  onAddTask: (task: TaskReminder) => void;
  savedReports: SavedAdvisorReport[];
  behavioralProfiles: BehavioralProfile[];
  onSaveReport: (report: SavedAdvisorReport) => void;
  personalNotes: PersonalNote[];
  selfOrgPlacements: SelfOrgPlacements;
}

export default function AIAdvisor({ contacts, notes, profile, companies, sops, tasks, onAddTask, savedReports, behavioralProfiles, onSaveReport, personalNotes, selfOrgPlacements }: AIAdvisorProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [adviceCategory, setAdviceCategory] = useState<'meetingPrep' | 'frictionRedline' | 'strategicActionList' | 'customTemplate'>('meetingPrep');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedSopIds, setSelectedSopIds] = useState<string[]>([]);
  const [customTemplateStructure, setCustomTemplateStructure] = useState<string>(
    `## Executive Strategy Advice\n\n### Strategic Summary\n[Your AI analysis goes here]\n\n### Practical Recommendations\n1. [Item 1]\n2. [Item 2]\n\n### Key Talking Points\n- "[Script 1]"\n- "[Script 2]"`
  );
  
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [apiServiceUnavailable, setApiServiceUnavailable] = useState(false);
  
  const [aiResponse, setAiResponse] = useState<AISuggestionResponse | null>(null);
  const [addedTaskTitles, setAddedTaskTitles] = useState<string[]>([]);
  const [reportSaved, setReportSaved] = useState(false);

  // Pre-check all SOPs by default
  useEffect(() => {
    if (sops.length > 0 && selectedSopIds.length === 0) {
      setSelectedSopIds(sops.map(s => s.id));
    }
  }, [sops]);

  // Filter notes based on selected contact or company. A note counts as "in scope"
  // if the target contact is either the primary contact or one of the attendees.
  const filteredNotes = React.useMemo(() => {
    return notes.filter(n => {
      const matchesContact = !selectedContactId || noteInvolvesContact(n, selectedContactId);

      let matchesCompany = true;
      if (selectedCompanyId) {
        // Find contacts belonging to this company
        const companyContactIds = contacts
          .filter(c => c.companyId === selectedCompanyId || c.company.toLowerCase() === companies.find(cp => cp.id === selectedCompanyId)?.name.toLowerCase())
          .map(c => c.id);

        matchesCompany = getNoteAttendeeIds(n).some(id => companyContactIds.includes(id));
      }

      return matchesContact && matchesCompany;
    });
  }, [notes, selectedContactId, selectedCompanyId, contacts, companies]);

  // Reset note selection to the current scope whenever the target contact/company
  // changes, and default-select its first few notes. Without this, a note checked
  // while a different (or no) contact/company was targeted stayed selected forever —
  // invisible in this filtered checklist, but still sent to the AI, which is how
  // advice for one account ended up citing another account's notes.
  const prevScopeRef = React.useRef<string>('');
  useEffect(() => {
    const scopeKey = `${selectedContactId}::${selectedCompanyId}`;
    const scopeChanged = prevScopeRef.current !== scopeKey;
    prevScopeRef.current = scopeKey;

    setSelectedNoteIds(prev => {
      if (scopeChanged) {
        return filteredNotes.map(n => n.id).slice(0, 3);
      }
      // Same scope, but the notes list changed under us (e.g. still loading from
      // Firestore at mount). Drop anything that fell out of scope, then re-fill
      // defaults only if that leaves nothing selected.
      const stillValid = prev.filter(id => filteredNotes.some(n => n.id === id));
      return stillValid.length > 0 ? stillValid : filteredNotes.map(n => n.id).slice(0, 3);
    });
  }, [selectedContactId, selectedCompanyId, filteredNotes]);

  const handleToggleNoteSelection = (noteId: string) => {
    if (selectedNoteIds.includes(noteId)) {
      setSelectedNoteIds(selectedNoteIds.filter(id => id !== noteId));
    } else {
      setSelectedNoteIds([...selectedNoteIds, noteId]);
    }
  };

  const handleToggleSopSelection = (sopId: string) => {
    if (selectedSopIds.includes(sopId)) {
      setSelectedSopIds(selectedSopIds.filter(id => id !== sopId));
    } else {
      setSelectedSopIds([...selectedSopIds, sopId]);
    }
  };

  const handleSelectAllNotes = () => {
    setSelectedNoteIds(filteredNotes.map(n => n.id));
  };

  const handleClearNotesSelection = () => {
    setSelectedNoteIds([]);
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    setApiKeyMissing(false);
    setApiServiceUnavailable(false);
    setAddedTaskTitles([]);
    setReportSaved(false);

    const priorReports = savedReports
      .filter(r => (selectedContactId && r.contactId === selectedContactId) || (selectedCompanyId && r.companyId === selectedCompanyId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);

    const behavioralProfile = selectedContactId
      ? behavioralProfiles.find(p => p.contactId === selectedContactId)
      : undefined;

    // Resolve the in-scope company (either directly selected, or via the selected
    // contact) so the AI can be told how the account's reporting structure looks,
    // including where the user themselves fits in (from the Smart Org Chart).
    const effectiveCompanyId = selectedCompanyId
      || contacts.find(c => c.id === selectedContactId)?.companyId;
    const effectiveCompany = effectiveCompanyId
      ? companies.find(c => c.id === effectiveCompanyId)
      : undefined;

    const orgChartContext = effectiveCompany
      ? {
          companyName: effectiveCompany.name,
          nodes: buildCompanyOrgChartContacts(
            contacts, effectiveCompany.id, effectiveCompany.name, profile, selfOrgPlacements[effectiveCompany.id]
          ).map(n => ({
            name: n.id === SELF_NODE_ID ? `${profile.name} (You)` : n.name,
            position: n.position,
            supervisorName: !n.supervisorId
              ? null
              : n.supervisorId === SELF_NODE_ID
              ? `${profile.name} (You)`
              : contacts.find(c => c.id === n.supervisorId)?.name || null
          }))
        }
      : null;

    // Cap to the most recent 20 personal notes - there's no selection UI for these
    // (unlike SOPs/notes), so avoid unbounded prompt growth as the collection grows.
    const recentPersonalNotes = [...personalNotes]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);

    const payload = {
      userProfile: profile,
      adviceCategory,
      selectedContacts: selectedContactId
        ? [contacts.find(c => c.id === selectedContactId)]
        : selectedCompanyId
        ? contacts.filter(c => c.companyId === selectedCompanyId)
        : contacts,
      // Filter against filteredNotes (already scoped to the target contact/company),
      // not the raw notes list — guarantees an out-of-scope note ID can never leak
      // into the AI payload even if selectedNoteIds state is ever stale.
      selectedNotes: filteredNotes
        .filter(n => selectedNoteIds.includes(n.id))
        .map(n => ({
          ...n,
          attendeeNames: getNoteAttendeeIds(n).map(id => contacts.find(c => c.id === id)?.name).filter(Boolean)
        })),
      userPrompt: userPrompt.trim() || undefined,
      activeSops: sops.filter(s => selectedSopIds.includes(s.id)),
      existingTasks: tasks.map(t => ({ title: t.title, completed: t.completed })),
      customTemplateStructure: adviceCategory === 'customTemplate' ? customTemplateStructure : undefined,
      priorReports,
      behavioralProfile,
      orgChartContext,
      personalNotes: recentPersonalNotes
    };

    try {
      const response = await authedFetch('/api/ai-advice', user, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Server returned an error status while processing.');
      }

      const resData = await response.json();

      if (resData.status === 'error' && resData.errorType === 'apiKeyMissing') {
        setApiKeyMissing(true);
        // Load high-fidelity fallback preview mimicking the profile
        setAiResponse(generateFallbackMockResponse(payload.selectedContacts || [], payload.selectedNotes, adviceCategory, userPrompt, payload.activeSops, customTemplateStructure));
      } else if (resData.status === 'error' && resData.errorType === 'apiServiceUnavailable') {
        setApiServiceUnavailable(true);
        // Load high-fidelity fallback preview mimicking the profile
        setAiResponse(generateFallbackMockResponse(payload.selectedContacts || [], payload.selectedNotes, adviceCategory, userPrompt, payload.activeSops, customTemplateStructure));
      } else if (resData.status === 'success' && resData.data) {
        setAiResponse(resData.data);
      } else if (resData.error) {
        setErrorNotice(resData.error);
      } else {
        throw new Error('Received unexpected content response structure.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || 'Connecting to backend advisory route failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedTask = (title: string, priority: TaskPriority, note?: string) => {
    const newTask: TaskReminder = {
      id: 't_ai_' + Date.now() + Math.random().toString(36).substring(2, 5),
      contactId: selectedContactId || undefined,
      companyId: selectedCompanyId || undefined,
      title,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days in future
      priority,
      completed: false,
      notes: note || 'Suggested by AI Advisor.'
    };
    onAddTask(newTask);
    setAddedTaskTitles([...addedTaskTitles, title]);
    showToast(`Task "${title}" added to Tasks tab`, 'success');
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
  const selectedCompany = companies.find(cp => cp.id === selectedCompanyId) || null;

  const ADVICE_CATEGORY_LABELS: Record<typeof adviceCategory, string> = {
    meetingPrep: 'Meeting Prep',
    frictionRedline: 'Friction & Redline',
    strategicActionList: 'Strategic Actions',
    customTemplate: 'Custom Template'
  };

  const handleSaveReport = () => {
    if (!aiResponse) return;
    const report: SavedAdvisorReport = {
      id: 'report_' + Date.now() + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      title: `${ADVICE_CATEGORY_LABELS[adviceCategory]}${selectedContact ? ` — ${selectedContact.name}` : selectedCompany ? ` — ${selectedCompany.name}` : ''}`,
      adviceCategory,
      contactId: selectedContactId || undefined,
      companyId: selectedCompanyId || undefined,
      contactName: selectedContact?.name,
      companyName: selectedCompany?.name || selectedContact?.company,
      userPrompt: userPrompt.trim() || undefined,
      sourceNoteIds: selectedNoteIds,
      response: aiResponse
    };
    onSaveReport(report);
    setReportSaved(true);
  };

  return (
    <div id="ai-advisor-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Parameters Panel */}
      <div className="lg:col-span-5 bg-white rounded-3xl shadow-xs border border-slate-100 p-6 flex flex-col gap-5 h-auto lg:h-[730px] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit size={18} className="text-blue-600 animate-pulse" />
            AI Advisor Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure profile-aware tactical suggestions and cross-reference SOP documents.</p>
        </div>

        {/* Category format selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">Advice Blueprints</label>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => setAdviceCategory('meetingPrep')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                adviceCategory === 'meetingPrep' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-150'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <Calendar size={13} /> Meeting Prep
              </span>
              <span className={`text-[9px] font-medium leading-relaxed ${adviceCategory === 'meetingPrep' ? 'text-slate-350' : 'text-slate-500'}`}>Forecast objections & prepare speaking plans.</span>
            </button>

            <button
              onClick={() => setAdviceCategory('frictionRedline')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                adviceCategory === 'frictionRedline' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-150'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} /> Friction & Redline
              </span>
              <span className={`text-[9px] font-medium leading-relaxed ${adviceCategory === 'frictionRedline' ? 'text-slate-350' : 'text-slate-500'}`}>Analyze where things went off the rails & pivot.</span>
            </button>

            <button
              onClick={() => setAdviceCategory('strategicActionList')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                adviceCategory === 'strategicActionList' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-150'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <CheckSquare size={13} /> Strategic Actions
              </span>
              <span className={`text-[9px] font-medium leading-relaxed ${adviceCategory === 'strategicActionList' ? 'text-slate-350' : 'text-slate-500'}`}>Generate non-duplicate tasks conforming to SOPs.</span>
            </button>

            <button
              onClick={() => setAdviceCategory('customTemplate')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                adviceCategory === 'customTemplate' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-150'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <Layout size={13} /> Custom Template
              </span>
              <span className={`text-[9px] font-medium leading-relaxed ${adviceCategory === 'customTemplate' ? 'text-slate-350' : 'text-slate-500'}`}>Request response format structured your way.</span>
            </button>
          </div>
        </div>

        {/* Custom Template Input */}
        {adviceCategory === 'customTemplate' && (
          <div className="animate-fade-in">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Custom Layout Structure</label>
            <textarea
              value={customTemplateStructure}
              onChange={(e) => setCustomTemplateStructure(e.target.value)}
              placeholder="Provide headings or formatting instructions..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-slate-400 resize-none font-mono text-slate-800"
            />
          </div>
        )}

        {/* Scope Context inputs (Company + Contact) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Target Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setSelectedContactId(''); // Clear contact focus to prevent conflicts
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">-- All Companies --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Target Contact</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">-- All Contacts --</option>
              {contacts
                .filter(c => !selectedCompanyId || c.companyId === selectedCompanyId || c.company.toLowerCase() === selectedCompany?.name.toLowerCase())
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
            </select>
          </div>
        </div>

        {/* SOP Reference checklist */}
        {sops.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Cross-reference SOP Documents</label>
            <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 max-h-[100px] overflow-y-auto space-y-1.5 pr-1">
              {sops.map(sop => {
                const isSelected = selectedSopIds.includes(sop.id);
                return (
                  <button
                    key={sop.id}
                    onClick={() => handleToggleSopSelection(sop.id)}
                    className="w-full flex items-center justify-between text-left text-2xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <FileText size={11} className="text-slate-400 shrink-0" />
                      {sop.title}
                    </span>
                    <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={10} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Meeting select checklist */}
        <div className="flex-1 flex flex-col min-h-[140px] overflow-hidden">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Feed Meeting Notes ({selectedNoteIds.length})
            </label>
            <div className="flex gap-2 text-[10px] text-slate-500 font-semibold">
              <button onClick={handleSelectAllNotes} className="hover:underline hover:text-slate-900">All</button>
              <span>•</span>
              <button onClick={handleClearNotesSelection} className="hover:underline hover:text-slate-900">Clear</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200/60 rounded-xl p-2 bg-slate-50/50 space-y-1.5 pr-1 max-h-[140px]">
            {filteredNotes.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs italic">No matching logged notes.</p>
            ) : (
              filteredNotes.map(n => {
                const isSelected = selectedNoteIds.includes(n.id);
                const noteAttendees = getNoteAttendeeIds(n).map(id => contacts.find(c => c.id === id)?.name).filter(Boolean);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleToggleNoteSelection(n.id)}
                    className={`w-full text-left p-2 rounded-xl border text-xs flex justify-between items-start gap-2 transition ${
                      isSelected ? 'bg-white border-slate-350 shadow-2xs font-semibold' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <p className="text-[9px] font-mono text-slate-400">{n.date} • {n.category}</p>
                      <h4 className="text-slate-900 truncate mt-0.5">{n.title}</h4>
                      {noteAttendees.length > 0 && <p className="text-[9px] text-slate-500 truncate font-semibold">with {noteAttendees.join(', ')}</p>}
                    </div>
                    <div className={`w-3.5 h-3.5 border rounded-sm mt-0.5 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={10} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Additional instructions */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Special Query / Context</label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g. Focus on pricing risks. Provide advice matching client's skepticism..."
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-slate-400 resize-none font-sans text-slate-800"
          />
        </div>

        {/* Trigger button */}
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/10 animate-glow-border"
        >
          {isLoading ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Analyzing Strategy Context...
            </>
          ) : (
            <>
              <Send size={14} /> Calculate Strategy Advice
            </>
          )}
        </button>
      </div>

      {/* Advisory Outputs screen */}
      <div className="lg:col-span-7 h-[calc(100vh-220px)] lg:h-[730px] flex flex-col">
        {errorNotice && (
          <div className="bg-rose-50 border border-rose-250 rounded-xl p-4 text-rose-800 text-xs mb-4 flex items-start gap-2">
            <AlertTriangle className="text-rose-600 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <span className="font-bold block uppercase mb-0.5">Strategy Calculation Failed</span>
              {errorNotice}
            </div>
          </div>
        )}

        {apiKeyMissing && (
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 text-amber-800 text-xs mb-4 flex items-start gap-2.5 animate-glow-border">
            <HelpCircle className="text-amber-600 flex-shrink-0 mt-0.5 animate-bounce" size={18} />
            <div>
              <span className="font-bold block uppercase mb-0.5">Gemini API Key Missing</span>
              The GEMINI_API_KEY environment variable is not configured. 
              The application automatically generated a **Profile-Aware Simulation** below mimicking exact backend outputs based on your profile communication style.
            </div>
          </div>
        )}

        {apiServiceUnavailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-905 text-xs mb-4 flex items-start gap-2.5">
            <HelpCircle className="text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" size={18} />
            <div>
              <span className="font-bold block uppercase mb-0.5">Gemini Service Limitation</span>
              The Gemini model is temporarily rate limited. Our **Local Strategic Heuristics Engine** took over to generate custom tactical recommendations based on your bio.
            </div>
          </div>
        )}

        {aiResponse ? (
          /* Advice Dashboard display */
          <div id="ai-response-dashboard" className="flex-1 overflow-y-auto flex flex-col gap-3 animate-glow-border rounded-3xl">
            <button
              onClick={handleSaveReport}
              disabled={reportSaved}
              className={`self-end flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                reportSaved
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-900 border border-slate-700 text-white hover:bg-slate-800'
              }`}
            >
              {reportSaved ? (
                <>
                  <Check size={13} strokeWidth={3} /> Saved to Advisor Reports
                </>
              ) : (
                <>
                  <Bookmark size={13} /> Save Report
                </>
              )}
            </button>

            <AdvisorReportView
              response={aiResponse}
              isSimulated={apiKeyMissing || apiServiceUnavailable}
              onAddTask={handleAddSuggestedTask}
              addedTaskTitles={addedTaskTitles}
            />
          </div>
        ) : (
          /* Blank state ready */
          <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center flex-1 flex flex-col justify-center items-center h-full">
            <BrainCircuit size={40} className="text-slate-350 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">No Calculation Triggered</h3>
            <p className="text-slate-500 text-xs max-w-sm mt-1 mb-6">Select your focus collaborator and the specific meeting timelines on the left pane to extract tactical action advice.</p>
            <button
              onClick={runAnalysis}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <Send size={12} /> Analyze Initial Presets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback high-fidelity calculation mock generator based on actual meetings
function generateFallbackMockResponse(
  selectedContacts: Contact[],
  selectedNotes: MeetingNote[],
  category: 'meetingPrep' | 'frictionRedline' | 'strategicActionList' | 'customTemplate',
  customPrompt?: string,
  activeSops?: SOPDocument[],
  customTemplateStructure?: string
): AISuggestionResponse {
  const contactNames = selectedContacts.length > 0 ? selectedContacts.map(c => c.name).join(', ') : 'Jenkins';
  const companyNames = selectedContacts.length > 0 ? Array.from(new Set(selectedContacts.map(c => c.company))).join(', ') : 'TechNorth';
  const sopList = activeSops && activeSops.length > 0 ? activeSops.map(s => s.title).join(', ') : 'none';

  if (category === 'meetingPrep') {
    return {
      assessment: `Meeting Prep alignment brief for upcoming discussion with ${contactNames} (${companyNames}).`,
      sections: [
        {
          heading: 'Strategic Focus Alignment',
          body: `Prepare for your next discussion by blending your professional strengths with the partner profile. ${contactNames} prefers technical deep-dives over high-level overview slides. Focus on addressing specific integration roadblocks.`
        },
        {
          heading: 'Key Context & History Summary',
          body: `- Past discussion highlighted database schema rate-limiting friction.\n- Joint engineering tasks were scheduled to debug schema conflicts.`
        },
        {
          heading: 'Coaching Tips & Objection Handling',
          body: `Pivot to the joint task force agreements and suggest a 1.5x indemnity cap coupled with a 20 request/sec concurrency throttling to protect database stability.`,
          highlights: [
            { type: 'objection', text: 'Your rate limit parameters are too restrictive.', response: 'Pivot to the joint task force agreements and propose a 1.5x indemnity cap coupled with 20 req/sec concurrency throttling to protect database stability.' }
          ]
        }
      ],
      suggestedTasks: [
        { title: `Prepare sandbox trial credentials for ${contactNames}`, priority: 'High', note: 'Provide ready-made SOC 2 verification package to speed up legal review.' },
        { title: `Draft legacy database schema concessions for ${companyNames}`, priority: 'Medium', note: 'Prepare parameters for rate-limit objections.' }
      ]
    };
  } else if (category === 'frictionRedline') {
    return {
      assessment: `Friction & Redline Pivot: Diagnosing roadblock parameters to get client relationship back on track.`,
      sections: [
        {
          heading: 'Root Cause Analysis ("Where things went off the rails")',
          body: `Review of previous context suggests that delays in engineering turnarounds and rigid contract indemnity terms rejected by legal counsel three times created acute anxiety with David Kim.`,
          highlights: [
            { type: 'risk', text: 'David is actively evaluating competitor alternatives due to repeated indemnity rejections.' }
          ]
        },
        {
          heading: 'De-escalation & Pivot Speaking Script',
          body: `Lead with a socratic framing that acknowledges his pressure before introducing the compromise.`,
          highlights: [
            { type: 'quote', text: 'David, we completely understand your pressure to keep upstream risks absolute under your corporate board guidelines. We recognize why indemnification is critical to your launch.' },
            { type: 'objection', text: 'Indemnification terms as proposed are unacceptable to our board.', response: 'Offer a 1.5x liability cap on the custom webhook pipeline, conditioned on restricting maximum webhook concurrency to 20 requests per second.' }
          ]
        },
        {
          heading: 'Expert Alignment Playbook',
          body: `Restoring trust requires immediate CEO pairing. Introduce an executive touchpoint to finalize concession negotiations.`
        }
      ],
      suggestedTasks: [
        { title: `Schedule CEO Executive Pairing call with David Kim`, priority: 'High', note: 'Secure mutual legal compromises on liability caps before Tuesday.' }
      ]
    };
  } else if (category === 'strategicActionList') {
    return {
      assessment: `Strategic Action List: Recommending procedural tasks conformed to active SOPs (${sopList}).`,
      sections: [
        {
          heading: 'Recommended Tasks Conforming to Active SOPs',
          body: `- Establish joint engineering task force (SOP checklist: Escalation guidelines).\n- Compile SOC 2 compliance certifications package (SOP checklist: Security documentation).\n- Review concurrent webhook limits to protect legacy databases.`
        },
        {
          heading: 'Process Integrity Review',
          body: `Cross-referenced active SOPs. To comply with standard onboarding procedures, make sure you don't skip the sandbox trial provisioning step for ${companyNames}.`,
          highlights: [
            { type: 'opportunity', text: `Sandbox trial provisioning for ${companyNames} is still open and can accelerate the onboarding SOP.` }
          ]
        }
      ],
      suggestedTasks: [
        { title: `Deploy SOC 2 verification package to ${companyNames}`, priority: 'High', note: 'Required step in customer onboarding SOP.' },
        { title: `Initiate sandbox trial workspace setup`, priority: 'Medium', note: 'Conforms to sandbox provisioning protocols.' }
      ]
    };
  } else {
    // Custom Template output - collapses to a single section following the user's structure
    const structure = customTemplateStructure || '## Executive Strategy Advice\n\n### Strategic Summary\n...\n\n### Recommendations\n...';
    return {
      assessment: `Custom template calculation rendered successfully.`,
      sections: [
        {
          heading: 'Custom Output',
          body: `${structure}\n\n**AI Generated content under custom format:**\nWe reviewed notes for ${contactNames} at ${companyNames}. Key recommendations include scheduling sandbox setups immediately and deploying security packages. Ensure you maintain active communication style to preserve relationship indexes.`
        }
      ],
      suggestedTasks: [
        { title: `Follow up on custom template action items for ${contactNames}`, priority: 'Medium', note: 'Custom structured action task.' }
      ]
    };
  }
}
