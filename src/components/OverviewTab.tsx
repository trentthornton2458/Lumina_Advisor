import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Contact, MeetingNote, TaskReminder, MyselfProfile } from '../types';
import { 
  Calendar, Award, Target, Sparkles, CheckCircle2, AlertCircle, 
  ArrowRight, Shield, TrendingUp, Lightbulb, Zap, UserCheck, Clock, Lock
} from 'lucide-react';

interface OverviewTabProps {
  contacts: Contact[];
  notes: MeetingNote[];
  tasks: TaskReminder[];
  profile: MyselfProfile;
  setActiveTab: (tab: string) => void;
  onToggleTask: (id: string) => void;
}

interface OverviewInsights {
  weeklyStructure: string;
  frictionAlert: string;
  trendsAndPriorities: string;
}

export default function OverviewTab({ 
  contacts, 
  notes, 
  tasks, 
  profile, 
  setActiveTab,
  onToggleTask
}: OverviewTabProps) {
  const [insights, setInsights] = useState<OverviewInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const now = new Date();

  // Stable key to prevent infinite re-renders — only re-fetch when core data changes
  const dataKey = useRef('');
  
  // Upcoming unfinished tasks & reminders sorted by date
  const pendingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const generateFallbackInsights = useCallback((): OverviewInsights => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[new Date().getDay()];
    
    // Heuristic calculations
    const pendingCount = pendingTasks.length;
    let workloadLevel = "moderate";
    if (pendingCount > 6) workloadLevel = "heavy";
    if (pendingCount < 3) workloadLevel = "light";

    // Weekly advice
    let weeklyStructure = `Today is ${currentDay} and you have a ${workloadLevel} workload (${pendingCount} pending tasks). Recommend focusing on highest priority tasks early.`;
    if (currentDay === 'Monday') {
      weeklyStructure = `It is Monday. You have a ${workloadLevel} workload. Start by mapping deliverables for this week and locking client alignments.`;
    } else if (currentDay === 'Wednesday') {
      weeklyStructure = `It is mid-week Wednesday. Address blocking items in your ${pendingCount} pending tasks to maintain confidence indexes.`;
    } else if (currentDay === 'Friday') {
      weeklyStructure = `It is Friday. Focus on closing out open issues, running retrospectives, and preparing next week's agenda.`;
    }

    // Friction advice
    const lowSentimentCount = notes.filter(n => (n.sentimentScore < 6 || n.engagementLevel < 6)).length;
    let frictionAlert = "All recent meetings show good alignment. Maintain active communication baselines.";
    if (lowSentimentCount > 0) {
      const problematic = notes.find(n => n.sentimentScore < 6 || n.engagementLevel < 6);
      const contact = contacts.find(c => c.id === problematic?.contactId);
      frictionAlert = `Caution: Recent meetings with ${contact ? contact.name : 'partners'} show low sentiment or distracted engagement. Arrange an executive pairing de-escalation call.`;
    }

    // Trends/Priorities
    let trendsAndPriorities = "No urgent trends detected. Keep building client relationships and checking off tactical reminders.";
    const privateNotesCount = notes.filter(n => n.isPrivate).length;
    if (privateNotesCount > 0) {
      trendsAndPriorities = `Analyzed tasks and ${privateNotesCount} private notes. Strategic focus points indicate immediate alignment is needed on contract concessions.`;
    } else if (pendingCount > 0) {
      trendsAndPriorities = `With ${pendingCount} pending tasks, key focus areas should center around sending out pricing decks and following up on integration sandboxes.`;
    }

    return {
      weeklyStructure,
      frictionAlert,
      trendsAndPriorities
    };
  }, [pendingTasks, notes, contacts]);

  // Fetch or generate character & professional development items based on AI or local heuristics
  useEffect(() => {
    const newKey = `${profile.name}-${profile.personality}-${notes.length}-${contacts.length}-${pendingTasks.length}`;
    if (newKey === dataKey.current) return;
    dataKey.current = newKey;

    async function getDevAdvice() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/overview-advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            profile,
            notes,
            contacts,
            tasks: pendingTasks,
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
          })
        });

        if (!response.ok) {
          throw new Error('Fallback to local heuristics.');
        }

        const data = await response.json();
        if (data.status === 'success' && data.insights) {
          setInsights(data.insights);
        } else {
          throw new Error('Invalid schema returned');
        }
      } catch (err) {
        setInsights(generateFallbackInsights());
      } finally {
        setIsLoading(false);
      }
    }

    getDevAdvice();
  }, [profile, notes, contacts, pendingTasks, generateFallbackInsights]);

  // Today's Date representation
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const formattedDay = dayNames[now.getDay()];
  const formattedMonth = monthNames[now.getMonth()];
  const formattedDate = `${formattedDay}, ${formattedMonth} ${now.getDate()}, ${now.getFullYear()}`;

  // Count metrics
  const totalPending = pendingTasks.length;

  return (
    <div id="overview-dashboard-tab" className="space-y-6 pb-12 text-slate-800">
      
      {/* Top Welcome Title Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 bg-radial-gradient rounded-full blur-2xl opacity-60"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider font-mono">
            <Zap size={14} className="animate-pulse" />
            Executive Command Suite
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Hello, {profile.name}!</h2>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back. Here is your relationship-driven tactical action checklist and development targets.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-mono">Today's Date</span>
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
            <Calendar size={14} className="text-blue-500" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Development Hub & Right Task Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Strategic Overview Panels */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Award size={16} className="text-blue-600" />
                  Tactical Mindset & Growth Target
                </h3>
                <p className="text-xs text-slate-450 mt-1 max-w-xl leading-relaxed">
                  Continuous AI monitoring of tasks, recent conversations, and private thoughts to align your workload and de-escalate communication risks.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded">
                Unified Synthesis
              </span>
            </div>

            {isLoading || !insights ? (
              <div className="space-y-4 py-12">
                {[1, 2, 3].map(n => (
                  <div key={n} className="flex gap-3 items-start animate-pulse">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-150 rounded w-5/6"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Weekly Workload Structure Card */}
                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all group animate-glow-border">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Weekly Structure & Workload Strategy
                    </h4>
                    <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1">
                      {insights.weeklyStructure}
                    </p>
                  </div>
                </div>

                {/* 2. Stakeholder Friction Card */}
                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                    <Shield size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      Stakeholder Friction & Pivot Advice
                    </h4>
                    <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1">
                      {insights.frictionAlert}
                    </p>
                  </div>
                </div>

                {/* 3. Pressing Priorities Trends Card */}
                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      Pressing Priorities & Trends
                    </h4>
                    <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1">
                      {insights.trendsAndPriorities}
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
            <div className="text-xs text-slate-555">
              <span className="font-bold text-slate-800">Pro-tip:</span> Use the <strong className="text-blue-700">AI Advisor</strong> tab to draft targeted compromise contracts and secure objections before meetings.
            </div>
            <button
              onClick={() => setActiveTab('ai')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition"
            >
              Analyze Strategy <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Right Side: Tasks & Upcoming Due Dates */}
        <div className="lg:col-span-5 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 p-6 shadow-md flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-500" />
                  Upcoming Focus Tasks
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Key follow-up reminders sorted chronologically.</p>
              </div>
              {totalPending > 0 && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                  {totalPending} Pending
                </span>
              )}
            </div>

            {/* Tasks list */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="mx-auto text-slate-600 mb-2" size={32} />
                  <p className="text-xs text-slate-400 italic">Excellent! You have 0 pending tasks scheduled.</p>
                </div>
              ) : (
                pendingTasks.slice(0, 4).map(task => {
                  const associatedContact = contacts.find(c => c.id === task.contactId);
                  return (
                    <div 
                      key={task.id} 
                      className="p-3 rounded-xl bg-slate-850 border border-slate-800 hover:border-slate-700/80 transition-all flex items-start gap-3"
                    >
                      <button 
                        onClick={() => onToggleTask(task.id)}
                        className="w-4 h-4 rounded border-2 border-slate-600 mt-0.5 hover:border-blue-500 flex items-center justify-center text-blue-400"
                      >
                        <span className="w-1.5 h-1.5 bg-transparent rounded-xs" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            task.priority === 'High' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-755/50 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            Due: {task.dueDate}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 truncate">{task.title}</h4>
                        {associatedContact && (
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Collaborator: <span className="text-blue-400">{associatedContact.name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-slate-500" /> Active Relationships status
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-850/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">Exceptional Partner Index</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">
                  {contacts.filter(c => c.status === 'Exceptional').length} <span className="text-[10px] text-slate-400 font-normal">profiles</span>
                </span>
              </div>
              <div className="p-2.5 bg-slate-850/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">Internal Team</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">
                  {contacts.filter(c => c.affiliation === 'Internal').length} <span className="text-[10px] text-slate-400 font-normal">internal members</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('tasks')}
              className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
            >
              Manage Tasks scheduler
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
