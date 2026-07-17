import React, { useMemo, useState } from 'react';
import { MeetingNote, PersonalNote, Contact, MyselfProfile } from '../types';
import {
  GraduationCap, TrendingUp, TrendingDown, Sparkles, Loader2,
  ThumbsUp, AlertTriangle, RefreshCw, Minus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';

interface CoachingPanelProps {
  notes: MeetingNote[];
  personalNotes: PersonalNote[];
  contacts: Contact[];
  profile: MyselfProfile;
  onSelectNote?: (id: string | null) => void;
}

const WINDOW_DAYS = 10;

interface AISummary {
  strengths: string[];
  improvementAreas: string[];
  summary: string;
}

export default function CoachingPanel({ notes, personalNotes, contacts, profile, onSelectNote }: CoachingPanelProps) {
  const { user } = useAuth();
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const now = Date.now();
  const cutoffRecent = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoffPrior = now - (WINDOW_DAYS * 2) * 24 * 60 * 60 * 1000;

  const recentNotes = useMemo(
    () => notes.filter(n => new Date(n.date).getTime() >= cutoffRecent),
    [notes, cutoffRecent]
  );
  const priorNotes = useMemo(
    () => notes.filter(n => {
      const t = new Date(n.date).getTime();
      return t >= cutoffPrior && t < cutoffRecent;
    }),
    [notes, cutoffPrior, cutoffRecent]
  );
  const recentPersonalNotes = useMemo(
    () => personalNotes.filter(n => new Date(n.date).getTime() >= cutoffRecent),
    [personalNotes, cutoffRecent]
  );

  const avg = (arr: MeetingNote[], key: 'sentimentScore' | 'engagementLevel') =>
    arr.length > 0 ? arr.reduce((s, n) => s + n[key], 0) / arr.length : 0;

  const recentAvgSentiment = avg(recentNotes, 'sentimentScore');
  const recentAvgEngagement = avg(recentNotes, 'engagementLevel');
  const priorAvgSentiment = avg(priorNotes, 'sentimentScore');
  const priorAvgEngagement = avg(priorNotes, 'engagementLevel');

  const sentimentDelta = priorNotes.length > 0 ? Number((recentAvgSentiment - priorAvgSentiment).toFixed(1)) : null;
  const engagementDelta = priorNotes.length > 0 ? Number((recentAvgEngagement - priorAvgEngagement).toFixed(1)) : null;

  const coachingTips = useMemo(
    () => recentNotes.flatMap(n =>
      (n.coachingOpportunities || []).map(tip => ({ tip, noteTitle: n.title, date: n.date, noteId: n.id }))
    ),
    [recentNotes]
  );

  const wins = useMemo(
    () => recentNotes.filter(n => n.sentimentScore >= 8 || n.engagementLevel >= 8)
      .sort((a, b) => (b.sentimentScore + b.engagementLevel) - (a.sentimentScore + a.engagementLevel)),
    [recentNotes]
  );

  const risks = useMemo(
    () => recentNotes.filter(n => n.sentimentScore < 5 || n.engagementLevel < 5)
      .sort((a, b) => (a.sentimentScore + a.engagementLevel) - (b.sentimentScore + b.engagementLevel)),
    [recentNotes]
  );

  const contactName = (n: MeetingNote) => {
    const id = n.contactId || n.attendeeIds?.[0];
    return id ? contacts.find(c => c.id === id)?.name : undefined;
  };

  const buildLocalFallbackSummary = (): AISummary => {
    const strengths: string[] = [];
    const improvementAreas: string[] = [];

    if (wins.length > 0) {
      strengths.push(`${wins.length} meeting${wins.length === 1 ? '' : 's'} in the last ${WINDOW_DAYS} days scored high on sentiment or engagement, including "${wins[0].title}".`);
    }
    if (sentimentDelta !== null && sentimentDelta > 0) {
      strengths.push(`Average sentiment is trending up (+${sentimentDelta} vs. the prior ${WINDOW_DAYS} days).`);
    }
    if (strengths.length === 0) {
      strengths.push('Not enough high-scoring meetings in this window to call out a specific strength yet.');
    }

    if (coachingTips.length > 0) {
      improvementAreas.push(`${coachingTips.length} flagged coaching tip${coachingTips.length === 1 ? '' : 's'} from recent notes, e.g. "${coachingTips[0].tip}".`);
    }
    if (risks.length > 0) {
      improvementAreas.push(`${risks.length} meeting${risks.length === 1 ? '' : 's'} scored low on sentiment or engagement, including "${risks[0].title}".`);
    }
    if (improvementAreas.length === 0) {
      improvementAreas.push('No clear risk areas flagged in this window — keep up current habits.');
    }

    return {
      strengths,
      improvementAreas,
      summary: `Local summary based on ${recentNotes.length} meeting note${recentNotes.length === 1 ? '' : 's'} logged in the last ${WINDOW_DAYS} days.`,
    };
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await authedFetch('/api/coaching-tips', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          notes: recentNotes,
          personalNotes: recentPersonalNotes,
          dayCount: WINDOW_DAYS,
        }),
      });

      if (!response.ok) throw new Error('Server returned an error status.');
      const resData = await response.json();

      if (resData.status === 'success' && resData.data) {
        setAiSummary(resData.data);
      } else {
        // apiKeyMissing / apiServiceUnavailable / any other graceful-degradation shape
        setAiSummary(buildLocalFallbackSummary());
      }
    } catch (err) {
      setGenerationError('Could not reach the AI service — showing a local summary instead.');
      setAiSummary(buildLocalFallbackSummary());
    } finally {
      setIsGenerating(false);
    }
  };

  const DeltaBadge = ({ delta }: { delta: number | null }) => {
    if (delta === null) return <span className="text-[10px] text-slate-400 font-semibold">No prior window</span>;
    if (delta > 0) return <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5"><TrendingUp size={11} />+{delta}</span>;
    if (delta < 0) return <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5"><TrendingDown size={11} />{delta}</span>;
    return <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5"><Minus size={11} />0.0</span>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <GraduationCap size={16} className="text-blue-600" />
          Coaching — Last {WINDOW_DAYS} Days
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          A quick read on what's gone well and what needs work, based on your logged meetings{personalNotes.length > 0 ? ' and personal notes' : ''}.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Meetings Logged</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{recentNotes.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Avg Sentiment</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-800">{recentNotes.length > 0 ? recentAvgSentiment.toFixed(1) : '—'}</p>
            <DeltaBadge delta={sentimentDelta} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Avg Engagement</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-800">{recentNotes.length > 0 ? recentAvgEngagement.toFixed(1) : '—'}</p>
            <DeltaBadge delta={engagementDelta} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Coaching Tips</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{coachingTips.length}</p>
        </div>
      </div>

      {/* What went well / Needs improvement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <ThumbsUp size={14} />
            What Went Well
          </h4>
          {wins.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No standout high-sentiment/engagement meetings in this window yet.</p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <ul className="space-y-2.5">
                {wins.map(n => (
                  <li 
                    key={n.id} 
                    onClick={() => {
                      if (onSelectNote) {
                        onSelectNote(n.id);
                      }
                    }}
                    className={`text-xs bg-emerald-50/50 hover:bg-emerald-55 border border-emerald-100 rounded-xl p-3 transition ${onSelectNote ? 'cursor-pointer hover:shadow-xs' : ''}`}
                  >
                    <p className="font-bold text-slate-800 underline decoration-dashed">{n.title}</p>
                    <p className="text-slate-500 mt-1">{n.date}{contactName(n) ? ` · ${contactName(n)}` : ''} · Sentiment {n.sentimentScore}/10, Engagement {n.engagementLevel}/10</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <AlertTriangle size={14} />
            Needs Improvement
          </h4>
          {coachingTips.length === 0 && risks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No flagged coaching tips or low-scoring meetings in this window.</p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <ul className="space-y-2.5">
                {coachingTips.map((t, i) => (
                  <li 
                    key={`tip-${i}`} 
                    onClick={() => {
                      if (onSelectNote) {
                        onSelectNote(t.noteId);
                      }
                    }}
                    className={`text-xs bg-amber-50/50 hover:bg-amber-55 border border-amber-100 rounded-xl p-3 transition ${onSelectNote ? 'cursor-pointer hover:shadow-xs' : ''}`}
                  >
                    <p className="text-slate-700 font-medium">{t.tip}</p>
                    <p className="text-slate-400 mt-1 font-mono text-[9px] uppercase tracking-wider underline decoration-dashed">From "{t.noteTitle}" · {t.date}</p>
                  </li>
                ))}
                {risks.map(n => (
                  <li 
                    key={n.id} 
                    onClick={() => {
                      if (onSelectNote) {
                        onSelectNote(n.id);
                      }
                    }}
                    className={`text-xs bg-rose-50/50 hover:bg-rose-55 border border-rose-100 rounded-xl p-3 transition ${onSelectNote ? 'cursor-pointer hover:shadow-xs' : ''}`}
                  >
                    <p className="font-bold text-slate-800 underline decoration-dashed">{n.title}</p>
                    <p className="text-slate-500 mt-1">{n.date}{contactName(n) ? ` · ${contactName(n)}` : ''} · Sentiment {n.sentimentScore}/10, Engagement {n.engagementLevel}/10</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-blue-500" />
            AI Coaching Summary
          </h4>
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl transition"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {aiSummary ? 'Regenerate' : 'Generate AI Summary'}
          </button>
        </div>

        {generationError && (
          <p className="text-[11px] text-amber-600 mt-3">{generationError}</p>
        )}

        {aiSummary ? (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">{aiSummary.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Strengths</p>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  {aiSummary.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Improvement Areas</p>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  {aiSummary.improvementAreas.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic mt-3">
            Generate a synthesized narrative summary of your last {WINDOW_DAYS} days, grounded in the meetings and personal notes above.
          </p>
        )}
      </div>
    </div>
  );
}
