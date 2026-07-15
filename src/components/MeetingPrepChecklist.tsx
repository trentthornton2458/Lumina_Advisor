import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Sparkles, Loader2, CheckCircle2, Circle,
  User, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle,
  Target, FileText
} from 'lucide-react';
import { Contact, MeetingNote, TaskReminder, MyselfProfile } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';
import { noteInvolvesContact } from '../lib/noteUtils';
import ModalShell from './ModalShell';

interface MeetingPrepChecklistProps {
  contact: Contact;
  notes: MeetingNote[];
  tasks: TaskReminder[];
  profile: MyselfProfile;
  onClose: () => void;
}

export default function MeetingPrepChecklist({ contact, notes, tasks, profile, onClose }: MeetingPrepChecklistProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [aiTalkingPoints, setAiTalkingPoints] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Gather data for this contact
  const contactNotes = useMemo(() =>
    notes
      .filter(n => noteInvolvesContact(n, contact.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [notes, contact.id]
  );

  const openTasks = useMemo(() => 
    tasks.filter(t => t.contactId === contact.id && !t.completed),
    [tasks, contact.id]
  );

  const lastNote = contactNotes[0];

  // Sentiment trend
  const sentimentTrend = useMemo(() => {
    if (contactNotes.length < 2) return 'stable';
    const recent = contactNotes.slice(0, 3).reduce((sum, n) => sum + n.sentimentScore, 0) / Math.min(contactNotes.length, 3);
    const older = contactNotes.slice(-3).reduce((sum, n) => sum + n.sentimentScore, 0) / Math.min(contactNotes.length, 3);
    if (recent - older > 1) return 'improving';
    if (older - recent > 1) return 'declining';
    return 'stable';
  }, [contactNotes]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateAITalkingPoints = async () => {
    setIsLoadingAI(true);
    try {
      const response = await authedFetch('/api/ai-advice', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting-prep',
          prompt: `Generate 5 specific, actionable talking points for an upcoming meeting.

MY PROFILE:
- ${profile.name}, ${profile.position} at ${profile.company}
- Communication style: ${profile.communicationStyle}
- Goals: ${profile.careerGoals}

MEETING WITH:
- ${contact.name}, ${contact.position} at ${contact.company}
- Relationship status: ${contact.relationStatus} (${contact.status})
- Notes: ${contact.notes || 'None'}

RECENT INTERACTIONS:
${contactNotes.slice(0, 3).map(n => `- ${n.date}: "${n.title}" (Sentiment: ${n.sentimentScore}/10) - Key: ${n.keyPoints?.join('; ') || n.content.slice(0, 100)}`).join('\n')}

OPEN ACTION ITEMS:
${openTasks.map(t => `- ${t.title} (${t.priority} priority, due ${t.dueDate})`).join('\n') || 'None'}

Sentiment trend: ${sentimentTrend}

Return ONLY a JSON array of 5 strings, each being a concise talking point. No markdown, no code blocks.`
        })
      });

      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      
      if (data.advice) {
        try {
          const cleaned = data.advice.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            setAiTalkingPoints(parsed);
            showToast('AI talking points generated', 'success');
            return;
          }
        } catch {}
      }
      throw new Error('Parse failed');
    } catch {
      // Fallback talking points
      const fallback = [];
      if (lastNote) {
        fallback.push(`Follow up on the key outcomes from your "${lastNote.title}" meeting on ${lastNote.date}`);
      }
      if (openTasks.length > 0) {
        fallback.push(`Address ${openTasks.length} open action item(s): ${openTasks[0].title}`);
      }
      if (sentimentTrend === 'declining') {
        fallback.push(`Sentiment is trending down — actively listen and address any concerns early in the conversation`);
      }
      fallback.push(`Align on mutual priorities and set clear next steps with deadlines`);
      fallback.push(`Ask ${contact.name} about their current priorities and any blockers they're facing`);
      setAiTalkingPoints(fallback);
      showToast('Generated local talking points', 'info');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const CheckItem = ({ id, label, sublabel, priority }: { id: string; label: string; sublabel?: string; priority?: 'high' | 'medium' | 'low' }) => (
    <button
      onClick={() => toggleCheck(id)}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all w-full text-left ${
        checkedItems.has(id)
          ? 'bg-emerald-50/50 border-emerald-200 line-through opacity-60'
          : priority === 'high' 
            ? 'bg-rose-50/30 border-rose-100 hover:border-rose-200'
            : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      {checkedItems.has(id) 
        ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        : <Circle size={18} className="text-slate-400 shrink-0 mt-0.5" />
      }
      <div>
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {sublabel && <span className="block text-xs text-slate-500 mt-0.5">{sublabel}</span>}
      </div>
    </button>
  );

  return (
    <ModalShell
      title="Meeting Prep Checklist"
      subtitle={<>Prepare for your meeting with <span className="font-semibold text-slate-700">{contact.name}</span></>}
      icon={<ClipboardList size={20} className="text-white" />}
      iconWrapperClassName="bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-600/20"
      headerClassName="from-slate-50 to-emerald-50/30"
      onClose={onClose}
      footer={
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {checkedItems.size} of {
              (lastNote ? 1 : 0) + openTasks.length +
              (contact.status === 'Bad' ? 1 : 0) + (sentimentTrend === 'declining' ? 1 : 0) +
              aiTalkingPoints.length + 4
            } items checked
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
          >
            Close Checklist
          </button>
        </div>
      }
    >
          {/* Contact Quick Context */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <User size={24} className="text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800">{contact.name}</h3>
              <p className="text-xs text-slate-500">{contact.position} at {contact.company}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                {sentimentTrend === 'improving' && <TrendingUp size={14} className="text-emerald-600" />}
                {sentimentTrend === 'declining' && <TrendingDown size={14} className="text-rose-600" />}
                {sentimentTrend === 'stable' && <Minus size={14} className="text-slate-400" />}
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  sentimentTrend === 'improving' ? 'text-emerald-700' :
                  sentimentTrend === 'declining' ? 'text-rose-700' : 'text-slate-500'
                }`}>
                  {sentimentTrend} sentiment
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{contactNotes.length} past meetings</span>
            </div>
          </div>

          {/* Section: Review Previous Meeting */}
          {lastNote && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText size={12} /> Last Meeting Summary
              </h4>
              <CheckItem 
                id="review-last" 
                label={`Review: "${lastNote.title}" (${lastNote.date})`}
                sublabel={`Sentiment: ${lastNote.sentimentScore}/10 | ${lastNote.keyPoints?.slice(0, 2).join(' • ') || 'No key points recorded'}`}
              />
            </div>
          )}

          {/* Section: Open Action Items */}
          {openTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock size={12} /> Open Action Items ({openTasks.length})
              </h4>
              <div className="space-y-2">
                {openTasks.map(task => (
                  <CheckItem
                    key={task.id}
                    id={`task-${task.id}`}
                    label={task.title}
                    sublabel={`Due: ${task.dueDate} | ${task.priority} priority`}
                    priority={task.priority === 'High' ? 'high' : task.priority === 'Medium' ? 'medium' : 'low'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Relationship Alerts */}
          {(contact.status === 'Bad' || sentimentTrend === 'declining') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Relationship Alert</span>
              </div>
              <div className="space-y-2">
                {contact.status === 'Bad' && (
                  <CheckItem id="alert-status" label="Relationship status is 'Bad' — lead with empathy and active listening" priority="high" />
                )}
                {sentimentTrend === 'declining' && (
                  <CheckItem id="alert-declining" label="Sentiment is trending downward — address concerns early" priority="high" />
                )}
              </div>
            </div>
          )}

          {/* Section: AI Talking Points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={12} /> AI-Suggested Talking Points
              </h4>
              <button
                onClick={generateAITalkingPoints}
                disabled={isLoadingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60"
              >
                {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {aiTalkingPoints.length > 0 ? 'Regenerate' : 'Generate Points'}
              </button>
            </div>
            
            {aiTalkingPoints.length > 0 ? (
              <div className="space-y-2">
                {aiTalkingPoints.map((point, idx) => (
                  <CheckItem key={idx} id={`ai-${idx}`} label={point} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Click "Generate Points" for AI-powered conversation starters
              </div>
            )}
          </div>

          {/* Essential Prep Items */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target size={12} /> Essential Preparation
            </h4>
            <div className="space-y-2">
              <CheckItem id="prep-agenda" label="Prepare meeting agenda with clear objectives" />
              <CheckItem id="prep-docs" label="Gather relevant documents, proposals, and data" />
              <CheckItem id="prep-questions" label="Prepare 2-3 open-ended discovery questions" />
              <CheckItem id="prep-next-steps" label="Define desired outcomes and next steps before the meeting" />
            </div>
          </div>
    </ModalShell>
  );
}
