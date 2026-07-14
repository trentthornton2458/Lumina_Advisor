import React, { useState } from 'react';
import {
  Mail, Sparkles, Loader2, Copy, Check, Send,
  MessageSquare, Users
} from 'lucide-react';
import { Contact, MeetingNote, MyselfProfile } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';
import ModalShell from './ModalShell';

interface EmailDraftGeneratorProps {
  contact: Contact;
  notes: MeetingNote[];
  profile: MyselfProfile;
  onClose: () => void;
}

type EmailTemplate = 'follow-up' | 'thank-you' | 'action-items' | 'conflict-resolution' | 'introduction';

const TEMPLATES: { key: EmailTemplate; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'follow-up', label: 'Follow-up', description: 'Post-meeting follow-up with next steps', icon: <Send size={14} /> },
  { key: 'thank-you', label: 'Thank You', description: 'Express gratitude after a positive interaction', icon: <MessageSquare size={14} /> },
  { key: 'action-items', label: 'Action Items', description: 'Summary of agreed action items & deadlines', icon: <Mail size={14} /> },
  { key: 'conflict-resolution', label: 'Conflict Resolution', description: 'Diplomatic message to address concerns', icon: <Users size={14} /> },
  { key: 'introduction', label: 'Introduction', description: 'Professional introduction or referral', icon: <Mail size={14} /> },
];

export default function EmailDraftGenerator({ contact, notes, profile, onClose }: EmailDraftGeneratorProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('follow-up');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get notes related to this contact
  const contactNotes = notes
    .filter(n => n.contactId === contact.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const generateEmail = async () => {
    setIsGenerating(true);
    setGeneratedEmail('');

    const noteSummaries = contactNotes.map(n => 
      `- "${n.title}" (${n.date}): ${n.content.slice(0, 200)}... Key points: ${n.keyPoints?.join(', ') || 'N/A'}. Sentiment: ${n.sentimentScore}/10`
    ).join('\n');

    const prompt = `You are a professional communication assistant. Write a ${selectedTemplate} email draft.

SENDER PROFILE:
- Name: ${profile.name}
- Position: ${profile.position} at ${profile.company}
- Communication Style: ${profile.communicationStyle}
- Personality: ${profile.personality}

RECIPIENT:
- Name: ${contact.name}
- Position: ${contact.position} at ${contact.company}
- Relationship Status: ${contact.relationStatus}
- Relationship Quality: ${contact.status}
- Notes: ${contact.notes || 'No additional notes'}

RECENT INTERACTION HISTORY:
${noteSummaries || 'No recent meeting notes available'}

EMAIL TYPE: ${selectedTemplate.replace('-', ' ')}
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

Write a professional email that:
1. Matches the sender's communication style (${profile.communicationStyle})
2. Is appropriate for the current relationship quality (${contact.status})
3. References specific details from recent meetings when available
4. Is concise but warm and actionable
5. Includes a clear call-to-action or next step

Format as a complete email with Subject:, then the body. Do NOT include "From:" or "To:" headers.`;

    try {
      const response = await authedFetch('/api/ai-advice', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email-draft', prompt })
      });

      if (!response.ok) throw new Error('AI generation failed');
      
      const data = await response.json();
      if (data.advice) {
        setGeneratedEmail(data.advice);
      } else {
        throw new Error('No content returned');
      }
    } catch (err) {
      // Generate fallback email
      setGeneratedEmail(generateFallbackEmail());
      showToast('Generated with local templates (AI unavailable)', 'warning');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackEmail = () => {
    const lastNote = contactNotes[0];
    const templates: Record<EmailTemplate, string> = {
      'follow-up': `Subject: Following Up — ${lastNote?.title || 'Our Recent Discussion'}

Hi ${contact.name},

I hope you're doing well. I wanted to follow up on our recent conversation${lastNote ? ` regarding "${lastNote.title}"` : ''}.

${lastNote?.keyPoints?.length ? `As discussed, the key points we covered were:\n${lastNote.keyPoints.map(kp => `• ${kp}`).join('\n')}\n` : ''}
I'd love to continue our dialogue and ensure we're aligned on next steps. Would you have time this week for a brief check-in?

Looking forward to hearing from you.

Best regards,
${profile.name}
${profile.position}, ${profile.company}`,

      'thank-you': `Subject: Thank You, ${contact.name}

Hi ${contact.name},

I just wanted to take a moment to express my gratitude for ${lastNote ? `our meeting on ${lastNote.date}` : 'your time and collaboration recently'}.

Your insights and perspective have been incredibly valuable, and I truly appreciate the depth of engagement you bring to our conversations.

I'm looking forward to continuing to build on the progress we've made together.

Warm regards,
${profile.name}
${profile.position}, ${profile.company}`,

      'action-items': `Subject: Action Items Summary — ${lastNote?.title || 'Next Steps'}

Hi ${contact.name},

Thank you for the productive session. Here's a summary of the action items we identified:

${lastNote?.keyPoints?.length 
  ? lastNote.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')
  : '1. [Action item to be confirmed]\n2. [Follow-up meeting to be scheduled]'}

Please let me know if I've missed anything or if any items need adjustment.

Best,
${profile.name}
${profile.position}, ${profile.company}`,

      'conflict-resolution': `Subject: Moving Forward Together

Hi ${contact.name},

I appreciate your openness during our recent discussions, and I want to acknowledge the challenges we've encountered. Building strong professional partnerships sometimes requires navigating through differences.

I believe we share the same ultimate goals, and I'm committed to finding a path forward that works for both sides. I'd like to propose a focused conversation where we can address concerns directly and explore mutually beneficial solutions.

Would you be open to a brief call this week?

Sincerely,
${profile.name}
${profile.position}, ${profile.company}`,

      'introduction': `Subject: Introduction — ${profile.name}, ${profile.company}

Hi ${contact.name},

I hope this message finds you well. My name is ${profile.name}, and I serve as ${profile.position} at ${profile.company}.

I've been following your work at ${contact.company} and believe there could be meaningful synergies between our organizations. I'd love the opportunity to connect and explore potential areas of collaboration.

Would you be open to a brief introductory call at your convenience?

Best regards,
${profile.name}
${profile.position}, ${profile.company}`
    };

    return templates[selectedTemplate];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Email draft copied to clipboard', 'success');
  };

  return (
    <ModalShell
      title="AI Email Draft"
      subtitle={<>Compose a context-aware email to <span className="font-semibold text-slate-700">{contact.name}</span></>}
      icon={<Mail size={20} className="text-white" />}
      iconWrapperClassName="bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-600/20"
      headerClassName="from-slate-50 to-indigo-50/30"
      onClose={onClose}
    >
      {/* Template picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTemplate(t.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTemplate === t.key
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex items-center gap-2 ${selectedTemplate === t.key ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {t.icon}
                    <span className="text-xs font-bold">{t.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional context */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Additional Context (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Mention the new pricing structure, or reference the Q3 targets..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition resize-none"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={generateEmail}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {generatedEmail ? 'Regenerate Email' : 'Generate Email Draft'}
              </>
            )}
          </button>

          {/* Generated email output */}
          {generatedEmail && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Mail size={12} />
                  Generated Draft
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium transition"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              <div className="p-5">
                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {generatedEmail}
                </pre>
              </div>
            </div>
          )}
    </ModalShell>
  );
}
