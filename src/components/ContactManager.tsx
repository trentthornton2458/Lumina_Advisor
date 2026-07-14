import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Contact, MeetingNote, MyselfProfile, RelationshipStatus, TaskReminder, Company, BehavioralProfile } from '../types';
import {
  Building2, Mail, Phone, Linkedin, Search, Plus, Trash2, Edit2,
  Tag, NotebookTabs, X, Check, UserPlus, Sparkles, ClipboardList,
  CheckCircle2, Circle, AlertCircle, FileText, Bookmark
} from 'lucide-react';
import EmailDraftGenerator from './EmailDraftGenerator';
import MeetingPrepChecklist from './MeetingPrepChecklist';
import BehavioralIndexPanel from './BehavioralIndexPanel';

interface ContactManagerProps {
  contacts: Contact[];
  notes: MeetingNote[];
  tasks: TaskReminder[];
  profile?: MyselfProfile;
  companies: Company[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onAddCompany?: (company: Company) => void;
  onToggleTask?: (id: string) => void;
  triggerAdd?: number;
  behavioralProfiles: BehavioralProfile[];
  onSaveBehavioralProfile: (profile: BehavioralProfile) => void;
}

export default function ContactManager({
  contacts,
  notes,
  tasks,
  profile,
  companies,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onAddCompany,
  onToggleTask,
  triggerAdd,
  behavioralProfiles,
  onSaveBehavioralProfile
}: ContactManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    contacts.length > 0 ? contacts[0].id : null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [showPrepChecklist, setShowPrepChecklist] = useState(false);

  // States for form field values
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationStatus, setRelationStatus] = useState<RelationshipStatus>('Neutral');
  const [affiliation, setAffiliation] = useState<'Internal' | 'External'>('External');
  const [status, setStatus] = useState<'Bad' | 'Neutral' | 'Good' | 'Exceptional'>('Neutral');
  const [linkedin, setLinkedin] = useState('');
  const [notesField, setNotesField] = useState('');
  const [rawTags, setRawTags] = useState('');

  // States for Company Selector linkage
  const [selectedCompanyIdInForm, setSelectedCompanyIdInForm] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState<string>('');
  const [newCompanyDesc, setNewCompanyDesc] = useState<string>('');

  // States for list filtering
  const [filterAffiliation, setFilterAffiliation] = useState<'All' | 'Internal' | 'External'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Exceptional' | 'Good' | 'Neutral' | 'Bad'>('All');

  const filteredContacts = contacts.filter(c => {
    const searchString = `${c.name} ${c.position} ${c.company} ${c.tags.join(' ')} ${c.affiliation || 'External'}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesAffiliation = filterAffiliation === 'All' || (c.affiliation || 'External') === filterAffiliation;
    const matchesStatus = filterStatus === 'All' || (c.status || 'Neutral') === filterStatus;
    return matchesSearch && matchesAffiliation && matchesStatus;
  });

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
  const contactNotes = notes
    .filter(n => n.contactId === selectedContactId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const contactTasks = useMemo(() => 
    tasks
      .filter(t => t.contactId === selectedContactId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [tasks, selectedContactId]
  );

  const timelineEvents = useMemo(() => {
    const events: Array<
      | { type: 'note'; date: string; data: MeetingNote }
      | { type: 'task'; date: string; data: TaskReminder }
    > = [];

    notes
      .filter(n => n.contactId === selectedContactId)
      .forEach(n => events.push({ type: 'note', date: n.date, data: n }));

    tasks
      .filter(t => t.contactId === selectedContactId)
      .forEach(t => events.push({ type: 'task', date: t.dueDate, data: t }));

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, tasks, selectedContactId]);

  const resetForm = () => {
    setName('');
    setPosition('');
    setCompany('');
    setEmail('');
    setPhone('');
    setRelationStatus('Neutral');
    setAffiliation('External');
    setStatus('Neutral');
    setLinkedin('');
    setNotesField('');
    setRawTags('');
    setSelectedCompanyIdInForm('');
    setNewCompanyName('');
    setNewCompanyIndustry('');
    setNewCompanyDesc('');
  };

  // Listen for header trigger
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      startAdd();
    }
  }, [triggerAdd]);

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (c: Contact) => {
    setName(c.name);
    setPosition(c.position);
    setCompany(c.company);
    setEmail(c.email);
    setPhone(c.phone || '');
    setRelationStatus(c.relationStatus);
    setAffiliation(c.affiliation || 'External');
    setStatus(c.status || 'Neutral');
    setLinkedin(c.linkedin || '');
    setNotesField(c.notes || '');
    setRawTags(c.tags.join(', '));
    
    // Attempt to resolve companyId
    if (c.companyId) {
      setSelectedCompanyIdInForm(c.companyId);
    } else {
      const match = companies.find(cp => cp.name.toLowerCase() === c.company.toLowerCase());
      setSelectedCompanyIdInForm(match ? match.id : '');
    }
    setNewCompanyName('');
    setNewCompanyIndustry('');
    setNewCompanyDesc('');
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !position.trim()) {
      return;
    }

    let finalCompanyId = selectedCompanyIdInForm;
    let finalCompanyName = company.trim();

    if (selectedCompanyIdInForm === 'new') {
      if (!newCompanyName.trim()) {
        return;
      }
      const newCompId = 'cp_' + Date.now();
      const newCompanyObj: Company = {
        id: newCompId,
        name: newCompanyName.trim(),
        industry: newCompanyIndustry.trim() || undefined,
        description: newCompanyDesc.trim() || undefined
      };
      if (onAddCompany) {
        onAddCompany(newCompanyObj);
      }
      finalCompanyId = newCompId;
      finalCompanyName = newCompanyName.trim();
    } else if (selectedCompanyIdInForm) {
      const existingComp = companies.find(cp => cp.id === selectedCompanyIdInForm);
      if (existingComp) {
        finalCompanyId = existingComp.id;
        finalCompanyName = existingComp.name;
      }
    }

    const parsedTags = rawTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (isAdding) {
      const newContact: Contact = {
        id: 'c_' + Date.now(),
        name: name.trim(),
        position: position.trim(),
        company: finalCompanyName,
        companyId: finalCompanyId || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        relationStatus,
        affiliation,
        status,
        linkedin: linkedin.trim() || undefined,
        notes: notesField.trim() || undefined,
        tags: parsedTags
      };
      onAddContact(newContact);
      setSelectedContactId(newContact.id);
      setIsAdding(false);
    } else if (isEditing && selectedContactId) {
      const updatedContact: Contact = {
        id: selectedContactId,
        name: name.trim(),
        position: position.trim(),
        company: finalCompanyName,
        companyId: finalCompanyId || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        relationStatus,
        affiliation,
        status,
        linkedin: linkedin.trim() || undefined,
        notes: notesField.trim() || undefined,
        tags: parsedTags
      };
      onUpdateContact(updatedContact);
      setIsEditing(false);
    }
  };

  const executeDelete = (id: string) => {
    onDeleteContact(id);
    const remainingContacts = contacts.filter(c => c.id !== id);
    setSelectedContactId(remainingContacts.length > 0 ? remainingContacts[0].id : null);
    setDeleteConfirmId(null);
  };

  const getStatusColor = (status: RelationshipStatus) => {
    switch (status) {
      case 'Warm':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cold':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Neutral':
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStatusIndicatorColor = (status?: 'Bad' | 'Neutral' | 'Good' | 'Exceptional') => {
    switch (status) {
      case 'Bad':
        return 'bg-red-500 shadow-xs shadow-red-500/50';
      case 'Neutral':
        return 'bg-yellow-500 shadow-xs shadow-yellow-500/50';
      case 'Good':
        return 'bg-emerald-500 shadow-xs shadow-emerald-500/50';
      case 'Exceptional':
        return 'bg-blue-500 shadow-xs shadow-blue-500/50';
      default:
        return 'bg-yellow-500 shadow-xs shadow-yellow-500/50';
    }
  };

  return (
    <>
    <div id="contact-manager-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
      {/* Search and Sidebar list */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-xs border border-stone-200 p-4 flex flex-col h-[calc(100vh-220px)] lg:h-[700px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-stone-900 tracking-tight">Contacts ({contacts.length})</h2>
          <button
            id="add-contact-btn"
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
          <input
            id="search-contacts-input"
            type="text"
            placeholder="Search name, role, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-250 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-stone-400"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-stone-50/50 p-2 rounded-lg border border-stone-200">
          <div>
            <label className="block text-[9px] uppercase font-bold text-stone-450 tracking-wider mb-1">Affiliation</label>
            <select
              value={filterAffiliation}
              onChange={(e) => setFilterAffiliation(e.target.value as any)}
              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-700 font-semibold focus:outline-none focus:border-stone-400"
            >
              <option value="All">All types</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-stone-450 tracking-wider mb-1">Rating Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-700 font-semibold focus:outline-none focus:border-stone-400"
            >
              <option value="All">All grades</option>
              <option value="Exceptional">Exceptional (Blue)</option>
              <option value="Good">Good (Green)</option>
              <option value="Neutral">Neutral (Yellow)</option>
              <option value="Bad">Bad (Red)</option>
            </select>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              No contacts found matching criteria.
            </div>
          ) : (
            filteredContacts.map(c => (
              <button
                key={c.id}
                id={`contact-item-${c.id}`}
                onClick={() => {
                  setSelectedContactId(c.id);
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition border ${
                  selectedContactId === c.id && !isAdding
                    ? 'bg-stone-100/85 border-stone-300'
                    : 'border-transparent hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {/* Status Indicator color bubble to the left of their name */}
                  <span 
                    className={`w-3 h-3 rounded-full shrink-0 border border-white ${getStatusIndicatorColor(c.status)}`} 
                    title={`Status: ${c.status || 'Neutral'}`} 
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-stone-900 text-sm truncate">{c.name}</h3>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-semibold border uppercase tracking-wider ${
                        c.affiliation === 'Internal' 
                          ? 'bg-indigo-50 text-indigo-750 border-indigo-200/80' 
                          : 'bg-slate-50 text-slate-750 border-slate-200/80'
                      }`}>
                        {c.affiliation || 'External'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 truncate">{c.position} • {c.company}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${getStatusColor(c.relationStatus)}`}>
                  {c.relationStatus}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main detail or Form pane */}
      <div className="lg:col-span-8 h-[calc(100vh-220px)] lg:h-[700px] flex flex-col">
        {isAdding || isEditing ? (
          /* Create or Edit Form */
          <div id="contact-form-pane" className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-stone-900">
                {isAdding ? 'Create Professional Contact' : `Edit Profile: ${name}`}
              </h3>
              <button 
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="p-1 px-2.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-850 hover:bg-stone-50 text-xs transition"
              >
                Cancel
              </button>
            </div>

            <form id="contact-edit-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Carter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Relationship Status</label>
                  <select
                    value={relationStatus}
                    onChange={(e) => setRelationStatus(e.target.value as RelationshipStatus)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="Active">Active (Frequent communication)</option>
                    <option value="Warm">Warm (Good terms, occasional sync)</option>
                    <option value="Neutral">Neutral (Professional baseline)</option>
                    <option value="Cold">Cold (At risk, minimal engagement)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Affiliation Type</label>
                  <select
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value as 'Internal' | 'External')}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="External">External (Partner / Client)</option>
                    <option value="Internal">Internal (Company / Team Member)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Status Rating (Color Bullet)</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Bad' | 'Neutral' | 'Good' | 'Exceptional')}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="Exceptional">Exceptional (Blue)</option>
                    <option value="Good">Good (Green)</option>
                    <option value="Neutral">Neutral (Yellow)</option>
                    <option value="Bad">Bad / At Risk (Red)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Position / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Principal Lead Analyst"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Company Link *</label>
                  <select
                    value={selectedCompanyIdInForm}
                    onChange={(e) => setSelectedCompanyIdInForm(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500 font-medium text-slate-800"
                    required
                  >
                    <option value="">-- Select Company --</option>
                    {companies.map(cp => (
                      <option key={cp.id} value={cp.id}>{cp.name}</option>
                    ))}
                    <option value="new" className="text-blue-600 font-bold">+ Create New Company...</option>
                  </select>
                </div>
              </div>

              {selectedCompanyIdInForm === 'new' && (
                <div className="p-4 bg-blue-50/20 rounded-2xl border border-blue-100/50 flex flex-col gap-3.5 animate-glow-border">
                  <div className="font-bold text-[10px] text-blue-600 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Building2 size={12} /> Register New Business Entity
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">New Company Name *</label>
                      <input
                        type="text"
                        required={selectedCompanyIdInForm === 'new'}
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corporation"
                        className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Industry Sector</label>
                      <input
                        type="text"
                        value={newCompanyIndustry}
                        onChange={(e) => setNewCompanyIndustry(e.target.value)}
                        placeholder="e.g. Technology, Retail"
                        className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Company Description</label>
                    <textarea
                      value={newCompanyDesc}
                      onChange={(e) => setNewCompanyDesc(e.target.value)}
                      placeholder="Brief details about this client's operational context..."
                      rows={2}
                      className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. alice@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    placeholder="e.g. linkedin.com/in/username"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Category Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. SaaS, Decision Maker, Mentee"
                  value={rawTags}
                  onChange={(e) => setRawTags(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Private Context / Stakeholder Personality Notes</label>
                <textarea
                  placeholder="Describe preferences, alignment hurdles, family background, or personal connection milestones..."
                  rows={4}
                  value={notesField}
                  onChange={(e) => setNotesField(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500 resize-none"
                />
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
                  className="px-5 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-850 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        ) : selectedContact ? (
          /* Profile Details pane */
          <div id="contact-details-view" className="flex flex-col flex-1 gap-6 overflow-y-auto">
            {/* Header info card */}
            <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span 
                      className={`w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 ${getStatusIndicatorColor(selectedContact.status)}`}
                      title={`Status Rating: ${selectedContact.status || 'Neutral'}`}
                    />
                    <h2 className="text-xl font-semibold text-stone-900">{selectedContact.name}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusColor(selectedContact.relationStatus)}`}>
                      {selectedContact.relationStatus} Connection
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                      selectedContact.affiliation === 'Internal'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-slate-50 text-slate-650 border-slate-200'
                    }`}>
                      {selectedContact.affiliation || 'External'} Affiliation
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                      selectedContact.status === 'Exceptional' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedContact.status === 'Good' ? 'bg-emerald-50 text-emerald-750 border-emerald-250' :
                      selectedContact.status === 'Bad' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      Status: {selectedContact.status || 'Neutral'}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm mt-0.5 font-medium flex items-center gap-1.5">
                    <Building2 size={15} />
                    {selectedContact.position}, <span className="text-stone-750">{selectedContact.company}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="edit-contact-btn"
                    onClick={() => startEdit(selectedContact)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 text-xs font-semibold transition"
                  >
                    <Edit2 size={13} /> Edit Profile
                  </button>
                  {profile && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowPrepChecklist(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <ClipboardList size={13} /> Meeting Prep
                      </button>
                      <button
                        onClick={() => setShowEmailDraft(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <Sparkles size={13} /> Draft Email
                      </button>
                    </div>
                  )}
                  {deleteConfirmId === selectedContact.id ? (
                    <div className="flex items-center gap-1 border border-rose-200 bg-rose-50 rounded-lg pr-1 pl-3 py-0.5 animate-fade-in">
                      <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider mr-1">Confirm</span>
                      <button
                        onClick={() => executeDelete(selectedContact.id)}
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
                      id="delete-contact-btn"
                      onClick={() => setDeleteConfirmId(selectedContact.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 text-xs font-semibold transition animate-fade-in"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedContact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6 border-b border-stone-100 pb-4">
                  {selectedContact.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-stone-50 text-stone-650 rounded-md text-xs border border-stone-200/80">
                      <Tag size={11} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Background & Insight Briefing</h4>
                    <p className="text-stone-700 text-sm leading-relaxed bg-stone-50/80 p-3 rounded-lg border border-stone-150">
                      {selectedContact.notes || 'No custom notes provided for this collaborator profile.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Contact Coordinates</h4>
                  
                  {selectedContact.email && (
                    <div className="flex items-center gap-2.5 text-sm text-stone-700">
                      <Mail size={15} className="text-stone-400" />
                      <a href={`mailto:${selectedContact.email}`} className="hover:underline transition text-stone-800 break-all">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}

                  {selectedContact.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-stone-700">
                      <Phone size={15} className="text-stone-400" />
                      <span className="text-stone-850 font-mono text-xs">{selectedContact.phone}</span>
                    </div>
                  )}

                  {selectedContact.linkedin && (
                    <div className="flex items-center gap-2.5 text-sm text-stone-700">
                      <Linkedin size={15} className="text-stone-400" />
                      <a 
                        href={`https://${selectedContact.linkedin}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline transition text-stone-600 truncate max-w-[180px] text-xs font-mono"
                      >
                        {selectedContact.linkedin}
                      </a>
                    </div>
                  )}

                  {!selectedContact.email && !selectedContact.phone && !selectedContact.linkedin && (
                    <p className="text-xs text-stone-400 italic">No coordinates cataloged.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Relationship & Behavioral Index */}
            <BehavioralIndexPanel
              contact={selectedContact}
              contactNotes={contactNotes}
              profile={profile}
              behavioralProfile={behavioralProfiles.find(p => p.contactId === selectedContact.id)}
              onSaveProfile={onSaveBehavioralProfile}
            />

            {/* Unified Contact Relationship Timeline */}
            <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 flex-1 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
                  <NotebookTabs size={15} /> Interaction Timeline ({timelineEvents.length})
                </h3>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Notes
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Tasks
                  </span>
                </div>
              </div>

              <div className="relative flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-1">
                {timelineEvents.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-sm italic flex flex-col items-center justify-center">
                    <Bookmark size={28} className="text-stone-300 mb-2" />
                    No interactions or tasks logged yet with {selectedContact.name}.
                  </div>
                ) : (
                  <div className="relative border-l border-stone-200 pl-4 ml-3 space-y-5 py-2">
                    {timelineEvents.map(event => {
                      if (event.type === 'note') {
                        const note = event.data;
                        const isPositive = note.sentimentScore >= 8;
                        const isNegative = note.sentimentScore < 5;
                        const sentimentColor = isPositive 
                          ? 'bg-emerald-500' 
                          : isNegative 
                            ? 'bg-rose-500' 
                            : 'bg-blue-500';
                        const cardStyle = isPositive
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isNegative
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-slate-200 bg-slate-50/40';

                        return (
                          <div key={note.id} className="relative group">
                            {/* Timeline dot */}
                            <div className={`absolute -left-[21.5px] top-1.5 w-3 h-3 rounded-full ${sentimentColor} border-2 border-white shadow-xs z-10`} />
                            
                            <div className={`border rounded-xl p-4 transition shadow-xs hover:shadow-md ${cardStyle}`}>
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">{note.date}</span>
                                    <span className="text-[9px] bg-white border border-stone-200 px-2 py-0.5 rounded-full text-stone-600 font-semibold uppercase">
                                      {note.category}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-stone-900 text-sm mt-1">{note.title}</h4>
                                  <p className="text-xs text-stone-600 leading-relaxed mt-2 whitespace-pre-wrap">{note.content.slice(0, 250)}{note.content.length > 250 ? '...' : ''}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="text-[10px] bg-white border border-stone-150 px-2 py-1 rounded-md text-stone-600 font-bold font-mono">
                                    Sentiment: {note.sentimentScore}/10
                                  </span>
                                </div>
                              </div>
                              {note.keyPoints && note.keyPoints.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-dashed border-stone-200/60">
                                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Key Outcomes:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {note.keyPoints.map((kp, idx) => (
                                      <span key={idx} className="text-xs bg-white text-stone-700 px-2 py-0.5 rounded border border-stone-150">
                                        • {kp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        const task = event.data;
                        const priorityColor = task.priority === 'High' 
                          ? 'bg-rose-50 border-rose-200 text-rose-700' 
                          : task.priority === 'Medium'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-slate-50 border-slate-200 text-slate-650';

                        return (
                          <div key={task.id} className="relative group">
                            {/* Timeline dot */}
                            <div className="absolute -left-[21.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-xs z-10" />
                            
                            <div className={`border rounded-xl p-3.5 transition shadow-xs hover:shadow-md bg-white border-stone-200 flex items-center justify-between gap-4 ${task.completed ? 'opacity-65' : ''}`}>
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => onToggleTask?.(task.id)}
                                  className="mt-0.5 text-stone-400 hover:text-indigo-600 transition shrink-0"
                                  title={task.completed ? "Mark pending" : "Mark completed"}
                                >
                                  {task.completed ? (
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </button>
                                <div>
                                  <h4 className={`text-xs font-semibold text-stone-900 ${task.completed ? 'line-through text-stone-400 font-medium' : ''}`}>
                                    {task.title}
                                  </h4>
                                  <span className="text-[10px] font-mono text-stone-400 block mt-0.5">Due: {task.dueDate}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${priorityColor}`}>
                                  {task.priority} Priority
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center flex-1 flex flex-col justify-center items-center">
            <UserPlus size={40} className="text-stone-300 mb-3" />
            <h3 className="font-medium text-stone-900 text-lg">No Contacts Registered</h3>
            <p className="text-stone-500 text-sm max-w-sm mt-1 mb-4">Add your professional contact relationships to analyze meeting engagement and leverage key insights.</p>
            <button
              onClick={startAdd}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition"
            >
              Add Your First Contact
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Email Draft Generator Modal */}
    <AnimatePresence>
      {showEmailDraft && selectedContact && profile && (
        <EmailDraftGenerator
          contact={selectedContact}
          notes={notes}
          profile={profile}
          onClose={() => setShowEmailDraft(false)}
        />
      )}
    </AnimatePresence>

    {/* Meeting Prep Checklist Modal */}
    <AnimatePresence>
      {showPrepChecklist && selectedContact && (
        <MeetingPrepChecklist
          contact={selectedContact}
          notes={notes}
          tasks={tasks}
          profile={profile!}
          onClose={() => setShowPrepChecklist(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
