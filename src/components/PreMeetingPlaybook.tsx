import React, { useState, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, ShieldAlert, MessageSquare, Copy, Check, Loader2 } from 'lucide-react';
import { Contact, BehavioralProfile, SOPDocument } from '../types';
import { authedFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface PlaybookData {
  behavioralTraitsBrief: string;
  motivators: string[];
  frictionAlerts: string[];
  conversationStarters: string[];
}

interface PreMeetingPlaybookProps {
  contact: Contact;
  behavioralProfile?: BehavioralProfile;
  sops: SOPDocument[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PreMeetingPlaybook({
  contact,
  behavioralProfile,
  sops,
  isOpen,
  onClose
}: PreMeetingPlaybookProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && contact) {
      generatePlaybook();
    }
  }, [isOpen, contact]);

  const generatePlaybook = async () => {
    setLoading(true);
    setPlaybook(null);
    try {
      const response = await authedFetch('/api/meeting-playbook', user, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact,
          behavioralProfile,
          sops: sops.filter(s => s.content) // Only send active SOPs
        })
      });

      if (!response.ok) {
        throw new Error('Playbook generation failed');
      }

      const result = await response.json();
      if (result.status === 'success' && result.data) {
        setPlaybook(result.data);
      } else {
        throw new Error(result.message || 'Failed to parse playbook');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error generating playbook: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end z-50 animate-fade-in">
      <div className="w-full max-w-md h-full bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center animate-pulse">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Pre-Meeting Playbook</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Tactical Briefing Card</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Target Profile Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <h4 className="font-bold text-slate-800 text-sm">{contact.name}</h4>
            </div>
            <p className="text-slate-500 text-xs mt-1 pl-5">{contact.position} at <span className="font-semibold text-slate-700">{contact.company}</span></p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wider animate-pulse">Assembling talking points...</p>
            </div>
          ) : playbook ? (
            <div className="space-y-5">
              {/* Behavioral Brief */}
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-2xl border border-blue-200/60 p-4.5 shadow-2xs">
                <h5 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                  Adaptive Comm Brief
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{playbook.behavioralTraitsBrief}</p>
              </div>

              {/* Motivators */}
              <div className="bg-white rounded-2xl border border-slate-250 p-4.5 shadow-2xs space-y-2.5">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Key Motivators</h5>
                <ul className="space-y-2">
                  {playbook.motivators.map((mot, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{mot}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Friction Alerts */}
              <div className="bg-white rounded-2xl border border-rose-200 p-4.5 shadow-2xs space-y-2.5 bg-gradient-to-br from-rose-50/10 to-white">
                <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-rose-600" /> Friction & Trigger Alerts
                </h5>
                <ul className="space-y-2">
                  {playbook.frictionAlerts.map((flt, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{flt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conversation Starters */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pl-1">Starters & SOP Alignments</h5>
                <div className="space-y-2.5">
                  {playbook.conversationStarters.map((starter, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 p-3.5 rounded-2xl transition shadow-3xs flex justify-between items-start gap-3 group relative cursor-pointer"
                      onClick={() => handleCopy(starter, idx)}
                    >
                      <div className="flex gap-2.5 items-start">
                        <MessageSquare size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-750 font-medium italic leading-relaxed">{starter}</p>
                      </div>
                      <button 
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md shrink-0 transition"
                        title="Copy text"
                      >
                        {copiedIndex === idx ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 italic text-xs">Failed to generate playbook.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  );
}
