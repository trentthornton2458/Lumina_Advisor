import { MeetingNote } from '../types';

export function noteInvolvesContact(note: MeetingNote, contactId: string): boolean {
  return note.contactId === contactId || !!note.attendeeIds?.includes(contactId);
}

export function getNoteAttendeeIds(note: MeetingNote): string[] {
  const ids = note.contactId ? [note.contactId] : [];
  return [...ids, ...(note.attendeeIds || [])];
}

export interface NoteInsightsResult {
  keyPoints: string[];
  insights: string;
  coachingOpportunities: string[];
  sentimentScore: number;
  engagementLevel: number;
  isSimulated?: boolean;
}

// No-API-key/unavailable fallback: a plain extraction from the note text, not a
// coached read. We deliberately don't guess at sentiment/engagement shifts without
// AI — the sliders are left at whatever the user already had them set to.
export function generateFallbackNoteInsights(
  content: string,
  currentSentiment: number,
  currentEngagement: number
): NoteInsightsResult {
  const sentences = content
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 12);

  const keyPoints = sentences.slice(0, Math.min(4, sentences.length));

  return {
    keyPoints: keyPoints.length > 0 ? keyPoints : ['No distinct key points could be extracted from the note content.'],
    insights: 'Simulation mode: no live AI analysis was generated. This is a plain extraction from your note text, not a coached read of the conversation.',
    coachingOpportunities: [],
    sentimentScore: currentSentiment,
    engagementLevel: currentEngagement,
    isSimulated: true,
  };
}
