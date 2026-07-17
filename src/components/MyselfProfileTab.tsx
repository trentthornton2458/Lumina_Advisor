import React, { useState, useRef } from 'react';
import { MyselfProfile, Contact, MeetingNote, TaskReminder, PersonalNote } from '../types';
import {
  User, Briefcase, Award, MessageSquare, Target, Info,
  Edit2, Check, X, ShieldAlert, Sparkles, MapPin, Users,
  Database, Download, Upload, FileSpreadsheet, Trash2, Loader2, Scale
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { deleteUserData } from '../lib/userDataService';
import { LegalDocument } from './LegalDocument';
import PersonalNotesManager from './PersonalNotesManager';
import PrivacySettings from './PrivacySettings';

interface MyselfProfileTabProps {
  profile: MyselfProfile;
  onUpdateProfile: (profile: MyselfProfile) => void;
  activeSubTab?: string;
  contacts?: Contact[];
  notes?: MeetingNote[];
  tasks?: TaskReminder[];
  onImportData?: (imported: { contacts: Contact[]; notes: MeetingNote[]; tasks: TaskReminder[]; profile: MyselfProfile }) => void;
  personalNotes?: PersonalNote[];
  onAddPersonalNote?: (note: PersonalNote) => void;
  onUpdatePersonalNote?: (note: PersonalNote) => void;
  onDeletePersonalNote?: (id: string) => void;
  onWipeAllData?: () => void;
}

export default function MyselfProfileTab({
  profile,
  onUpdateProfile,
  activeSubTab = 'overview',
  contacts = [],
  notes = [],
  tasks = [],
  onImportData,
  personalNotes = [],
  onAddPersonalNote,
  onUpdatePersonalNote,
  onDeletePersonalNote,
  onWipeAllData
}: MyselfProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Account deletion flow
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirming' | 'deleting'>('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy'>('terms');

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    setDeleteStep('deleting');
    try {
      await deleteUserData(user.uid);
      [
        'c_notes_contacts', 'c_notes_notes', 'c_notes_tasks', 'c_notes_profile',
        'c_notes_companies', 'c_notes_sops', 'c_notes_advisor_reports', 'c_notes_behavioral_profiles',
        'c_notes_active_tab', 'c_notes_tab_order', 'lumina_dark_mode', 'lumina_setup_completed',
        'c_notes_self_org_placements', 'c_notes_personal_notes',
      ].forEach(key => localStorage.removeItem(key));
      await deleteUser(auth.currentUser);
      showToast('Your account and all associated data have been permanently deleted.', 'success');
      // deleteUser() signs the account out; MainApp's auth listener will return to the Login screen.
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        showToast('For security, please sign out and sign back in, then try deleting your account again.', 'error', 8000);
      } else {
        showToast('Failed to delete account: ' + (err?.message || 'an unexpected error occurred'), 'error');
      }
      setDeleteStep('confirming');
    }
  };

  // Fields state
  const [name, setName] = useState(profile.name);
  const [position, setPosition] = useState(profile.position);
  const [company, setCompany] = useState(profile.company);
  const [companyLocation, setCompanyLocation] = useState(profile.companyLocation || '');
  const [companySize, setCompanySize] = useState(profile.companySize || '');
  const [companySummary, setCompanySummary] = useState(profile.companySummary || '');
  const [personality, setPersonality] = useState(profile.personality);
  const [coreStrengths, setCoreStrengths] = useState(profile.coreStrengths);
  const [communicationStyle, setCommunicationStyle] = useState(profile.communicationStyle);
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals);
  const [extraDetails, setExtraDetails] = useState(profile.extraDetails || '');
  const [profilePicture, setProfilePicture] = useState(profile.profilePicture || '');

  const MAX_PROFILE_PICTURE_BYTES = 500 * 1024; // 500KB

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        if (e.target) e.target.value = '';
        return;
      }
      if (file.size > MAX_PROFILE_PICTURE_BYTES) {
        showToast('Image is too large. Please choose an image under 500KB.', 'error');
        if (e.target) e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const backup = {
      contacts,
      notes,
      tasks,
      profile,
      exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `lumina_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('JSON Backup downloaded successfully', 'success');
  };

  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map(header => {
        let val = row[header];
        if (Array.isArray(val)) {
          val = val.join('; ');
        }
        let stringVal = '' + (val ?? '');
        // Neutralize CSV formula injection: if the value starts with a character
        // that spreadsheet apps (Excel/Google Sheets) interpret as a formula
        // trigger, prefix it with a leading apostrophe so it's treated as text.
        if (/^[=+\-@]/.test(stringVal)) {
          stringVal = `'${stringVal}`;
        }
        const escaped = stringVal.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const handleExportCSV = (type: 'contacts' | 'notes' | 'tasks') => {
    let csvContent = '';
    let filename = '';
    if (type === 'contacts') {
      const headers = ['id', 'name', 'position', 'company', 'email', 'phone', 'relationStatus', 'affiliation', 'status', 'notes', 'tags'];
      csvContent = convertToCSV(contacts || [], headers);
      filename = 'lumina_contacts.csv';
    } else if (type === 'notes') {
      const headers = ['id', 'date', 'title', 'contactId', 'content', 'category', 'sentimentScore', 'engagementLevel', 'insights', 'keyPoints'];
      csvContent = convertToCSV(notes || [], headers);
      filename = 'lumina_notes.csv';
    } else {
      const headers = ['id', 'title', 'dueDate', 'completed', 'priority', 'contactId', 'meetingNoteId', 'notes'];
      csvContent = convertToCSV(tasks || [], headers);
      filename = 'lumina_tasks.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${type.toUpperCase()} CSV Backup downloaded`, 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.contacts && parsed.notes && parsed.tasks && parsed.profile) {
          onImportData?.(parsed);
          showToast('Data imported successfully!', 'success');
        } else {
          showToast('Invalid backup file structure.', 'error');
        }
      } catch (err) {
        showToast('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !position.trim() || !company.trim()) {
      return;
    }

    const updated: MyselfProfile = {
      name: name.trim(),
      position: position.trim(),
      company: company.trim(),
      companyLocation: companyLocation.trim() || undefined,
      companySize: companySize.trim() || undefined,
      companySummary: companySummary.trim() || undefined,
      personality: personality.trim(),
      coreStrengths: coreStrengths.trim(),
      communicationStyle: communicationStyle.trim(),
      careerGoals: careerGoals.trim(),
      extraDetails: extraDetails.trim() || undefined,
      profilePicture: profilePicture || undefined
    };

    onUpdateProfile(updated);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(profile.name);
    setPosition(profile.position);
    setCompany(profile.company);
    setCompanyLocation(profile.companyLocation || '');
    setCompanySize(profile.companySize || '');
    setCompanySummary(profile.companySummary || '');
    setPersonality(profile.personality);
    setCoreStrengths(profile.coreStrengths);
    setCommunicationStyle(profile.communicationStyle);
    setCareerGoals(profile.careerGoals);
    setExtraDetails(profile.extraDetails || '');
    setProfilePicture(profile.profilePicture || '');
    setIsEditing(false);
  };

  return (
    <div id="myself-profile-pane" className="max-w-4xl mx-auto pb-12">
      {isEditing ? (
        /* Edit Mode Form */
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-medium text-stone-900">Configure My Advisory Context</h2>
              <p className="text-xs text-stone-500 mt-1">This profile directly shapes the perspective and communication style of Gemini\'s generated advice.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-605 bg-stone-50 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-850 transition"
              >
                Save Profile
              </button>
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">Profile Picture</label>
              <div className="relative group cursor-pointer w-24 h-24 rounded-full border-2 border-dashed border-stone-300 hover:border-stone-500 overflow-hidden flex items-center justify-center bg-stone-50 transition">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-stone-300 group-hover:text-stone-400 transition" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="text-[10px] text-white font-bold uppercase">Upload</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">My Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">My Professional position *</label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">My Corporate Company *</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Company Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, Remote"
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Company Size</label>
                <input
                  type="text"
                  placeholder="e.g. 50-200 employees"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Company Summary</label>
                <textarea
                  placeholder="Brief description of what the company does..."
                  rows={2}
                  value={companySummary}
                  onChange={(e) => setCompanySummary(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User size={13} /> Personal Archetype / Personality Profile
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Analytical, consensus-driven, supportive"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Award size={13} /> My Core Strengths
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise systems architecture, contract negotiations, active listening"
                value={coreStrengths}
                onChange={(e) => setCoreStrengths(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare size={13} /> Preferred Communication Style
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Socratic questioning, numbers-oriented, transparent and direct"
                value={communicationStyle}
                onChange={(e) => setCommunicationStyle(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Target size={13} /> Career / Relationship Goals
              </label>
              <textarea
                required
                placeholder="Describe your 12-month goals or relationship principles..."
                rows={3}
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-400 resize-none animate-fade-in"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Info size={13} /> Additional Instructions / Private Directives
              </label>
              <textarea
                placeholder="Any special notes or guidelines on how Gemini should tailor recommendations for you..."
                rows={3}
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-400 resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-stone-200 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-50 transition"
            >
              Cancel Changes
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition"
            >
              Apply Context
            </button>
          </div>
        </form>
      ) : (
        /* Read Mode Presentation Card */
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden relative">
          {/* Cover Header block */}
          <div className="relative p-10 text-white min-h-[160px] flex justify-between items-end bg-gradient-to-br from-[#0A1E3F] via-slate-800 to-indigo-950 overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
            
            <div className="relative z-10 w-full flex justify-between items-end">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden bg-slate-800 shadow-xl flex items-center justify-center flex-shrink-0">
                  {profile.profilePicture ? (
                    <img src={profile.profilePicture} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-slate-400" />
                  )}
                </div>
                <div className="mb-1">
                  <h2 className="text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">{profile.name}</h2>
                  <p className="text-blue-200/90 text-[15px] font-medium flex items-center gap-2">
                    <Briefcase size={16} />
                    {profile.position} at <span className="font-bold text-white tracking-wide">{profile.company}</span>
                  </p>
                </div>
              </div>

              <button
                id="edit-profile-btn"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-black/10"
              >
                <Edit2 size={14} /> Update Profile
              </button>
            </div>
          </div>

          {/* Grid components */}
          <div className="p-8 md:p-10 space-y-6 bg-slate-50/50">
            {/* Overview - show all or a summary */}
            {(activeSubTab === 'overview' || activeSubTab === 'personality' || activeSubTab === 'communication') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeSubTab === 'overview' || activeSubTab === 'personality') && (
                  <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] col-span-1 md:col-span-2 group hover:border-blue-200 transition-colors duration-300 overflow-hidden flex flex-col">
                    <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Professional Archetype & Personality</h3>
                    </div>
                    <div className="p-7 grow">
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {profile.personality}
                      </p>
                    </div>
                  </div>
                )}
                
                {(activeSubTab === 'overview' || activeSubTab === 'personality') && (
                   <div className={`p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] group hover:border-amber-200 transition-colors duration-300 overflow-hidden flex flex-col ${activeSubTab === 'personality' ? 'col-span-1 md:col-span-2' : ''}`}>
                     <div className="px-7 py-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                         <Award size={16} />
                       </div>
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Core Skillsets</h3>
                     </div>
                     <div className="p-7 grow">
                       <p className="text-slate-700 leading-relaxed font-medium">
                         {profile.coreStrengths}
                       </p>
                     </div>
                   </div>
                )}

                {(activeSubTab === 'overview' || activeSubTab === 'communication') && (
                  <div className={`p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] group hover:border-emerald-200 transition-colors duration-300 overflow-hidden flex flex-col ${activeSubTab === 'communication' ? 'col-span-1 md:col-span-2' : ''}`}>
                    <div className="px-7 py-4 bg-emerald-50/50 border-b border-emerald-100/50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <MessageSquare size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Communication Preference</h3>
                    </div>
                    <div className="p-7 grow">
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {profile.communicationStyle}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeSubTab === 'overview' || activeSubTab === 'company' || activeSubTab === 'position') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeSubTab === 'overview' || activeSubTab === 'company') && (
                  <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] group hover:border-indigo-200 transition-colors duration-300 overflow-hidden flex flex-col">
                    <div className="px-7 py-4 bg-indigo-50/30 border-b border-indigo-100/50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Briefcase size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">My Company</h3>
                    </div>
                    <div className="p-7 grow flex flex-col justify-center gap-4">
                      <div className="text-center">
                        <p className="text-slate-800 font-bold text-xl">{profile.company}</p>
                      </div>
                      {(profile.companyLocation || profile.companySize) && (
                        <div className="flex flex-wrap justify-center items-center gap-3 text-xs font-medium text-slate-500 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-100/80">
                          {profile.companyLocation && (
                            <div className="flex items-center gap-1.5"><MapPin size={14} className="text-indigo-400" /> {profile.companyLocation}</div>
                          )}
                          {profile.companyLocation && profile.companySize && <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>}
                          {profile.companySize && (
                            <div className="flex items-center gap-1.5"><Users size={14} className="text-indigo-400" /> {profile.companySize}</div>
                          )}
                        </div>
                      )}
                      {profile.companySummary && (
                        <div className="text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-4 mt-1">
                          {profile.companySummary}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(activeSubTab === 'overview' || activeSubTab === 'position') && (
                  <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] group hover:border-rose-200 transition-colors duration-300 overflow-hidden flex flex-col">
                    <div className="px-7 py-4 bg-rose-50/50 border-b border-rose-100/50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Target size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">My Position</h3>
                    </div>
                    <div className="p-7 grow flex flex-col justify-center">
                      <p className="text-slate-800 leading-relaxed font-semibold text-lg text-center">
                        {profile.position}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeSubTab === 'overview' || activeSubTab === 'goals') && (
              <div className="p-0 rounded-[20px] bg-[#0A1E3F] text-white shadow-xl relative overflow-hidden flex flex-col group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="px-8 py-5 border-b border-white/10 relative z-10 flex items-center gap-4 bg-white/5 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Target size={20} />
                  </div>
                  <h3 className="text-xs font-bold text-blue-300 uppercase tracking-[0.15em]">Strategic Goals & Directives</h3>
                </div>
                <div className="p-8 grow relative z-10">
                  <p className="text-slate-200 leading-relaxed text-[15px]">
                    {profile.careerGoals}
                  </p>
                </div>
              </div>
            )}

            {/* Extra private directive box if present */}
            {profile.extraDetails && (activeSubTab === 'overview' || activeSubTab === 'goals') && (
              <div className="p-0 rounded-[20px] bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-100 shadow-sm flex flex-col overflow-hidden">
                <div className="px-7 py-4 bg-amber-100/50 border-b border-amber-200/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-700 flex items-center justify-center shadow-sm">
                    <Info size={16} />
                  </div>
                  <h3 className="text-xs font-bold text-amber-900/60 uppercase tracking-[0.1em]">Proactive Guidance Directives</h3>
                </div>
                <div className="p-7 grow">
                  <p className="text-sm text-amber-900/80 leading-relaxed whitespace-pre-line bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-amber-200/50 shadow-sm">
                    {profile.extraDetails}
                  </p>
                </div>
              </div>
            )}

            {/* Banner alert showing how AI leverages profile */}
            {activeSubTab === 'overview' && (
              <div className="flex gap-4 bg-gradient-to-r from-blue-50 to-indigo-50/30 p-6 rounded-[20px] border border-blue-100/60 items-start text-sm text-blue-900 shadow-[0_4px_20px_-4px_rgba(0,102,255,0.05)]">
                <ShieldAlert className="text-blue-500 flex-shrink-0 mt-0.5 animate-pulse" size={24} />
                <div>
                  <span className="font-bold block tracking-wide mb-1.5 flex items-center gap-2 text-[15px]">
                    <Sparkles size={16} className="text-blue-500" />
                    Profile-Aware Context Engaged
                  </span>
                  <p className="text-blue-800/80 leading-relaxed">
                    Any guidance rendered by the AI Advisor is filtered through your archetype, strengths, and goals. This ensures conversation tactics feel authentic and directly serve your objectives.
                  </p>
                </div>
              </div>
            )}

            {/* Personal Notes Panel */}
            {activeSubTab === 'personalNotes' && (
              <PersonalNotesManager
                notes={personalNotes}
                onAddNote={onAddPersonalNote || (() => {})}
                onUpdateNote={onUpdatePersonalNote || (() => {})}
                onDeleteNote={onDeletePersonalNote || (() => {})}
              />
            )}

            {/* Data Portability and Backups Panel */}
            {activeSubTab === 'data' && (
              <div className="space-y-6">
                <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                  <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Database size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Export Application Data</h3>
                  </div>
                  <div className="p-7 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Download a snapshot of your entire Lumina workspace. You can export as a single JSON backup file (to import or restore on another device) or export individual tables as CSV spreadsheets.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      <button
                        onClick={handleExportJSON}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Download size={14} /> Export Backup (JSON)
                      </button>
                      <button
                        onClick={() => handleExportCSV('contacts')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileSpreadsheet size={14} className="text-emerald-500" /> Contacts (CSV)
                      </button>
                      <button
                        onClick={() => handleExportCSV('notes')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileSpreadsheet size={14} className="text-blue-500" /> Meeting Notes (CSV)
                      </button>
                      <button
                        onClick={() => handleExportCSV('tasks')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileSpreadsheet size={14} className="text-indigo-500" /> Tasks (CSV)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                  <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Upload size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Restore backup from JSON</h3>
                  </div>
                  <div className="p-7 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Upload a previously exported Lumina `.json` backup file to restore your profile context, contact list, conversation logs, and task schedule.
                    </p>
                    <div className="pt-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportJSON}
                        accept=".json"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Upload size={14} /> Upload Backup JSON File
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: irreversible account & data deletion */}
                <div className="p-0 rounded-[20px] bg-white border border-rose-200 shadow-[0_4px_20px_-4px_rgba(220,38,38,0.06)] overflow-hidden flex flex-col">
                  <div className="px-7 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-rose-700 uppercase tracking-[0.1em]">Danger Zone</h3>
                  </div>
                  <div className="p-7 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Permanently delete your account and every piece of associated data — contacts, notes, tasks, companies, SOPs, advisor reports, and behavioral profiles. This cannot be undone. Consider exporting a backup above first.
                    </p>

                    {deleteStep === 'idle' && (
                      <button
                        onClick={() => setDeleteStep('confirming')}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition"
                      >
                        <Trash2 size={14} /> Delete My Account &amp; Data
                      </button>
                    )}

                    {deleteStep === 'confirming' && (
                      <div className="space-y-3 p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
                        <p className="text-xs text-rose-800 font-semibold">Type DELETE to confirm. This is permanent and cannot be undone.</p>
                        <input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-rose-500"
                          placeholder="DELETE"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setDeleteStep('idle'); setDeleteConfirmText(''); }}
                            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== 'DELETE'}
                            className="px-4 py-2 bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
                          >
                            Permanently Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {deleteStep === 'deleting' && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        <Loader2 className="animate-spin" size={14} /> Deleting your account and data…
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Legal & Privacy Panel */}
            {activeSubTab === 'legal' && (
              <div className="p-0 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Scale size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Legal &amp; Privacy</h3>
                  </div>
                  <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => setLegalDoc('terms')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${legalDoc === 'terms' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Terms of Service
                    </button>
                    <button
                      onClick={() => setLegalDoc('privacy')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${legalDoc === 'privacy' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Privacy Policy
                    </button>
                  </div>
                </div>
                <div className="p-7">
                  <LegalDocument doc={legalDoc} />
                </div>
              </div>
            )}

            {/* Privacy Settings Panel */}
            {activeSubTab === 'privacy' && (
              <PrivacySettings
                contacts={contacts}
                notes={notes}
                tasks={tasks}
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onWipeAllData={onWipeAllData || (() => {})}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
