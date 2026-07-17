import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Trash2, Clock, Check, Download, AlertTriangle, EyeOff, Loader2 } from 'lucide-react';
import { Contact, MeetingNote, TaskReminder, MyselfProfile } from '../types';
import { deleteUserData } from '../lib/userDataService';
import { auth } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

interface PrivacySettingsProps {
  contacts: Contact[];
  notes: MeetingNote[];
  tasks: TaskReminder[];
  profile: MyselfProfile;
  onUpdateProfile: (profile: MyselfProfile) => void;
  onWipeAllData: () => void;
}

export default function PrivacySettings({
  contacts,
  notes,
  tasks,
  profile,
  onUpdateProfile,
  onWipeAllData
}: PrivacySettingsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Local settings states
  const [insulateAi, setInsulateAi] = useState<boolean>(() => {
    return localStorage.getItem('lumina_privacy_insulate_ai') === 'true';
  });
  
  const [retentionDays, setRetentionDays] = useState<number>(() => {
    const saved = localStorage.getItem('lumina_privacy_retention_days');
    return saved ? parseInt(saved, 10) : 0; // 0 = Keep forever
  });

  const [confirmWipeText, setConfirmWipeText] = useState('');
  const [wipeStep, setWipeStep] = useState<'idle' | 'confirming' | 'wiping'>('idle');

  const handleToggleInsulateAi = () => {
    const nextVal = !insulateAi;
    setInsulateAi(nextVal);
    localStorage.setItem('lumina_privacy_insulate_ai', String(nextVal));
    showToast(nextVal ? 'AI Data Insulation Activated. Local and transit data protected.' : 'AI Data Insulation Disabled.', 'info');
  };

  const handleRetentionChange = (days: number) => {
    setRetentionDays(days);
    localStorage.setItem('lumina_privacy_retention_days', String(days));
    showToast(`Data retention period updated to: ${days === 0 ? 'Indefinite' : days + ' days'}.`, 'success');
  };

  const handleWipeData = async () => {
    if (confirmWipeText !== 'WIPE') return;
    setWipeStep('wiping');
    try {
      if (user) {
        await deleteUserData(user.uid);
      }
      onWipeAllData();
      showToast('All associated data has been permanently wiped from production.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to wipe data: ' + err.message, 'error');
      setWipeStep('confirming');
    }
  };

  return (
    <div className="space-y-6">
      {/* Insulated AI Toggle Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${insulateAi ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <EyeOff size={22} className={insulateAi ? 'animate-pulse' : ''} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Enterprise AI Data Insulation
              {insulateAi && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Prevent your customer conversation logs, private notes, and stakeholder data from being sent to external API endpoints for model training. When active, all telemetry and analytical telemetry features are isolated.
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <button
              onClick={handleToggleInsulateAi}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                insulateAi ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  insulateAi ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Retention Purge Policy Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Clock size={22} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Auto-Retention Purge Policy</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Configure automatic compliance deletion schedules. Private logs and conversation logs older than the threshold will be permanently deleted from the client database.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { label: 'Keep Forever', val: 0 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
            { label: '180 Days', val: 180 }
          ].map((policy) => {
            const isSelected = retentionDays === policy.val;
            return (
              <button
                key={policy.val}
                onClick={() => handleRetentionChange(policy.val)}
                className={`px-4 py-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                }`}
              >
                <span>{policy.label}</span>
                {isSelected && <Check size={12} className="text-blue-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Self-Destruct Wipe Card */}
      <div className="bg-rose-50/20 rounded-2xl border border-rose-200/60 p-6 shadow-2xs space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-rose-800">Emergency Data Deletion</h3>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              Instantly purge your entire workspace: contacts, private notes, meeting logs, calendar fixtures, and company data. This action is absolute, immediate, and completely irreversible.
            </p>
          </div>
        </div>

        {wipeStep === 'idle' ? (
          <button
            onClick={() => setWipeStep('confirming')}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Trash2 size={14} /> Wipe All Workspace Data
          </button>
        ) : wipeStep === 'confirming' ? (
          <div className="space-y-3.5 bg-white border border-rose-200 rounded-xl p-4.5">
            <div>
              <label className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider font-mono mb-1">
                Type "WIPE" to confirm self-destruction
              </label>
              <input
                value={confirmWipeText}
                onChange={(e) => setConfirmWipeText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-rose-400 font-semibold"
                placeholder="WIPE"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setWipeStep('idle'); setConfirmWipeText(''); }}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                disabled={confirmWipeText !== 'WIPE'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-xl transition shadow-sm flex items-center gap-1"
              >
                <AlertTriangle size={12} /> Confirm Purge
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-rose-700 font-bold font-mono">
            <Loader2 className="animate-spin" size={14} /> EXECUTING WORKSPACE PURGE...
          </div>
        )}
      </div>
    </div>
  );
}
