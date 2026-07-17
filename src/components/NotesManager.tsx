import React, { useState, useEffect } from 'react';
import { MeetingNote, Contact, NoteCategory } from '../types';
import {
  Calendar, Search, Filter, Plus, Trash2, Edit3, Tag,
  User, Users, Check, CheckSquare, Smile, Eye, MessageSquareCode, Sparkles, NotebookTabs, Lock, X, Loader2, GraduationCap
} from 'lucide-react';
import { noteInvolvesContact, getNoteAttendeeIds, generateFallbackNoteInsights } from '../lib/noteUtils';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';

interface NotesManagerProps {
  notes: MeetingNote[];
  contacts: Contact[];
  onAddNote: (note: MeetingNote) => void;
  onUpdateNote: (note: MeetingNote) => void;
  onDeleteNote: (id: string) => void;
  triggerAdd?: number;
  selectedNoteId?: string | null;
  onSelectNote?: (id: string | null) => void;
  onLoadDemoAssets?: () => void;
}

export default function NotesManager({
  notes,
  contacts,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  triggerAdd,
  selectedNoteId: propSelectedNoteId,
  onSelectNote,
  onLoadDemoAssets
}: NotesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'All'>('All');
  
  const [localSelectedNoteId, setLocalSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );

  const selectedNoteId = propSelectedNoteId !== undefined ? propSelectedNoteId : localSelectedNoteId;
  
  const setSelectedNoteId = (id: string | null) => {
    if (onSelectNote) {
      onSelectNote(id);
    } else {
      setLocalSelectedNoteId(id);
    }
  };

  // Sync prop changes
  useEffect(() => {
    if (propSelectedNoteId !== undefined && propSelectedNoteId !== null) {
      setLocalSelectedNoteId(propSelectedNoteId);
    }
  }, [propSelectedNoteId]);

  // Set initial selected note if none is set
  useEffect(() => {
    if (selectedNoteId === null && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contactId, setContactId] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [category, setCategory] = useState<NoteCategory>('Discovery');
  const [content, setContent] = useState('');
  const [sentimentScore, setSentimentScore] = useState(5);
  const [engagementLevel, setEngagementLevel] = useState(5);
  const [keyPointInput, setKeyPointInput] = useState('');
  const [keyPointsList, setKeyPointsList] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [insights, setInsights] = useState<string | undefined>(undefined);
  const [coachingOpportunities, setCoachingOpportunities] = useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsSimulated, setInsightsSimulated] = useState(false);

  // Filter notes view: 'standard' or 'private'
  const [noteViewFilter, setNoteViewFilter] = useState<'standard' | 'private'>('standard');

  const { showToast } = useToast();
  const { user } = useAuth();

  const categories: Array<NoteCategory | 'All'> = [
    'All', 'Discovery', 'Demo', 'Client Pitch', 'Negotiation', 'Onboarding',
    'Strategy Sync', 'QBR', 'Renewal', 'Escalation', 'Support', 'Internal', 'Catch-up', 'Follow-up'
  ];

  // Sorting and filtering notes
  const filteredNotes = notes
    .filter(note => {
      const matchesPrivacy = noteViewFilter === 'private' ? note.isPrivate === true : !note.isPrivate;
      const attendeeNames = getNoteAttendeeIds(note)
        .map(id => contacts.find(c => c.id === id)?.name || '')
        .join(' ');
      const textMatch = `${note.title} ${note.content} ${attendeeNames} ${note.keyPoints.join(' ')}`.toLowerCase();
      const matchesSearch = textMatch.includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
      return matchesPrivacy && matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;
  const linkedContact = selectedNote ? contacts.find(c => c.id === selectedNote.contactId) : null;
  const otherAttendees = selectedNote
    ? (selectedNote.attendeeIds || []).map(id => contacts.find(c => c.id === id)).filter((c): c is Contact => !!c)
    : [];

  const handleAddKeyPoint = () => {
    if (keyPointInput.trim()) {
      setKeyPointsList([...keyPointsList, keyPointInput.trim()]);
      setKeyPointInput('');
    }
  };

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPointsList(keyPointsList.filter((_, i) => i !== index));
  };

  const handleToggleAttendee = (id: string) => {
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleAddKeyPointOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyPoint();
    }
  };

  const startAdd = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setContactId(contacts.length > 0 ? contacts[0].id : '');
    setAttendeeIds([]);
    setCategory('Discovery');
    setContent('');
    setSentimentScore(6);
    setEngagementLevel(6);
    setKeyPointInput('');
    setKeyPointsList([]);
    setIsPrivate(false);
    setInsights(undefined);
    setCoachingOpportunities([]);
    setInsightsSimulated(false);
    setIsAdding(true);
    setIsEditing(false);
  };

  // Listen for header trigger
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      startAdd();
    }
  }, [triggerAdd]);

  const startEdit = (note: MeetingNote) => {
    setTitle(note.title);
    setDate(note.date);
    setContactId(note.contactId || '');
    setAttendeeIds(note.attendeeIds || []);
    setCategory(note.category);
    setContent(note.content);
    setSentimentScore(note.sentimentScore);
    setEngagementLevel(note.engagementLevel);
    setKeyPointInput('');
    setKeyPointsList(note.keyPoints);
    setIsPrivate(note.isPrivate || false);
    setInsights(note.insights);
    setCoachingOpportunities(note.coachingOpportunities || []);
    setInsightsSimulated(false);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleGenerateInsights = async () => {
    if (!content.trim()) {
      showToast('Add some conversation content before generating insights.', 'warning');
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const attendeeNames = [contactId, ...attendeeIds]
        .map(id => contacts.find(c => c.id === id)?.name)
        .filter(Boolean);

      const response = await authedFetch('/api/note-insights', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content, attendeeNames })
      });

      if (!response.ok) {
        throw new Error('Server returned an error status while analyzing the note.');
      }

      const resData = await response.json();

      if (resData.status === 'error' && (resData.errorType === 'apiKeyMissing' || resData.errorType === 'apiServiceUnavailable')) {
        const fallback = generateFallbackNoteInsights(content, sentimentScore, engagementLevel);
        applyInsightsResult(fallback);
        showToast('AI unavailable — extracted key points locally instead (simulation mode).', 'info');
      } else if (resData.status === 'success' && resData.data) {
        applyInsightsResult(resData.data);
        showToast('Insights generated — key points and sentiment sliders updated.', 'success');
      } else {
        throw new Error('Received unexpected response while generating insights.');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate insights.', 'error');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const applyInsightsResult = (result: { keyPoints: string[]; insights: string; coachingOpportunities: string[]; sentimentScore: number; engagementLevel: number; isSimulated?: boolean }) => {
    setKeyPointsList(result.keyPoints);
    setInsights(result.insights);
    setCoachingOpportunities(result.coachingOpportunities || []);
    setSentimentScore(result.sentimentScore);
    setEngagementLevel(result.engagementLevel);
    setInsightsSimulated(!!result.isSimulated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      return;
    }

    const finalKeyPoints = [...keyPointsList];
    if (keyPointInput.trim()) {
      finalKeyPoints.push(keyPointInput.trim());
    }

    // Never let the primary contact double up inside the attendees list
    const finalAttendeeIds = attendeeIds.filter(id => id !== contactId);

    if (isAdding) {
      const newNote: MeetingNote = {
        id: 'n_' + Date.now(),
        date,
        title: title.trim(),
        contactId: contactId || undefined,
        attendeeIds: finalAttendeeIds.length > 0 ? finalAttendeeIds : undefined,
        category,
        content: content.trim(),
        sentimentScore,
        engagementLevel,
        keyPoints: finalKeyPoints,
        insights,
        coachingOpportunities: coachingOpportunities.length > 0 ? coachingOpportunities : undefined,
        isPrivate
      };
      onAddNote(newNote);
      setSelectedNoteId(newNote.id);
      setIsAdding(false);
    } else if (isEditing && selectedNoteId) {
      const existing = notes.find(n => n.id === selectedNoteId);
      const updatedNote: MeetingNote = {
        id: selectedNoteId,
        date,
        title: title.trim(),
        contactId: contactId || undefined,
        attendeeIds: finalAttendeeIds.length > 0 ? finalAttendeeIds : undefined,
        category,
        content: content.trim(),
        sentimentScore,
        engagementLevel,
        keyPoints: finalKeyPoints,
        insights: insights ?? existing?.insights,
        coachingOpportunities: coachingOpportunities.length > 0 ? coachingOpportunities : existing?.coachingOpportunities,
        isPrivate
      };
      onUpdateNote(updatedNote);
      setIsEditing(false);
    }
  };

  const executeDelete = (id: string) => {
    onDeleteNote(id);
    const remains = notes.filter(n => n.id !== id);
    setSelectedNoteId(remains.length > 0 ? remains[0].id : null);
    setDeleteConfirmId(null);
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 8) return { text: 'highly positive', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    if (score >= 6) return { text: 'cooperative / warm', bg: 'bg-green-50 text-green-700 border-green-200' };
    if (score >= 4) return { text: 'neutral / transactional', bg: 'bg-stone-50 text-stone-700 border-stone-200' };
    return { text: 'strained / hostile', bg: 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse' };
  };

  return (
    <div id="notes-manager-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
      {/* Sidebar List and filters */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-xs border border-stone-200 p-4 flex flex-col h-[calc(100vh-220px)] lg:h-[700px]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">Notes Database</h2>
          <button
            id="add-note-btn"
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-850 transition"
          >
            <Plus size={14} /> Log Note
          </button>
        </div>

        {/* Private vs Public Sub-Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-stone-50 p-1.5 rounded-lg border border-stone-200 mb-3 text-2xs font-semibold">
          <button
            onClick={() => {
              setNoteViewFilter('standard');
              setSelectedNoteId(null);
            }}
            className={`py-1.5 rounded-md transition text-center ${
              noteViewFilter === 'standard' ? 'bg-white text-slate-900 border border-slate-200/50 font-bold shadow-2xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Standard Notes
          </button>
          <button
            onClick={() => {
              setNoteViewFilter('private');
              setSelectedNoteId(null);
            }}
            className={`py-1.5 rounded-md transition text-center flex items-center justify-center gap-1 ${
              noteViewFilter === 'private' ? 'bg-white text-slate-900 border border-slate-200/50 font-bold shadow-2xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Lock size={10} /> Private Notes
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
            <input
              id="search-notes-input"
              type="text"
              placeholder="Search content, summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-250 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Quick categories pills */}
          <div className="flex flex-wrap gap-1 pt-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] px-2 py-1 rounded-md border font-medium transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm italic">
              No notes captured under these parameters.
            </div>
          ) : (
            filteredNotes.map(n => {
              const contact = contacts.find(c => c.id === n.contactId);
              return (
                <button
                  key={n.id}
                  id={`note-item-${n.id}`}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition border text-sm flex flex-col gap-1.5 ${
                    selectedNoteId === n.id && !isAdding
                      ? 'bg-stone-100/90 border-stone-300'
                      : 'border-stone-100 hover:bg-stone-50/80 bg-stone-50/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 w-full">
                    <span className="text-[10px] font-mono text-stone-400 font-semibold flex items-center gap-1">
                      {n.isPrivate && <Lock size={10} className="text-blue-500 shrink-0" />}
                      {n.date}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-stone-200 text-stone-700 font-semibold rounded uppercase tracking-wider">
                      {n.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-900 line-clamp-1">{n.title}</h3>
                  {contact && (
                    <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                      <User size={10} className="text-stone-400" /> {contact.name}
                      {(n.attendeeIds?.length || 0) > 0 && (
                        <span className="text-stone-400 font-normal">+{n.attendeeIds!.length} other{n.attendeeIds!.length > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  )}
                  {n.keyPoints.length > 0 && (
                    <div className="text-[11px] text-stone-450 line-clamp-1 truncate italic">
                      • {n.keyPoints[0]}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main details or editor panel */}
      <div className="lg:col-span-8 h-[calc(100vh-220px)] lg:h-[700px] flex flex-col">
        {isAdding || isEditing ? (
          /* Editor UI */
          <div id="note-form-pane" className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 overflow-y-auto flex-1">
            <h3 className="text-lg font-medium text-stone-900 mb-5">
              {isAdding ? 'Log New Conversation / Note' : `Edit Note: ${title}`}
            </h3>

            <form id="note-edit-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Title / Meeting Matter *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sync regarding pricing redlines"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Interactions Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Primary Contact</label>
                  <select
                    value={contactId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setContactId(newId);
                      // Don't let the same person sit in both roles at once
                      setAttendeeIds(prev => prev.filter(id => id !== newId));
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="">-- No linked collaborator --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Meeting Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NoteCategory)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="Discovery">Discovery (Introductory Context)</option>
                    <option value="Demo">Demo (Product Walkthrough)</option>
                    <option value="Client Pitch">Client Pitch (Pitch / Proposal)</option>
                    <option value="Negotiation">Negotiation (Contract / Pricing discussion)</option>
                    <option value="Onboarding">Onboarding (New Client Ramp-up)</option>
                    <option value="Strategy Sync">Strategy Sync (Formal Planning)</option>
                    <option value="QBR">QBR (Quarterly Business Review)</option>
                    <option value="Renewal">Renewal (Contract Renewal Discussion)</option>
                    <option value="Escalation">Escalation (Urgent Issue / De-escalation)</option>
                    <option value="Support">Support (Issue Resolution)</option>
                    <option value="Internal">Internal (Team-only, no client present)</option>
                    <option value="Catch-up">Catch-up (Informal / Coffee networking)</option>
                    <option value="Follow-up">Follow-up (Brief sync / Next actions)</option>
                  </select>
                </div>
              </div>

              {/* Additional attendees */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Users size={12} /> Additional Attendees
                  <span className="normal-case font-medium text-stone-400 tracking-normal">— everyone else who was in this meeting</span>
                </label>
                {attendeeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attendeeIds.map(id => {
                      const c = contacts.find(ct => ct.id === id);
                      if (!c) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-stone-800 text-white text-xs font-medium rounded-full"
                        >
                          {c.name}
                          <button
                            type="button"
                            onClick={() => handleToggleAttendee(id)}
                            aria-label={`Remove ${c.name} from attendees`}
                            className="hover:bg-white/20 rounded-full p-0.5 transition"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="border border-stone-200 rounded-lg p-2 bg-stone-50/50 max-h-[110px] overflow-y-auto space-y-1">
                  {contacts.filter(c => c.id !== contactId).length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-2 text-center">No other contacts to add.</p>
                  ) : (
                    contacts.filter(c => c.id !== contactId).map(c => {
                      const isSelected = attendeeIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleAttendee(c.id)}
                          className="w-full flex items-center justify-between text-left text-xs font-medium text-stone-700 hover:text-stone-900 px-1.5 py-1 rounded hover:bg-stone-100"
                        >
                          <span className="truncate">{c.name} <span className="text-stone-400 font-normal">({c.company})</span></span>
                          <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 ml-2 ${
                            isSelected ? 'bg-stone-900 border-stone-900 text-white' : 'border-stone-300 bg-white'
                          }`}>
                            {isSelected && <Check size={9} />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="is-private-checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-stone-300 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is-private-checkbox" className="text-xs font-bold text-stone-600 select-none uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                  <Lock size={12} className="text-blue-500" /> Save as Private Note (Hidden from standard logs)
                </label>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Sentiment Score ({sentimentScore}/10)</label>
                    <span className="text-[10px] text-stone-400 italic">Tone & Positivity</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sentimentScore}
                    onChange={(e) => setSentimentScore(Number(e.target.value))}
                    className="w-full accent-stone-800"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 mt-1">
                    <span>1: Hostile</span>
                    <span>5: Neutral</span>
                    <span>10: Perfect Alignment</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Engagement Level ({engagementLevel}/10)</label>
                    <span className="text-[10px] text-stone-400 italic">Attention & Focus</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={engagementLevel}
                    onChange={(e) => setEngagementLevel(Number(e.target.value))}
                    className="w-full accent-stone-700"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 mt-1">
                    <span>1: Distracted/Quiet</span>
                    <span>5: Attentive</span>
                    <span>10: Highly Engaged</span>
                  </div>
                </div>
              </div>

              {/* Key points builder */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Core Takeaways / Key Points</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add one critical outcome point..."
                    value={keyPointInput}
                    onChange={(e) => setKeyPointInput(e.target.value)}
                    onKeyDown={handleAddKeyPointOnKeyDown}
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyPoint}
                    className="px-3 py-2 bg-stone-800 text-white rounded-lg text-xs hover:bg-stone-750 font-medium whitespace-nowrap"
                  >
                    Add Point
                  </button>
                </div>
                {keyPointsList.length > 0 && (
                  <ul className="space-y-1 bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs">
                    {keyPointsList.map((pt, i) => (
                      <li key={i} className="flex justify-between items-center gap-4 text-stone-700 pl-2 border-l-2 border-stone-400">
                        <span>{pt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyPoint(i)}
                          className="text-stone-400 hover:text-rose-500 transition px-1 text-[10px] font-semibold"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Full Conversational Narrative / Meeting Draft Detail</label>
                <textarea
                  required
                  placeholder="Record full details, specific quotes, proposals discussed, organizational roadblocks, or strategic questions raised..."
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500 resize-none font-sans"
                />
              </div>

              {/* AI-generated insights */}
              <div className="border border-dashed border-stone-300 rounded-xl p-4 bg-stone-50/60">
                <button
                  type="button"
                  onClick={handleGenerateInsights}
                  disabled={isGeneratingInsights || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
                >
                  {isGeneratingInsights ? (
                    <><Loader2 size={14} className="animate-spin" /> Analyzing Conversation...</>
                  ) : (
                    <><Sparkles size={14} /> Generate Insights from Conversation</>
                  )}
                </button>
                <p className="text-[10px] text-stone-450 text-center mt-1.5">
                  Extracts key points, coaching opportunities, and suggests Sentiment/Engagement above from the narrative you've written.
                </p>

                {(insights || coachingOpportunities.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-dashed border-stone-250 space-y-3">
                    {insightsSimulated && (
                      <span className="inline-block text-[9px] px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-bold uppercase tracking-wider">
                        Simulation Mode — AI unavailable
                      </span>
                    )}
                    {insights && (
                      <div>
                        <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Conversation Insights</h5>
                        <p className="text-xs text-stone-700 leading-relaxed">{insights}</p>
                      </div>
                    )}
                    {coachingOpportunities.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <GraduationCap size={12} /> Coaching Opportunities
                        </h5>
                        <ul className="space-y-1">
                          {coachingOpportunities.map((tip, i) => (
                            <li key={i} className="text-xs text-blue-900 bg-blue-50 border border-blue-150 rounded-lg px-2.5 py-1.5">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="px-4 py-2 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition"
                >
                  Save Log entry
                </button>
              </div>
            </form>
          </div>
        ) : selectedNote ? (
          /* Details Pane */
          <div id="note-details-view" className="flex flex-col flex-1 gap-6 overflow-y-auto">
            {/* Main content view */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-7 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-lg font-bold font-mono tracking-wide">
                      {selectedNote.category}
                    </span>
                    {selectedNote.isPrivate && (
                      <span className="text-[10px] px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                        <Lock size={10} /> Private Note
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar size={13} /> {selectedNote.date}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">{selectedNote.title}</h2>
                  
                  {linkedContact && (
                    <div id="linked-contact-box" className="mt-3.5 flex flex-wrap items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl font-medium">
                      <User size={14} className="text-slate-500 shrink-0" />
                      Collaborator:
                      <span className="text-slate-950 font-bold">{linkedContact.name}</span>
                      <span className="text-slate-450 font-normal">({linkedContact.position} at {linkedContact.company})</span>
                    </div>
                  )}
                  {otherAttendees.length > 0 && (
                    <div id="other-attendees-box" className="mt-2 flex flex-wrap items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl font-medium">
                      <Users size={14} className="text-slate-500 shrink-0" />
                      Also present:
                      {otherAttendees.map((c, i) => (
                        <span key={c!.id} className="text-slate-700 font-semibold">
                          {c!.name}{i < otherAttendees.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto sm:ml-0 shrink-0">
                  <button
                    id="edit-note-btn"
                    onClick={() => startEdit(selectedNote)}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
                  >
                    <Edit3 size={13} /> Edit Note
                  </button>
                  {deleteConfirmId === selectedNote.id ? (
                    <div className="flex items-center gap-1 border border-rose-200 bg-rose-50 rounded-xl pr-1.5 pl-3 py-1 animate-fade-in">
                      <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider mr-1.5">Confirm</span>
                      <button
                        onClick={() => executeDelete(selectedNote.id)}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs font-semibold transition shadow-sm"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-xs font-semibold transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      id="delete-note-btn"
                      onClick={() => setDeleteConfirmId(selectedNote.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 text-xs font-bold transition animate-fade-in shadow-2xs"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Sentiment & Engagement metrics panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100/80 mb-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-550 uppercase tracking-wider mb-2 font-mono">
                    <span>Meeting Sentiment</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedNote.sentimentScore}/10</span>
                  </div>
                  
                  {/* Gauge Bar */}
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedNote.sentimentScore >= 8 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                        selectedNote.sentimentScore >= 6 ? 'bg-green-400' :
                        selectedNote.sentimentScore >= 4 ? 'bg-slate-400' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      }`}
                      style={{ width: `${selectedNote.sentimentScore * 10}%` }}
                    />
                  </div>

                  <span className={`inline-block text-[10px] mt-2.5 px-2 py-0.5 font-bold rounded-full border tracking-wide uppercase ${getSentimentLabel(selectedNote.sentimentScore).bg}`}>
                    {getSentimentLabel(selectedNote.sentimentScore).text}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-550 uppercase tracking-wider mb-2 font-mono">
                    <span>Stakeholder Engagement</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedNote.engagementLevel}/10</span>
                  </div>
                  
                  {/* Engagement bar */}
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-800 rounded-full transition-all duration-500"
                      style={{ width: `${selectedNote.engagementLevel * 10}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2.5 italic font-medium">
                    {selectedNote.engagementLevel >= 8 ? 'Strong focus and collaborative exploration' :
                     selectedNote.engagementLevel >= 5 ? 'Standard dialogue attendance' : 'Low feedback or frequent disruption'}
                  </p>
                </div>
              </div>

              {/* Core takeaways bulleted */}
              {selectedNote.keyPoints.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-slate-500" /> Logged Key Takeaways & Critical Decisions
                  </h4>
                  <ul className="space-y-2">
                    {selectedNote.keyPoints.map((pt, i) => (
                      <li key={i} className="flex gap-2.5 text-slate-800 text-xs leading-relaxed pl-3 border-l-2 border-slate-900">
                        <span className="font-bold text-slate-950 select-none font-mono">{String(i+1).padStart(2, '0')}.</span>
                        <span className="font-medium">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Narrative block */}
              <div className="mb-6 flex-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                  <Smile size={14} className="text-slate-500" /> Conversational Narrative
                </h4>
                <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50/30 p-4.5 rounded-2xl border border-slate-100 font-medium">
                  {selectedNote.content}
                </div>
              </div>

              {/* Inline AI insights summary if present */}
              {selectedNote.insights ? (
                <div id="ai-insight-panel" className="bg-gradient-to-br from-indigo-50/40 to-blue-50/20 rounded-2xl p-5 border border-indigo-100/40 flex items-start gap-4 mt-4 shadow-sm">
                  <div className="p-2.5 bg-slate-950 rounded-xl text-white shrink-0 shadow-md">
                    <Sparkles size={16} className="text-amber-400 fill-amber-400/20 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      Personal Coach AI Analysis
                    </h4>
                    <p className="text-xs text-slate-655 mt-2 leading-relaxed font-semibold">
                      {selectedNote.insights}
                    </p>
                    {selectedNote.coachingOpportunities && selectedNote.coachingOpportunities.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-indigo-100/40">
                        <h5 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                          <GraduationCap size={13} /> Coaching Opportunities
                        </h5>
                        <ul className="space-y-1.5">
                          {selectedNote.coachingOpportunities.map((tip, i) => (
                            <li key={i} className="text-xs text-blue-900 bg-blue-50/80 border border-blue-100/40 rounded-xl px-3.5 py-2 font-medium">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-2 font-medium">
                  <MessageSquareCode size={15} className="text-slate-450" />
                  <span>No AI insights generated for this note yet. Open <strong>Edit Note</strong> and use "Generate Insights from Conversation".</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center flex-1 flex flex-col justify-center items-center">
            <NotebookTabs size={40} className="text-stone-300 mb-3" />
            <h3 className="font-medium text-stone-900 text-lg">No Meeting Logs Recorded</h3>
            <p className="text-stone-500 text-sm max-w-sm mt-1 mb-4">Log meeting contexts, phone conversations, client pitches or key personal reviews to start analyzing trends.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={startAdd}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition"
              >
                Add Your First Note
              </button>
              {onLoadDemoAssets && (
                <button
                  id="load-demo-assets-btn"
                  onClick={onLoadDemoAssets}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  Load Demo Assets
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
