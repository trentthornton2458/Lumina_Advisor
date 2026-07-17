import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Users, Check, BrainCircuit, Sparkles, ShieldAlert, Target } from 'lucide-react';
import { Contact, BehavioralProfile } from '../types';

interface ProfileComparisonModalProps {
  contacts: Contact[];
  behavioralProfiles: BehavioralProfile[];
  initialContactId: string | null;
  onClose: () => void;
}

export default function ProfileComparisonModal({
  contacts,
  behavioralProfiles,
  initialContactId,
  onClose,
}: ProfileComparisonModalProps) {
  // Initialize with the active contact pre-selected if available
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialContactId && contacts.some(c => c.id === initialContactId)) {
      return [initialContactId];
    }
    return [];
  });

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        return prev; // Limit selection to max 3
      }
      return [...prev, id];
    });
  };

  const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Card (Wide format to comfortably fit 3 comparative columns) */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Compare Communication Profiles"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-600/20">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Compare Communication Profiles</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select 2 to 3 contacts to compare their behavioral styles and adaptation strategies side-by-side.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Checkbox Selector Section */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Select Contacts ({selectedIds.length} of 3 selected)
              </h3>
              {selectedIds.length < 2 && (
                <span className="text-[11px] text-amber-600 font-medium">
                  Select at least 2 contacts to compare
                </span>
              )}
            </div>
            <div id="comparison-contacts-list" className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
              {contacts.length === 0 ? (
                <div className="text-xs text-stone-400 italic py-2 px-1">No contacts registered yet.</div>
              ) : (
                contacts.map(c => {
                  const isSelected = selectedIds.includes(c.id);
                  const hasProfile = behavioralProfiles.some(p => p.contactId === c.id);
                  const disabled = !isSelected && selectedIds.length >= 3;
                  return (
                    <button
                      key={c.id}
                      id={`compare-option-${c.id}`}
                      onClick={() => handleToggle(c.id)}
                      disabled={disabled}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : disabled
                            ? 'bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white text-blue-600 border-white' : 'border-stone-300'
                      }`}>
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className="truncate max-w-[140px]">{c.name}</span>
                      {hasProfile && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase tracking-wider ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          Profile
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Comparative Grid */}
          {selectedContacts.length < 2 ? (
            /* Selector Empty/Prompt State */
            <div className="flex flex-col items-center justify-center py-20 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 text-center">
              <Users className="text-stone-300 mb-3" size={40} />
              <h4 className="font-semibold text-stone-800 text-sm">Awaiting Selection</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Please check the boxes next to 2 or 3 contacts above to analyze and compare their profiles side-by-side.
              </p>
            </div>
          ) : (
            /* Side-by-Side Columns */
            <div
              className="grid gap-6 items-start"
              style={{
                gridTemplateColumns: `repeat(${selectedContacts.length}, minmax(0, 1fr))`,
              }}
            >
              {selectedContacts.map(c => {
                const profile = behavioralProfiles.find(p => p.contactId === c.id);
                return (
                  <div key={c.id} className="bg-stone-50/50 rounded-2xl border border-stone-200 p-4.5 flex flex-col gap-4">
                    {/* Contact Identity */}
                    <div className="border-b border-stone-200 pb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            c.status === 'Exceptional' ? 'bg-blue-500' :
                            c.status === 'Good' ? 'bg-emerald-500' :
                            c.status === 'Bad' ? 'bg-rose-500' :
                            'bg-yellow-500'
                          }`} />
                          <h4 className="font-bold text-stone-900 text-sm truncate">{c.name}</h4>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">{c.position} • {c.company}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 bg-stone-100 border border-stone-200 text-stone-600 rounded-md font-medium shrink-0">
                        {c.relationStatus}
                      </span>
                    </div>

                    {!profile ? (
                      /* Clean Empty State inside comparison grid for contacts without profiles */
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-xl border border-dashed border-stone-250 min-h-[440px]">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                          <Sparkles className="text-blue-500 animate-pulse" size={22} />
                        </div>
                        <h5 className="font-bold text-stone-800 text-xs uppercase tracking-wider">No Profile Generated Yet</h5>
                        <p className="text-[11px] text-stone-500 mt-2 leading-relaxed max-w-[200px]">
                          Lumina hasn't analyzed communication trends for this contact yet.
                        </p>
                        <p className="text-[10px] text-stone-400 mt-3 italic max-w-[200px]">
                          Tip: Visit {c.name}'s details page and click "Generate Profile" or "Refresh Profile" to run the algorithm.
                        </p>
                      </div>
                    ) : (
                      /* Behavioral Dimensions Comparison */
                      <div className="space-y-4">
                        {/* Dimension 1: Communication Style */}
                        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
                          <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                            <BrainCircuit size={13} className="text-blue-500 shrink-0" /> Communication Style
                          </h5>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {profile.traits.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-medium whitespace-nowrap">
                                {t}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-stone-600 leading-relaxed whitespace-pre-line">
                            {profile.recommendedApproach}
                          </p>
                        </div>

                        {/* Dimension 2: Primary Motivators */}
                        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
                          <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                            <Target size={13} className="text-emerald-500 shrink-0" /> Primary Motivators
                          </h5>
                          {profile.motivators.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {profile.motivators.map((m, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-medium">
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-stone-400 italic">No explicit motivators defined.</p>
                          )}
                        </div>

                        {/* Dimension 3: Friction Areas */}
                        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
                          <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                            <ShieldAlert size={13} className="text-rose-500 shrink-0" /> Friction Areas
                          </h5>
                          {profile.riskFactors.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {profile.riskFactors.map((r, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[10px] font-medium">
                                  {r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-stone-400 italic">No significant friction risks logged.</p>
                          )}
                        </div>

                        {/* Dimension 4: Objection-Handling Tips */}
                        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
                          <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                            <Sparkles size={13} className="text-indigo-500 shrink-0" /> Objection-Handling Tips
                          </h5>
                          {profile.selfCompatibility?.adaptationTips && profile.selfCompatibility.adaptationTips.length > 0 ? (
                            <ul className="space-y-1.5">
                              {profile.selfCompatibility.adaptationTips.map((tip, idx) => (
                                <li key={idx} className="text-[11px] text-stone-600 flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-indigo-500 font-bold shrink-0">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-stone-500 italic">No specific handling tips recorded.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Close Comparison
          </button>
        </div>
      </motion.div>
    </div>
  );
}
