import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, NotebookPen, CalendarCheck, TrendingUp, User, Sparkles, LayoutDashboard, LogOut, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Calendar,
  Sun, Moon, Building2, FileText, Archive
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useAuth } from './context/AuthContext';
import { noteInvolvesContact } from './lib/noteUtils';
import { Contact, MeetingNote, TaskReminder, MyselfProfile, Company, SOPDocument, SavedAdvisorReport, BehavioralProfile, SelfOrgPlacements, PersonalNote } from './types';
import {
  INITIAL_CONTACTS, INITIAL_NOTES, INITIAL_TASKS, DEFAULT_PROFILE,
  DEMO_COMPANIES, DEMO_CONTACTS, DEMO_NOTES
} from './data/initialData';
import {
  loadUserData, saveContacts, saveNotes, saveTasks, saveProfile, saveCompanies, saveSops, saveSettings,
  saveAdvisorReports, saveBehavioralProfiles, saveSelfOrgPlacements, savePersonalNotes
} from './lib/userDataService';

import ContactManager from './components/ContactManager';
import NotesManager from './components/NotesManager';
import FollowUpReminders from './components/FollowUpReminders';
import SentimentDashboard from './components/SentimentDashboard';
import MyselfProfileTab from './components/MyselfProfileTab';
import AIAdvisor from './components/AIAdvisor';
import AdvisorReports from './components/AdvisorReports';
import OverviewTab from './components/OverviewTab';
import CalendarTab from './components/CalendarTab';
import GlobalSearch from './components/GlobalSearch';
import MeetingTranscriber from './components/MeetingTranscriber';
import CompanyManager from './components/CompanyManager';
import SOPManager from './components/SOPManager';
import GuidedSetup from './components/GuidedSetup';
import { useToast } from './components/Toast';

const TAB_CONFIG: Record<string, { name: string, icon: React.ReactNode }> = {
  'overview': { name: 'Strategic Overview', icon: <LayoutDashboard size={16} /> },
  'companies': { name: 'Companies', icon: <Building2 size={16} /> },
  'contacts': { name: 'Contact Manager', icon: <Users size={16} /> },
  'notes': { name: 'Notes', icon: <NotebookPen size={16} /> },
  'tasks': { name: 'Tasks', icon: <CalendarCheck size={16} /> },
  'calendar': { name: 'Calendar', icon: <Calendar size={16} /> },
  'sentiment': { name: 'Sentiment & Trends', icon: <TrendingUp size={16} /> },
  'ai': { name: 'AI Advisor', icon: <Sparkles size={16} className="text-amber-400 fill-amber-400/20 animate-pulse" /> },
  'advisorReports': { name: 'Advisor Reports', icon: <Archive size={16} /> },
  'sops': { name: 'SOP & Documentation', icon: <FileText size={16} /> },
};

const INITIAL_TAB_ORDER = ['overview', 'companies', 'contacts', 'notes', 'tasks', 'calendar', 'sentiment', 'ai', 'advisorReports', 'sops'];

function SortableNavItem({ id, tab, isActive, onClick, badge }: { id: string; tab: any; isActive: boolean; onClick: () => void; badge?: { count: number; isOverdue: boolean } }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : 0,
    position: isDragging ? 'relative' : 'static',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="touch-none mb-1">
      <button
        id={`nav-tab-${id}`}
        onClick={onClick}
        {...attributes}
        {...listeners}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-left ${
          isActive
            ? 'bg-slate-800 text-white font-bold border border-slate-700/50 shadow-xs active-glow-tab'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
      >
        <span className={isActive ? 'text-blue-500' : 'text-slate-400'}>
          {tab.icon}
        </span>
        {tab.name}
        {badge && (
          <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${badge.isOverdue ? 'bg-red-500 text-white' : 'bg-white text-slate-800'}`}>
            {badge.count}
          </span>
        )}
      </button>
    </div>
  );
}

export default function App() {
  const { logout, user } = useAuth();
  const { showToast } = useToast();

  // Trigger callbacks for header quick-add buttons
  const [triggerAddNote, setTriggerAddNote] = useState(0);
  const [triggerAddContact, setTriggerAddContact] = useState(0);
  const [triggerAddTask, setTriggerAddTask] = useState(0);
  const [showTranscriber, setShowTranscriber] = useState(false);

  // Selected note state for cross-tab navigation
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const handleSelectNote = (id: string | null) => {
    setSelectedNoteId(id);
    setActiveTab('notes');
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lumina_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lumina_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lumina_dark_mode', 'false');
    }
    if (user && isDataLoadedRef.current) {
      saveSettings(user.uid, {
        darkMode,
        activeTab,
        tabOrder,
        setupCompleted: !showSetup,
      });
    }
  }, [darkMode, user]);
  
  // 1. Core State Managers loaded from Firestore (falls back to local defaults)
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [notes, setNotes] = useState<MeetingNote[]>(INITIAL_NOTES);
  const [tasks, setTasks] = useState<TaskReminder[]>(INITIAL_TASKS);
  const [profile, setProfile] = useState<MyselfProfile>(DEFAULT_PROFILE);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [advisorReports, setAdvisorReports] = useState<SavedAdvisorReport[]>([]);
  const [behavioralProfiles, setBehavioralProfiles] = useState<BehavioralProfile[]>([]);
  const [selfOrgPlacements, setSelfOrgPlacements] = useState<SelfOrgPlacements>({});
  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>([]);
  const [showSetup, setShowSetup] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [tabOrder, setTabOrder] = useState<string[]>(INITIAL_TAB_ORDER);

  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const isDataLoadedRef = useRef<boolean>(false);

  // Load user data from Firestore on mount/auth state change
  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    let active = true;
    setDataLoading(true);
    isDataLoadedRef.current = false;

    loadUserData(user.uid)
      .then((data) => {
        if (!active) return;

        if (data.contacts !== null) setContacts(data.contacts);
        if (data.notes !== null) setNotes(data.notes);
        if (data.tasks !== null) setTasks(data.tasks);
        if (data.profile !== null) setProfile(data.profile);
        if (data.companies !== null) setCompanies(data.companies);
        if (data.sops !== null) setSops(data.sops);
        if (data.advisorReports !== null) setAdvisorReports(data.advisorReports);
        if (data.behavioralProfiles !== null) setBehavioralProfiles(data.behavioralProfiles);
        if (data.selfOrgPlacements !== null) setSelfOrgPlacements(data.selfOrgPlacements);
        if (data.personalNotes !== null) setPersonalNotes(data.personalNotes);

        if (data.settings) {
          if (data.settings.darkMode !== undefined) setDarkMode(data.settings.darkMode);
          if (data.settings.activeTab !== undefined) setActiveTab(data.settings.activeTab);
          if (data.settings.tabOrder !== null) setTabOrder(data.settings.tabOrder);
        }

        let setupCompleted = false;
        if (data.settings && data.settings.setupCompleted !== undefined) {
          setupCompleted = data.settings.setupCompleted;
        } else {
          // Fallback check: if user has any existing data in Firestore, they've already completed setup
          const hasContacts = !!(data.contacts && data.contacts.length > 0);
          const hasNotes = !!(data.notes && data.notes.length > 0);
          const hasCompanies = !!(data.companies && data.companies.length > 0);
          const hasProfile = !!(data.profile && data.profile.name);
          setupCompleted = hasContacts || hasNotes || hasCompanies || hasProfile;
        }
        setShowSetup(!setupCompleted);

        isDataLoadedRef.current = true;
        setDataLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load user data from cloud:', err);
        if (active) {
          isDataLoadedRef.current = true;
          setDataLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  const [myselfSubTab, setMyselfSubTab] = useState<string>('overview');
  const [isMyselfExpanded, setIsMyselfExpanded] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const hasCheckedRef = useRef(false);

  // Smart notification system: Check overdue tasks & relationship decay on start
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const today = new Date().toISOString().split('T')[0];
    const overdueCount = tasks.filter(t => !t.completed && t.dueDate < today).length;
    
    if (overdueCount > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Lumina Overdue Tasks Alert', {
            body: `You have ${overdueCount} overdue follow-up task(s). Click to review them.`
          });
        } catch (e) {
          // Service worker context or custom browser restrictions
        }
      }
      showToast(`Warning: You have ${overdueCount} overdue task(s) requiring attention.`, 'warning', 6000);
    }

    // Check relationship decay (active contacts without notes in 14 days)
    const activeContacts = contacts.filter(c => c.relationStatus === 'Active');
    const decayingContacts: string[] = [];
    
    activeContacts.forEach(contact => {
      const contactNotes = notes.filter(n => noteInvolvesContact(n, contact.id));
      if (contactNotes.length === 0) {
        decayingContacts.push(contact.name);
      } else {
        const latestNote = contactNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysDiff = (Date.now() - new Date(latestNote.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 14) {
          decayingContacts.push(contact.name);
        }
      }
    });

    if (decayingContacts.length > 0) {
      setTimeout(() => {
        showToast(
          `Relationship Decay Nudge: Reconnecting with ${decayingContacts.slice(0, 2).join(' & ')}${decayingContacts.length > 2 ? ` and ${decayingContacts.length - 2} others` : ''} is recommended (no meetings in 14+ days).`, 
          'info', 
          7000
        );
      }, 3500);
    }
  }, [contacts, notes, tasks, showToast]);

  // 2. Synchronize changes to localStorage & Firestore on any state mutation
  useEffect(() => {
    localStorage.setItem('c_notes_contacts', JSON.stringify(contacts));
    if (user && isDataLoadedRef.current) {
      saveContacts(user.uid, contacts);
    }
  }, [contacts, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_notes', JSON.stringify(notes));
    if (user && isDataLoadedRef.current) {
      saveNotes(user.uid, notes);
    }
  }, [notes, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_tasks', JSON.stringify(tasks));
    if (user && isDataLoadedRef.current) {
      saveTasks(user.uid, tasks);
    }
  }, [tasks, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_profile', JSON.stringify(profile));
    if (user && isDataLoadedRef.current) {
      saveProfile(user.uid, profile);
    }
  }, [profile, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_companies', JSON.stringify(companies));
    if (user && isDataLoadedRef.current) {
      saveCompanies(user.uid, companies);
    }
  }, [companies, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_sops', JSON.stringify(sops));
    if (user && isDataLoadedRef.current) {
      saveSops(user.uid, sops);
    }
  }, [sops, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_advisor_reports', JSON.stringify(advisorReports));
    if (user && isDataLoadedRef.current) {
      saveAdvisorReports(user.uid, advisorReports);
    }
  }, [advisorReports, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_behavioral_profiles', JSON.stringify(behavioralProfiles));
    if (user && isDataLoadedRef.current) {
      saveBehavioralProfiles(user.uid, behavioralProfiles);
    }
  }, [behavioralProfiles, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_self_org_placements', JSON.stringify(selfOrgPlacements));
    if (user && isDataLoadedRef.current) {
      saveSelfOrgPlacements(user.uid, selfOrgPlacements);
    }
  }, [selfOrgPlacements, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_personal_notes', JSON.stringify(personalNotes));
    if (user && isDataLoadedRef.current) {
      savePersonalNotes(user.uid, personalNotes);
    }
  }, [personalNotes, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_active_tab', activeTab);
    if (user && isDataLoadedRef.current) {
      saveSettings(user.uid, {
        darkMode,
        activeTab,
        tabOrder,
        setupCompleted: !showSetup,
      });
    }
  }, [activeTab, user]);

  useEffect(() => {
    localStorage.setItem('c_notes_tab_order', JSON.stringify(tabOrder));
    if (user && isDataLoadedRef.current) {
      saveSettings(user.uid, {
        darkMode,
        activeTab,
        tabOrder,
        setupCompleted: !showSetup,
      });
    }
  }, [tabOrder, user]);

  useEffect(() => {
    if (!isDataLoadedRef.current) return;
    localStorage.setItem('lumina_setup_completed', (!showSetup).toString());
    if (user) {
      saveSettings(user.uid, {
        darkMode,
        activeTab,
        tabOrder,
        setupCompleted: !showSetup,
      });
    }
  }, [showSetup, user]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTabOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Badge calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => !t.completed);
  const pendingTasksCount = pendingTasks.length;
  const hasOverdueTasks = pendingTasks.some(t => t.dueDate < todayStr);

  const tasksBadge = pendingTasksCount > 0 ? {
    count: pendingTasksCount,
    isOverdue: hasOverdueTasks
  } : undefined;

  // 3. Mutation Operations
  // Contacts
  const handleAddContact = (contact: Contact) => {
    setContacts(prev => [contact, ...prev]);
    showToast(`Contact "${contact.name}" added successfully`, 'success');
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    showToast(`Contact "${updated.name}" updated`, 'success');
  };

  const handleDeleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    // Clean up or keep tasks but remove contact referencing
    setTasks(prev => prev.map(t => t.contactId === id ? { ...t, contactId: undefined } : t));
    setNotes(prev => prev.map(n => ({
      ...n,
      contactId: n.contactId === id ? undefined : n.contactId,
      attendeeIds: n.attendeeIds?.filter(aid => aid !== id)
    })));
    showToast('Contact deleted', 'info');
  };

  // Self Org Chart Placements
  const handleIncludeSelfInCompany = (companyId: string) => {
    setSelfOrgPlacements(prev => ({ ...prev, [companyId]: prev[companyId] || {} }));
  };

  const handleRemoveSelfFromCompany = (companyId: string) => {
    setSelfOrgPlacements(prev => {
      const next = { ...prev };
      delete next[companyId];
      return next;
    });
    // Clear any dangling references left by contacts who had "Me" set as their supervisor.
    setContacts(prev => prev.map(c =>
      (c.companyId === companyId || c.company.toLowerCase() === companies.find(cp => cp.id === companyId)?.name.toLowerCase())
        && c.supervisorId === '__self__'
        ? { ...c, supervisorId: undefined }
        : c
    ));
  };

  const handleUpdateSelfSupervisor = (companyId: string, supervisorId: string | undefined) => {
    setSelfOrgPlacements(prev => ({ ...prev, [companyId]: { supervisorId } }));
  };

  // Notes
  const handleAddNote = (note: MeetingNote) => {
    setNotes(prev => [note, ...prev]);
    showToast(`Note "${note.title}" logged`, 'success');
  };

  const handleUpdateNote = (updated: MeetingNote) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    showToast(`Note "${updated.title}" updated`, 'success');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    // Orphan linked tasks
    setTasks(prev => prev.map(t => t.meetingNoteId === id ? { ...t, meetingNoteId: undefined } : t));
    showToast('Note deleted', 'info');
  };

  // Personal Notes
  const handleAddPersonalNote = (note: PersonalNote) => {
    setPersonalNotes(prev => [note, ...prev]);
    showToast(`Personal note "${note.title}" saved`, 'success');
  };

  const handleUpdatePersonalNote = (updated: PersonalNote) => {
    setPersonalNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    showToast(`Personal note "${updated.title}" updated`, 'success');
  };

  const handleDeletePersonalNote = (id: string) => {
    setPersonalNotes(prev => prev.filter(n => n.id !== id));
    showToast('Personal note deleted', 'info');
  };

  // Tasks
  const handleAddTask = (task: TaskReminder) => {
    setTasks(prev => [task, ...prev]);
    showToast(`Task "${task.title}" scheduled`, 'success');
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Profile
  const handleUpdateProfile = (updated: MyselfProfile) => {
    setProfile(updated);
  };

  // Companies
  const handleAddCompany = (company: Company) => {
    setCompanies(prev => [company, ...prev]);
    showToast(`Company "${company.name}" registered`, 'success');
  };

  const handleUpdateCompany = (updated: Company) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    showToast(`Company "${updated.name}" updated`, 'success');
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    showToast('Company record removed', 'info');
  };

  // SOPs
  const handleAddSop = (sop: SOPDocument) => {
    setSops(prev => [sop, ...prev]);
  };

  const handleDeleteSop = (id: string) => {
    setSops(prev => prev.filter(s => s.id !== id));
    showToast('SOP document deleted', 'info');
  };

  // Advisor Reports
  const handleSaveAdvisorReport = (report: SavedAdvisorReport) => {
    setAdvisorReports(prev => [report, ...prev]);
    showToast(`Report "${report.title}" saved to Advisor Reports`, 'success');
  };

  const handleDeleteAdvisorReport = (id: string) => {
    setAdvisorReports(prev => prev.filter(r => r.id !== id));
    showToast('Report removed', 'info');
  };

  // Behavioral Profiles
  const handleSaveBehavioralProfile = (profile: BehavioralProfile) => {
    setBehavioralProfiles(prev => {
      const others = prev.filter(p => p.contactId !== profile.contactId);
      return [profile, ...others];
    });
  };

  const handleCompleteSetup = () => {
    localStorage.setItem('lumina_setup_completed', 'true');
    setShowSetup(false);
  };

  const handleLoadDemoAssets = useCallback(() => {
    setCompanies(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newComps = DEMO_COMPANIES.filter(c => !existingIds.has(c.id));
      return [...prev, ...newComps];
    });

    setContacts(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newCons = DEMO_CONTACTS.filter(c => !existingIds.has(c.id));
      return [...prev, ...newCons];
    });

    setNotes(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const newNotes = DEMO_NOTES.filter(n => !existingIds.has(n.id));
      return [...prev, ...newNotes];
    });

    showToast("Demo data has been successfully imported.", "success");
  }, [showToast]);

  const handleImportData = (imported: { contacts: Contact[]; notes: MeetingNote[]; tasks: TaskReminder[]; profile: MyselfProfile }) => {
    if (imported.contacts) {
      setContacts(imported.contacts);
      localStorage.setItem('c_notes_contacts', JSON.stringify(imported.contacts));
    }
    if (imported.notes) {
      setNotes(imported.notes);
      localStorage.setItem('c_notes_meeting_notes', JSON.stringify(imported.notes));
    }
    if (imported.tasks) {
      setTasks(imported.tasks);
      localStorage.setItem('c_notes_tasks_reminders', JSON.stringify(imported.tasks));
    }
    if (imported.profile) {
      setProfile(imported.profile);
      localStorage.setItem('c_notes_myself_profile', JSON.stringify(imported.profile));
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="relative flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
          <div className="flex items-center text-white font-bold text-[32px] tracking-tighter leading-none mb-3 select-none">
            <span>LUM</span>
            <div className="relative flex flex-col items-center mx-[1px]">
              <div className="absolute -top-3 text-[#0066FF]">
                <div className="relative animate-pulse">
                  <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] relative z-10 drop-shadow-[0_0_8px_rgba(0,102,255,0.8)]" fill="currentColor">
                    <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z"/>
                  </svg>
                  <div className="absolute inset-0 bg-[#0066FF] blur-md rounded-full opacity-60 scale-125"></div>
                </div>
              </div>
              <span>I</span>
            </div>
            <span>NA</span>
          </div>
          <p className="text-[9px] tracking-[0.2em] text-slate-400 font-bold uppercase mb-8 select-none">
            AI Advisor for Businesses
          </p>
          
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin mb-4"></div>
          <p className="text-xs text-slate-400 font-semibold animate-pulse">
            Synchronizing data with the cloud...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div id="application-container" className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans tracking-tight antialiased overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Left Navigation Sidebar matching Lumina Advisor */}
      <aside id="app-sidebar" className={`bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-64'}`}>
        
        {/* Sidebar Header Brand */}
        <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center text-white h-[96px]">
          <div className="flex flex-col items-center justify-center select-none w-full">
            <div className="flex items-center text-white font-bold text-[28px] tracking-tighter leading-none mb-1.5">
              <span>LUM</span>
              <div className="relative flex flex-col items-center mx-[1px]">
                {/* Glowing Star */}
                <div className="absolute -top-2.5 text-[#0066FF]">
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] relative z-10 drop-shadow-[0_0_6px_rgba(0,102,255,0.8)]" fill="currentColor">
                      <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z"/>
                    </svg>
                    <div className="absolute inset-0 bg-[#0066FF] blur-sm rounded-full opacity-60 scale-125"></div>
                  </div>
                </div>
                <span>I</span>
              </div>
              <span>NA</span>
            </div>
            
            <p className="text-[7.5px] tracking-[0.15em] text-slate-400 font-bold uppercase whitespace-nowrap animate-glow-text">
              AI Advisor for Businesses
            </p>
          </div>
        </div>

        {/* Tab Navigation Menu in Sidebar */}
        <nav id="navbar-selector" className="flex-1 p-4 space-y-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tabOrder}
              strategy={verticalListSortingStrategy}
            >
              {tabOrder.map(tabId => {
                const tabConfig = TAB_CONFIG[tabId];
                if (!tabConfig) return null;
                const isActive = activeTab === tabId;
                const badge = tabId === 'tasks' ? tasksBadge : undefined;
                return (
                  <SortableNavItem
                    key={tabId}
                    id={tabId}
                    tab={tabConfig}
                    isActive={isActive}
                    onClick={() => setActiveTab(tabId)}
                    badge={badge}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          {/* Myself Accordion Tab */}
          <div className="pt-2">
            <button
              id="nav-tab-myself"
              onClick={() => {
                setIsMyselfExpanded(!isMyselfExpanded);
                if (activeTab !== 'myself') {
                  setActiveTab('myself');
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-left ${
                activeTab === 'myself'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700/50 shadow-xs active-glow-tab'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                 <span className={activeTab === 'myself' ? 'text-blue-500' : 'text-slate-400'}>
                   <User size={16} />
                 </span>
                 Myself
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isMyselfExpanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMyselfExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-10"
                >
                  {[
                    { id: 'overview', name: 'Overview' },
                    { id: 'personality', name: 'Personality' },
                    { id: 'communication', name: 'Communication' },
                    { id: 'company', name: 'My Company' },
                    { id: 'position', name: 'My Position' },
                    { id: 'goals', name: 'Goals' },
                    { id: 'personalNotes', name: 'Personal Notes' },
                    { id: 'data', name: 'Data & Backups' },
                    { id: 'legal', name: 'Legal & Privacy' },
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                         setActiveTab('myself');
                         setMyselfSubTab(sub.id);
                      }}
                      className={`text-left px-3 py-2 rounded-md text-[11px] font-medium transition-colors ${
                        activeTab === 'myself' && myselfSubTab === sub.id 
                          ? 'bg-blue-600/20 text-blue-400 font-bold' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Dynamic Profile Widget footer in Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => { setActiveTab('myself'); setIsMyselfExpanded(true); setMyselfSubTab('legal'); }}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
            >
              Terms &amp; Privacy
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400">Dark Mode</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>
          </div>
          <button
            onClick={() => setActiveTab('myself')}
            className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-700 transition-all text-slate-200"
          >
            <div className="w-10 h-10 bg-slate-800 rounded-full border-2 border-blue-500 overflow-hidden flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-lg relative">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M'
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <div className="text-sm text-white font-medium truncate">{profile.name}</div>
              <div className="text-[11px] text-blue-400 mt-1 font-mono leading-tight whitespace-normal break-words">{profile.position}</div>
            </div>
          </button>
        </div>

      </aside>

      {/* Right Stage Core Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">

        {/* Header bar matching Lumina style */}
        <header id="application-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm relative transition-all duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden lg:block">
              {activeTab === 'overview' && 'Strategic Overview'}
              {activeTab === 'companies' && 'Companies Database'}
              {activeTab === 'contacts' && 'Contact Manager'}
              {activeTab === 'notes' && 'Notes Database'}
              {activeTab === 'tasks' && 'Tasks'}
              {activeTab === 'calendar' && 'Calendar'}
              {activeTab === 'sentiment' && 'Engagement & Sentiment Trends'}
              {activeTab === 'myself' && 'Configure Advisory Context'}
              {activeTab === 'ai' && 'AI Advisor'}
              {activeTab === 'advisorReports' && 'Saved Advisor Reports'}
              {activeTab === 'sops' && 'SOP & Documentation'}
            </h1>
          </div>

          <GlobalSearch
            contacts={contacts}
            notes={notes}
            tasks={tasks}
            setActiveTab={setActiveTab}
          />

          <div className="flex items-center gap-4">
            {/* Quick addition entry triggers depending on active layout context */}
            {activeTab === 'notes' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTranscriber(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-md text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
                >
                  🎙️ Record Meeting
                </button>
                <button
                  onClick={() => setTriggerAddNote(prev => prev + 1)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition"
                >
                  + New Note
                </button>
              </div>
            )}
            {activeTab === 'contacts' && (
              <button
                onClick={() => setTriggerAddContact(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition"
              >
                + Add Partner
              </button>
            )}
            {activeTab === 'tasks' && (
              <button
                onClick={() => setTriggerAddTask(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition"
              >
                + Schedule Follow-up
              </button>
            )}

            <div className="h-8 w-[1px] bg-slate-200"></div>
            <button 
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Content view stage with scroll context */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.12 }}
              className="focus-outline-none"
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  contacts={contacts}
                  notes={notes}
                  tasks={tasks}
                  profile={profile}
                  setActiveTab={setActiveTab}
                  onToggleTask={handleToggleTask}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactManager
                  contacts={contacts}
                  notes={notes}
                  tasks={tasks}
                  profile={profile}
                  companies={companies}
                  onAddContact={handleAddContact}
                  onUpdateContact={handleUpdateContact}
                  onDeleteContact={handleDeleteContact}
                  onAddCompany={handleAddCompany}
                  onToggleTask={handleToggleTask}
                  triggerAdd={triggerAddContact}
                  behavioralProfiles={behavioralProfiles}
                  onSaveBehavioralProfile={handleSaveBehavioralProfile}
                  onLoadDemoAssets={handleLoadDemoAssets}
                />
              )}

              {activeTab === 'companies' && (
                <CompanyManager
                  companies={companies}
                  contacts={contacts}
                  onAddCompany={handleAddCompany}
                  onUpdateCompany={handleUpdateCompany}
                  onDeleteCompany={handleDeleteCompany}
                  onUpdateContact={handleUpdateContact}
                  profile={profile}
                  selfOrgPlacements={selfOrgPlacements}
                  onIncludeSelfInCompany={handleIncludeSelfInCompany}
                  onRemoveSelfFromCompany={handleRemoveSelfFromCompany}
                  onUpdateSelfSupervisor={handleUpdateSelfSupervisor}
                  onLoadDemoAssets={handleLoadDemoAssets}
                />
              )}

              {activeTab === 'sops' && (
                <SOPManager
                  sops={sops}
                  onAddSop={handleAddSop}
                  onDeleteSop={handleDeleteSop}
                />
              )}

              {activeTab === 'notes' && (
                <NotesManager
                  notes={notes}
                  contacts={contacts}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  triggerAdd={triggerAddNote}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={setSelectedNoteId}
                  onLoadDemoAssets={handleLoadDemoAssets}
                />
              )}

              {activeTab === 'tasks' && (
                <FollowUpReminders
                  tasks={tasks}
                  contacts={contacts}
                  notes={notes}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  triggerAdd={triggerAddTask}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarTab
                  tasks={tasks}
                  contacts={contacts}
                  onAddTask={handleAddTask}
                />
              )}

              {activeTab === 'sentiment' && (
                <SentimentDashboard
                  notes={notes}
                  contacts={contacts}
                  companies={companies}
                  personalNotes={personalNotes}
                  profile={profile}
                  onSelectNote={handleSelectNote}
                />
              )}

              {activeTab === 'myself' && (
                <MyselfProfileTab
                  profile={profile}
                  onUpdateProfile={handleUpdateProfile}
                  activeSubTab={myselfSubTab}
                  contacts={contacts}
                  notes={notes}
                  tasks={tasks}
                  onImportData={handleImportData}
                  personalNotes={personalNotes}
                  onAddPersonalNote={handleAddPersonalNote}
                  onUpdatePersonalNote={handleUpdatePersonalNote}
                  onDeletePersonalNote={handleDeletePersonalNote}
                />
              )}

              {activeTab === 'ai' && (
                <AIAdvisor
                  contacts={contacts}
                  notes={notes}
                  profile={profile}
                  companies={companies}
                  sops={sops}
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  savedReports={advisorReports}
                  behavioralProfiles={behavioralProfiles}
                  onSaveReport={handleSaveAdvisorReport}
                  personalNotes={personalNotes}
                  selfOrgPlacements={selfOrgPlacements}
                />
              )}

              {activeTab === 'advisorReports' && (
                <AdvisorReports
                  reports={advisorReports}
                  contacts={contacts}
                  companies={companies}
                  onDelete={handleDeleteAdvisorReport}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>

    {/* Meeting Transcriber Modal */}
    <AnimatePresence>
      {showTranscriber && (
        <MeetingTranscriber
          contacts={contacts}
          onAddNote={handleAddNote}
          onClose={() => setShowTranscriber(false)}
        />
      )}
    </AnimatePresence>

    {/* Guided Onboarding Setup Modal */}
    <AnimatePresence>
      {showSetup && (
        <GuidedSetup
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onAddCompany={handleAddCompany}
          onAddContact={handleAddContact}
          onComplete={handleCompleteSetup}
        />
      )}
    </AnimatePresence>
    </>
  );
}
