export type RelationshipStatus = 'Warm' | 'Active' | 'Cold' | 'Neutral';
export type NoteCategory =
  | 'Discovery'
  | 'Demo'
  | 'Client Pitch'
  | 'Negotiation'
  | 'Onboarding'
  | 'Strategy Sync'
  | 'QBR'
  | 'Renewal'
  | 'Escalation'
  | 'Support'
  | 'Internal'
  | 'Catch-up'
  | 'Follow-up';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  description?: string;
  historicalData?: string; // History log of notes and context about the company
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  company: string;
  companyId?: string; // Optional direct link to a Company entity
  email: string;
  phone?: string;
  relationStatus: RelationshipStatus;
  affiliation?: 'Internal' | 'External';
  status?: 'Bad' | 'Neutral' | 'Good' | 'Exceptional';
  linkedin?: string;
  notes?: string;
  tags: string[];
}

export interface MeetingNote {
  id: string;
  date: string; // ISO format (YYYY-MM-DD)
  title: string;
  contactId?: string; // Primary contact this note is linked to
  attendeeIds?: string[]; // Additional contacts present in the meeting, beyond contactId
  companyId?: string; // Optional links to a Company
  content: string;
  category: NoteCategory;
  sentimentScore: number; // 1 to 10 (10 = Extremely Positive, 1 = Extremely Negative/Hostile)
  engagementLevel: number; // 1 to 10 (10 = Highly Engaged, 1 = Completely Indifferent)
  keyPoints: string[];
  insights?: string; // AI generated summary/advice if triggered
  coachingOpportunities?: string[]; // AI generated coaching tips for the note author, if applicable
  isPrivate?: boolean;
}

export interface TaskReminder {
  id: string;
  contactId?: string;
  companyId?: string; // Optional link to a Company
  meetingNoteId?: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  priority: TaskPriority;
  notes?: string;
}

export interface MyselfProfile {
  name: string;
  position: string;
  company: string;
  companyLocation?: string;
  companySize?: string;
  companySummary?: string;
  personality: string;
  coreStrengths: string;
  communicationStyle: string;
  careerGoals: string;
  extraDetails?: string;
  profilePicture?: string;
}

export interface SOPDocument {
  id: string;
  title: string;
  fileType: string;
  content: string; // extracted text or text-based SOP summary for AI context
  uploadedAt: string;
  fileSize?: number;
  userNotes?: string;
  aiSummary?: string;
}

export interface AISuggestionRequest {
  targetContactId?: string;
  targetCompanyId?: string;
  selectedNoteIds: string[];
  userPrompt?: string;
  adviceCategory: 'meetingPrep' | 'frictionRedline' | 'strategicActionList' | 'customTemplate';
  customTemplateStructure?: string; // user custom layout structure
  activeSops?: SOPDocument[];
}

export type AIHighlightType = 'risk' | 'objection' | 'opportunity' | 'quote';

export interface AIHighlight {
  type: AIHighlightType;
  text: string;
  response?: string; // recommended counter/response, expected for type 'objection'
}

export interface AISuggestionSection {
  heading: string;
  body: string; // markdown-formatted prose, rendered with react-markdown
  highlights?: AIHighlight[];
}

export interface AISuggestionResponse {
  assessment: string;
  sections: AISuggestionSection[];
  suggestedTasks: Array<{ title: string; priority: TaskPriority; note?: string }>;
}

export interface SavedAdvisorReport {
  id: string;
  createdAt: string; // ISO datetime
  title: string;
  adviceCategory: 'meetingPrep' | 'frictionRedline' | 'strategicActionList' | 'customTemplate';
  contactId?: string;
  companyId?: string;
  contactName?: string; // denormalized snapshot - survives contact rename/delete
  companyName?: string;
  userPrompt?: string;
  sourceNoteIds?: string[];
  response: AISuggestionResponse;
}

export interface BehavioralWeightFactor {
  source: string; // human-readable evidence label, e.g. "Note: 'Q3 Renewal Call' (2026-06-02)"
  sourceType: 'note' | 'tag' | 'relationStatus' | 'contactNotes' | 'status';
  baseWeight: number;
  decayMultiplier?: number; // recency decay applied to notes only, 0-1
  effectiveWeight: number;
}

export interface BehavioralSignalScores {
  rapport: number; // 0-100, weighted-avg sentiment
  engagement: number; // 0-100, weighted-avg engagement
  frictionRisk: number; // 0-100, weighted share from low-sentiment/negotiation notes
  recency: number; // 0-100, freshness of most recent interaction
  confidence: number; // 0-100, volume/frequency based - gates how much weight to give the read
}

export interface BehavioralProfile {
  contactId: string;
  computedAt: string; // ISO datetime of last "Refresh Profile"
  signalScores: BehavioralSignalScores;
  weightingBreakdown: BehavioralWeightFactor[];
  traits: string[];
  motivators: string[];
  riskFactors: string[];
  recommendedApproach: string;
  selfCompatibility: {
    summary: string;
    adaptationTips: string[];
  };
  isSimulated?: boolean;
  disclaimer: string;
}

