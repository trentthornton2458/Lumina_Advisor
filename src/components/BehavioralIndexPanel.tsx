import React, { useState } from 'react';
import { Contact, MeetingNote, MyselfProfile, BehavioralProfile } from '../types';
import { computeWeightedEvidence, computeSignalScores, generateFallbackBehavioralSynthesis } from '../lib/behavioralScoring';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, RefreshCw, ShieldAlert, Compass, Users, ChevronRight, Info } from 'lucide-react';
import { useToast } from './Toast';

interface BehavioralIndexPanelProps {
  contact: Contact;
  contactNotes: MeetingNote[];
  profile?: MyselfProfile;
  behavioralProfile?: BehavioralProfile;
  onSaveProfile: (profile: BehavioralProfile) => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

const SIGNAL_BAR_COLOR = '#2563eb';

export default function BehavioralIndexPanel({ contact, contactNotes, profile, behavioralProfile, onSaveProfile }: BehavioralIndexPanelProps) {
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const weightingBreakdown = computeWeightedEvidence(contact, contactNotes);
      const signalScores = computeSignalScores(contactNotes);

      let qualitative: Omit<BehavioralProfile, 'contactId' | 'computedAt' | 'signalScores' | 'weightingBreakdown'> | null = null;

      try {
        const response = await fetch('/api/behavioral-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact, userProfile: profile, weightingBreakdown, signalScores })
        });
        const resData = await response.json();

        if (resData.status === 'success' && resData.data) {
          qualitative = { ...resData.data, isSimulated: false };
        } else {
          qualitative = generateFallbackBehavioralSynthesis(signalScores, contact, profile);
        }
      } catch (err) {
        qualitative = generateFallbackBehavioralSynthesis(signalScores, contact, profile);
      }

      const newProfile: BehavioralProfile = {
        contactId: contact.id,
        computedAt: new Date().toISOString(),
        signalScores,
        weightingBreakdown,
        ...qualitative!
      };

      onSaveProfile(newProfile);
      showToast(`Relationship index refreshed for ${contact.name}`, 'success');
    } catch (err) {
      showToast('Failed to refresh relationship index', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const chartData = behavioralProfile ? [
    { label: 'Rapport', value: behavioralProfile.signalScores.rapport },
    { label: 'Engagement', value: behavioralProfile.signalScores.engagement },
    { label: 'Friction Risk', value: behavioralProfile.signalScores.frictionRisk },
    { label: 'Recency', value: behavioralProfile.signalScores.recency },
  ] : [];

  return (
    <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
            <BrainCircuit size={15} /> Relationship & Behavioral Index
          </h3>
          <p className="text-[10px] text-stone-400 mt-0.5">
            {behavioralProfile ? `Last updated: ${formatRelativeTime(behavioralProfile.computedAt)}` : 'Not yet generated'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition shadow-sm"
        >
          {isRefreshing ? (
            <>
              <RefreshCw size={13} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <RefreshCw size={13} /> {behavioralProfile ? 'Refresh Profile' : 'Generate Profile'}
            </>
          )}
        </button>
      </div>

      {!behavioralProfile ? (
        <div className="text-center py-8">
          <Compass size={28} className="mx-auto text-stone-300 mb-2" />
          <p className="text-stone-400 text-xs max-w-sm mx-auto">
            Generate a weighted read of this contact's communication style, drawn from logged interactions,
            tags, and your private notes — plus guidance on how to adapt your own style to theirs.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {behavioralProfile.isSimulated && (
            <span className="inline-block font-mono text-[9px] text-amber-700 uppercase tracking-widest font-bold bg-amber-50 py-0.5 px-2.5 rounded border border-amber-200">
              Simulation Mode
            </span>
          )}

          {/* Confidence meter */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Confidence</span>
              <span className="text-xs font-bold text-stone-700 font-mono">{behavioralProfile.signalScores.confidence}/100</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${behavioralProfile.signalScores.confidence}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              Based on {contactNotes.length} logged interaction{contactNotes.length === 1 ? '' : 's'}
              {contactNotes.length > 0 ? ` · last interaction ${formatRelativeTime(contactNotes[0].date)}` : ''}
            </p>
          </div>

          {/* Signal bars */}
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11, fill: '#57534e' }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={SIGNAL_BAR_COLOR} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Traits / Motivators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Traits</h4>
              <div className="flex flex-wrap gap-1.5">
                {behavioralProfile.traits.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[11px] font-medium">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Motivators</h4>
              <div className="flex flex-wrap gap-1.5">
                {behavioralProfile.motivators.map((m, i) => (
                  <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[11px] font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Risk factors */}
          {behavioralProfile.riskFactors.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-rose-500" /> Risk Factors
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {behavioralProfile.riskFactors.map((r, i) => (
                  <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-md text-[11px] font-medium">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended approach */}
          <div>
            <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Recommended Approach</h4>
            <p className="text-stone-700 text-xs leading-relaxed bg-stone-50/80 p-3 rounded-lg border border-stone-150">
              {behavioralProfile.recommendedApproach}
            </p>
          </div>

          {/* Self compatibility */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5">
            <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Users size={12} /> How You Should Adapt
            </h4>
            <p className="text-indigo-900/80 text-xs leading-relaxed">{behavioralProfile.selfCompatibility.summary}</p>
            {behavioralProfile.selfCompatibility.adaptationTips.length > 0 && (
              <ul className="mt-2 space-y-1">
                {behavioralProfile.selfCompatibility.adaptationTips.map((tip, i) => (
                  <li key={i} className="text-[11px] text-indigo-900/70 flex items-start gap-1.5">
                    <ChevronRight size={11} className="mt-0.5 shrink-0" /> {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weighting breakdown */}
          <details className="border-t border-stone-100 pt-3">
            <summary className="text-[10px] text-stone-450 hover:text-stone-700 cursor-pointer font-bold uppercase tracking-wider select-none outline-none">
              Show Weighting Breakdown
            </summary>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full text-[10px] text-stone-600">
                <thead>
                  <tr className="text-left text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <th className="py-1.5 pr-2 font-bold">Source</th>
                    <th className="py-1.5 pr-2 font-bold">Type</th>
                    <th className="py-1.5 pr-2 font-bold text-right">Base</th>
                    <th className="py-1.5 pr-2 font-bold text-right">Decay</th>
                    <th className="py-1.5 font-bold text-right">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {behavioralProfile.weightingBreakdown.slice(0, 12).map((w, i) => (
                    <tr key={i} className="border-b border-stone-50">
                      <td className="py-1.5 pr-2 max-w-[220px] truncate" title={w.source}>{w.source}</td>
                      <td className="py-1.5 pr-2 capitalize">{w.sourceType}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{w.baseWeight.toFixed(2)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{w.decayMultiplier !== undefined ? w.decayMultiplier.toFixed(2) : '—'}</td>
                      <td className="py-1.5 text-right font-mono font-bold">{w.effectiveWeight.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {behavioralProfile.weightingBreakdown.length > 12 && (
                <p className="text-[10px] text-stone-400 mt-1.5">+{behavioralProfile.weightingBreakdown.length - 12} more</p>
              )}
            </div>
          </details>

          {/* Disclaimer - always visible */}
          <div className="flex items-start gap-2 text-[10px] text-stone-400 bg-stone-50 border border-stone-150 rounded-lg p-3">
            <Info size={13} className="shrink-0 mt-0.5" />
            <p>{behavioralProfile.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
