import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, RefreshCw, AlertCircle, Play, ArrowRight, CornerDownLeft, Loader2, HelpCircle } from 'lucide-react';
import { Contact, BehavioralProfile } from '../types';
import { authedFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AdaptiveSandboxProps {
  contacts: Contact[];
  behavioralProfiles: BehavioralProfile[];
}

const SCENARIOS = [
  { id: 'budget_creep', label: 'Managing Budget Creep', description: 'Address a 15% budget overrun due to unexpected compliance changes.' },
  { id: 'bad_news', label: 'Delivering Bad Project News', description: 'Communicate a 2-week delay in core milestones due to integration blockers.' },
  { id: 'scope_extension', label: 'Negotiating Scope Extension', description: 'Pitch an additional paid advisory module to address new security requests.' },
  { id: 'general_alignment', label: 'General Alignment Sync', description: 'Re-align coordinates with a cold or distant stakeholder to rebuild trust.' }
];

export default function AdaptiveSandbox({ contacts, behavioralProfiles }: AdaptiveSandboxProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const [selectedScenario, setSelectedScenario] = useState<string>('budget_creep');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [advisorFeedback, setAdvisorFeedback] = useState<string>('');

  const currentContact = contacts.find(c => c.id === selectedContactId);
  const currentProfile = behavioralProfiles.find(p => p.contactId === selectedContactId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartRoleplay = () => {
    if (!currentContact) return;
    setMessages([
      {
        id: 'msg_init',
        role: 'model',
        text: `[Call Connected] Hello, this is ${currentContact.name}. I saw your email requesting a quick status sync. Let's get straight to it. what did you want to discuss?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setAdvisorFeedback('The simulation has initialized. Adapt your tone to match their DISC communication traits.');
    setIsPlaying(true);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setAdvisorFeedback('');
    setIsPlaying(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !currentContact) return;

    const userMessage: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await authedFetch('/api/sandbox/chat', user, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact: currentContact,
          behavioralProfile: currentProfile,
          scenario: SCENARIOS.find(s => s.id === selectedScenario)?.label,
          history: historyPayload,
          message: userMessage.text
        })
      });

      if (!response.ok) {
        throw new Error('Sandbox network error');
      }

      const result = await response.json();
      if (result.status === 'success' && result.data) {
        setMessages(prev => [...prev, {
          id: 'msg_res_' + Date.now(),
          role: 'model',
          text: result.data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setAdvisorFeedback(result.data.feedback);
      } else {
        throw new Error(result.message || 'Invalid reply schema');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error communicating with sandbox: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] lg:h-[700px]">
      {/* LEFT COLUMN: Controls & Sidebar Info */}
      <div className="lg:col-span-4 flex flex-col gap-5 h-full overflow-y-auto">
        {/* Configurations Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sandbox Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Clone Stakeholder Persona</label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                disabled={isPlaying}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Roleplay Scenario</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                disabled={isPlaying}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-450 mt-1.5 font-medium leading-relaxed italic bg-slate-50/50 p-2 rounded border border-slate-100">
                {SCENARIOS.find(s => s.id === selectedScenario)?.description}
              </p>
            </div>

            {!isPlaying ? (
              <button
                onClick={handleStartRoleplay}
                disabled={!selectedContactId}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Play size={13} fill="white" /> Start Sandbox Roleplay
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} /> Reset Simulation
              </button>
            )}
          </div>
        </div>

        {/* Stakeholder Profile Card */}
        {currentContact && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3.5 flex items-center gap-1">
              Active Behavioral Profile
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Communication Target</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 border border-slate-200">
                    {currentContact.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{currentContact.name}</h4>
                    <p className="text-[10px] text-slate-450 truncate">{currentContact.position}</p>
                  </div>
                </div>
              </div>

              {currentProfile && currentProfile.traits ? (
                <>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">DISC / Behavioral Traits</span>
                    <div className="flex flex-wrap gap-1">
                      {currentProfile.traits.map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-md border border-indigo-150 bg-indigo-50/20 text-indigo-700 font-bold uppercase tracking-wider">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">Recommended Approach</span>
                    <p className="text-[10px] text-slate-600 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-medium">
                      {currentProfile.recommendedApproach}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-450 italic p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>No behavioral intelligence profile computed yet. Clone will adopt default professional baseline.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Active Chat Sandbox */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between h-full">
        {/* Chat Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Sandbox Channel</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {currentContact ? `Simulating ${currentContact.name} (${currentContact.company})` : 'Awaiting initialization'}
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold tracking-widest uppercase bg-blue-600/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
            Isolated Environment
          </span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
          {!isPlaying ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 py-24">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Sparkles size={28} />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Adaptive Communication Sandbox</h4>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Practice roleplay conversations with an AI stakeholder modeled after your client's exact communication traits and known objection patterns.
                </p>
              </div>
              <button
                onClick={handleStartRoleplay}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <Play size={11} fill="white" /> Initialize Roleplay Sync
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isModel = msg.role === 'model';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[85%] ${isModel ? '' : 'ml-auto flex-row-reverse'}`}
                  >
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] border shadow-2xs ${
                      isModel 
                        ? 'bg-slate-900 text-white border-slate-800' 
                        : 'bg-blue-600 text-white border-blue-700'
                    }`}>
                      {isModel ? (
                        currentContact ? currentContact.name.split(' ').map(n => n[0]).join('').slice(0,2) : 'C'
                      ) : 'AM'}
                    </div>
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                        isModel 
                          ? 'bg-white border-slate-200 text-slate-800 rounded-tl-xs shadow-3xs' 
                          : 'bg-blue-600 border-blue-700 text-white rounded-tr-xs shadow-3xs'
                      }`}>
                        {msg.text}
                      </div>
                      <span className={`text-[9px] text-slate-400 font-medium block mt-1 font-mono ${
                        isModel ? 'pl-1' : 'pr-1 text-right'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-3 max-w-[85%] animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-200 shrink-0 flex items-center justify-center">
                    <Loader2 size={12} className="animate-spin text-slate-500" />
                  </div>
                  <div className="bg-slate-100 border border-slate-200/50 p-3 rounded-2xl rounded-tl-xs text-slate-450 text-xs italic font-medium flex items-center gap-1.5">
                    Typing response...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Advisor Live Feedback Board */}
        {isPlaying && advisorFeedback && (
          <div className="bg-gradient-to-r from-blue-50/20 to-indigo-50/30 px-5 py-3 border-t border-slate-200 flex items-start gap-3 shadow-inner shrink-0">
            <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest font-mono">AI Coach Sandbox Feedback</span>
              <p className="text-[10px] text-slate-650 font-medium mt-0.5 leading-normal">{advisorFeedback}</p>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-3 items-center shrink-0">
          <input
            type="text"
            placeholder={isPlaying ? "Type your response to handle their objections..." : "Start roleplay simulation first..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isPlaying || loading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed font-medium text-slate-800"
          />
          <button
            type="submit"
            disabled={!isPlaying || !input.trim() || loading}
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
