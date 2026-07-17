import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3005;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-loaded Gemini SDK client
let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

// Resilient GenAI call with automatic model fallback and retries for 503/429
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[API Advisor] Attempting generateContent with model: ${model} (attempt ${attempt}/${attempts})`);
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        if (response && response.text) {
          return response;
        }
        throw new Error('Received empty text response from model.');
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[API Advisor] Error with model ${model} (attempt ${attempt}):`, errMsg);

        // Fail fast on bad requests
        if (
          errMsg.includes('400') ||
          err?.status === 400 ||
          err?.statusCode === 400
        ) {
          throw err;
        }

        // Fail fast on Quota Exceeded (429 / RESOURCE_EXHAUSTED) as project-wide limits cannot be bypassed by retrying
        const errLower = errMsg.toLowerCase();
        if (
          errLower.includes('429') ||
          errLower.includes('quota') ||
          errLower.includes('resource_exhausted') ||
          errLower.includes('exhausted')
        ) {
          console.log(`[API Advisor] Project Quota limit reached. Failing fast to trigger instant UI simulation fallback.`);
          throw err;
        }

        if (model === modelsToTry[modelsToTry.length - 1] && attempt === attempts) {
          break;
        }

        // Exponential backoff with up to 800ms randomized jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 800);
        console.log(`[API Advisor] Rate/Demand spike seen. Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All model attempts exhausted; failed to generate content.');
}

// Allowlist of `type` values accepted by the flexible /api/ai-advice branch.
// These are the only values sent by real callers (MeetingTranscriber,
// EmailDraftGenerator, MeetingPrepChecklist).
const ALLOWED_FLEXIBLE_TYPES = ['meeting-transcription', 'email-draft', 'meeting-prep'];
const MAX_FLEXIBLE_PROMPT_LENGTH = 20000;

// Shared guardrail prepended to every system instruction that reasons about a person's
// personality, communication style, or behavior. Keeps all AI-profiling endpoints aligned
// on the same protected-characteristic exclusion and ADMT (automated decision-making) boundary,
// instead of each prompt drifting independently.
const PROTECTED_ATTRIBUTE_GUARDRAIL = `Do NOT infer, reference, or speculate about protected characteristics (race, religion, disability, gender identity, sexual orientation, age, national origin, pregnancy, or similar), even indirectly. This analysis is an individual communication-coaching aid only — it must never be presented as, or used as, the sole or primary basis for an employment decision (hiring, firing, promotion, discipline, compensation, or performance review).`;

// AI Advisor API Endpoint
app.post('/api/ai-advice', requireAuth, async (req, res) => {
  try {
    const { userProfile, adviceCategory, selectedNotes, selectedContacts, userPrompt, type, prompt, priorReports, behavioralProfile } = req.body;

    // Handle flexible prompt types (transcription, email drafts, etc.)
    if (type && prompt) {
      // Reject unknown types to keep this from being an open prompt pass-through.
      if (!ALLOWED_FLEXIBLE_TYPES.includes(type)) {
        return res.status(400).json({ error: `Unsupported request type: ${String(type)}` });
      }
      // Cap prompt length for this branch specifically.
      if (typeof prompt !== 'string' || prompt.length > MAX_FLEXIBLE_PROMPT_LENGTH) {
        return res.status(400).json({ error: `Prompt exceeds maximum allowed length of ${MAX_FLEXIBLE_PROMPT_LENGTH} characters.` });
      }

      let ai;
      try {
        ai = getGenAI();
      } catch (err: any) {
        if (err.message === 'GEMINI_API_KEY_MISSING') {
          return res.status(200).json({ status: 'error', errorType: 'apiKeyMissing', message: 'API key not configured.' });
        }
        throw err;
      }

      try {
        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            systemInstruction: 'You are an expert professional assistant. Respond precisely and helpfully.',
          },
        });
        return res.json({ status: 'success', advice: response.text });
      } catch (genErr: any) {
        console.error(`[API ${type}] Generation failed:`, genErr.message);
        return res.status(200).json({ status: 'fallback', advice: null, message: 'AI generation unavailable, using local fallback.' });
      }
    }

    if (!userProfile) {
      return res.status(400).json({ error: 'User profile is required.' });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (err: any) {
      if (err.message === 'GEMINI_API_KEY_MISSING') {
        return res.status(200).json({
          status: 'error',
          errorType: 'apiKeyMissing',
          message: 'The Gemini API Key is not configured. Please add GEMINI_API_KEY in the Secrets panel in AI Studio.',
        });
      }
      throw err;
    }

    // Build the prompt content
    const categoryExplanation = {
      meetingPrep: 'Helps prepare for next meeting. Combine selected notes, key points, discussions to build a prep plan according to the user title, personality, with coaching.',
      frictionRedline: 'Analyze where things went off the rails. Detect friction points, previous context, and history to get client/company back on track with recommendations based on personality, history, and expert business advice.',
      strategicActionList: 'Generate a list of action items based on conversation notes and SOP rules, avoiding duplicate tasks already scheduled. Make sure we follow SOP steps.',
      customTemplate: 'Answer user in the exact structure specified in customTemplateStructure.'
    }[adviceCategory as 'meetingPrep' | 'frictionRedline' | 'strategicActionList' | 'customTemplate'] || 'General professional advice.';

    const systemInstruction = `You are an elite professional consultant, communication coach, and corporate strategist.
${PROTECTED_ATTRIBUTE_GUARDRAIL}
Your objective is to analyze meeting/conversation notes, contact status, user's style, and Standard Operating Procedures (SOPs), then generate high-tact, deep-dive advisory insights.
Be highly specific, referring to the contacts, roles, companies, and historical points provided.
Structure your response as 2-5 distinct "sections", each with a short "heading" and a "body" in clean markdown (use **bold**, "-" bullet lists, and short paragraphs — do NOT use "#"/"##" heading syntax inside body, the heading field already provides that).
For every concrete risk, client objection (with your recommended response), notable opportunity, or directly quotable line worth calling out, add a structured entry to that section's "highlights" array with the correct "type" ("risk", "objection", "opportunity", or "quote") — objections MUST include a "response". Highlights are call-outs IN ADDITION to the prose, not a substitute for it.
If "PRIOR SAVED ADVISOR REPORTS" are supplied, treat them as ground truth for what has already been advised — do not repeat identical recommendations verbatim; acknowledge progress or repeated issues since then.
If a "CONTACT BEHAVIORAL/COMMUNICATION PROFILE" is supplied, factor its traits/recommended approach into your tone and recommendations without repeating its disclaimer.
If adviceCategory is "customTemplate", you MUST return a single section titled "Custom Output" whose "body" field matches the layout structure provided in customTemplateStructure EXACTLY.
If activeSops are provided, you MUST ensure that all recommended actions and insights follow the rules and processes outlined in those SOPs.
Do not recommend any tasks that duplicate the existing active tasks provided.`;

    const contents = `
=== USER PROFILE ===
Name: ${userProfile.name}
Role: ${userProfile.position} at ${userProfile.company}
Personality Style: ${userProfile.personality}
Core Strengths: ${userProfile.coreStrengths}
Communication Preference: ${userProfile.communicationStyle}
Goals: ${userProfile.careerGoals}
Additional Profile Context: ${userProfile.extraDetails || 'None'}

=== SELECTED CO-CONSPIRATORS / CONTACTS ===
${
  selectedContacts && selectedContacts.length > 0
    ? selectedContacts.map((c: any) => `- Name: ${c.name}, Role: ${c.position} at ${c.company}, Relation: ${c.relationStatus}, Bio: ${c.notes || 'None'}, Tags: ${c.tags?.join(', ') || ''}`).join('\n')
    : 'No specific contact chosen for this analysis context.'
}

=== CONVERSATION HISTORY & MEETING NOTES ===
${
  selectedNotes && selectedNotes.length > 0
    ? selectedNotes
        .map(
          (n: any) => `* Note Date: ${n.date}
  Title: ${n.title}
  Attendees: ${n.attendeeNames && n.attendeeNames.length > 0 ? n.attendeeNames.join(', ') : 'Not specified'}
  Category: ${n.category}
  Sentiment Grade: ${n.sentimentScore}/10, Engagement: ${n.engagementLevel}/10
  Core Key Points:
  ${n.keyPoints?.map((p: string) => `  - ${p}`).join('\n') || ''}
  Content of Note:
  "${n.content}"`
        )
        .join('\n\n')
    : 'No meeting logs provided/selected.'
}

=== STANDARD OPERATING PROCEDURES (SOPS) ===
${
  req.body.activeSops && req.body.activeSops.length > 0
    ? req.body.activeSops.map((s: any) => `* SOP Title: ${s.title}\nContent:\n${s.content}`).join('\n\n')
    : 'No SOP guidelines provided. Use standard professional consulting principles.'
}

=== EXISTING TASKS (DO NOT DUPLICATE THESE) ===
${
  req.body.existingTasks && req.body.existingTasks.length > 0
    ? req.body.existingTasks.map((t: any) => `- Title: ${t.title} (Completed: ${t.completed})`).join('\n')
    : 'No existing tasks.'
}

=== PRIOR SAVED ADVISOR REPORTS (RECENT CONTEXT - AVOID REPEATING VERBATIM) ===
${
  priorReports && priorReports.length > 0
    ? priorReports.map((r: any) => `* [${r.createdAt}] ${r.adviceCategory} for ${r.contactName || r.companyName || 'General'}: ${r.response?.assessment || ''}`).join('\n')
    : 'No prior saved reports for this scope.'
}

=== CONTACT BEHAVIORAL/COMMUNICATION PROFILE (IF AVAILABLE) ===
${
  behavioralProfile
    ? `Traits: ${behavioralProfile.traits?.join(', ') || 'None'}
Motivators: ${behavioralProfile.motivators?.join(', ') || 'None'}
Risk Factors: ${behavioralProfile.riskFactors?.join(', ') || 'None'}
Recommended Approach: ${behavioralProfile.recommendedApproach || 'None'}
Confidence: ${behavioralProfile.signalScores?.confidence ?? 'Unknown'}/100`
    : 'No behavioral profile computed for this contact yet.'
}

=== PRIMARY REQUEST CATEGORY ===
Category Name: ${adviceCategory}
Focus Areas: ${categoryExplanation}
${adviceCategory === 'customTemplate' && req.body.customTemplateStructure ? `CUSTOM FORMAT STRUCTURE REQUIRED:\n${req.body.customTemplateStructure}` : ''}

=== SPECIAL USER QUESTION / TOPIC ===
${userPrompt ? `User prompt: "${userPrompt}"` : 'Analyze the context above and generate overall optimal recommendations.'}

Deliver your response strictly adhering to the JSON structure provided.
`;

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sections: {
              type: Type.ARRAY,
              description: 'Distinct, scannable sections of the advisory response (2-5 sections).',
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: {
                    type: Type.STRING,
                    description: 'Short section heading, e.g. "Root Cause Analysis".',
                  },
                  body: {
                    type: Type.STRING,
                    description: 'Markdown-formatted prose for this section (no # heading syntax).',
                  },
                  highlights: {
                    type: Type.ARRAY,
                    description: 'Structured call-outs pulled out of the prose for scannability.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: {
                          type: Type.STRING,
                          enum: ['risk', 'objection', 'opportunity', 'quote'],
                        },
                        text: {
                          type: Type.STRING,
                        },
                        response: {
                          type: Type.STRING,
                          description: 'Recommended response, required for type=objection.',
                        },
                      },
                      required: ['type', 'text'],
                    },
                  },
                },
                required: ['heading', 'body'],
              },
            },
            suggestedTasks: {
              type: Type.ARRAY,
              description: 'An array of proposed actionable follow-ups that can be directly added to the user\'s task reminders.',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Concise task title. e.g., "Send revised legal indemnity draft to David".',
                  },
                  priority: {
                    type: Type.STRING,
                    enum: ['High', 'Medium', 'Low'],
                    description: 'Priority level matching high-stakes items.',
                  },
                  note: {
                    type: Type.STRING,
                    description: 'Brief tactical reason why this is recommended.',
                  },
                },
                required: ['title', 'priority'],
              },
            },
            assessment: {
              type: Type.STRING,
              description: 'A 1-to-2 sentence executive assessment or headline rating of this situation.',
            },
          },
          required: ['assessment', 'sections', 'suggestedTasks'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'No content was generated by Gemini.' });
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ status: 'success', data });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '').toLowerCase();
    
    // Check if the service is overloaded, rate-limited, or otherwise unavailable
    const isServiceOrQuota = 
      errMsg.includes('503') || 
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('limit') ||
      errMsg.includes('demand') || 
      errMsg.includes('exhausted') || 
      errMsg.includes('unavailable') ||
      errMsg.includes('overloaded');

    if (isServiceOrQuota) {
      console.warn('[API Advisor] Gemini API limit/quota exhaustion handled gracefully. Falling back to Profile-Aware local simulation.');
      return res.status(200).json({
        status: 'error',
        errorType: 'apiServiceUnavailable',
        message: 'The Gemini model is temporarily unavailable or your free tier quota has been exceeded. Local simulation activated.',
      });
    }

    // Genuinely unclassified error (unexpected crash, JSON parse failure, etc.).
    // Return 500 while keeping the same {status:'error', ...} body shape so the
    // frontend's existing !response.ok fallback path handles it gracefully.
    console.error('Gemini API Integration Error:', error);
    return res.status(500).json({
      status: 'error',
      errorType: 'internalError',
      message: 'An error occurred during AI analysis. Please try again later.',
    });
  }
});

const BEHAVIORAL_DISCLAIMER = 'This is a behavioral/communication-style read generated from observed interaction patterns (sentiment, engagement, and your own notes/tags). It is NOT a clinical, psychological, or medical assessment, and it does not consider or infer any protected characteristics. Treat it as a professional coaching aid, not a definitive judgment of the person.';

// AI Behavioral/Relationship Index Endpoint
app.post('/api/behavioral-profile', requireAuth, async (req, res) => {
  try {
    const { contact, userProfile, weightingBreakdown, signalScores } = req.body;

    if (!contact || !signalScores) {
      return res.status(400).json({ error: 'Contact and signalScores are required.' });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (err: any) {
      if (err.message === 'GEMINI_API_KEY_MISSING') {
        return res.status(200).json({
          status: 'error',
          errorType: 'apiKeyMissing',
          message: 'The Gemini API Key is not configured. Please add GEMINI_API_KEY in the Secrets panel in AI Studio.',
        });
      }
      throw err;
    }

    const systemInstruction = `You are a professional communication-coaching assistant helping someone work more effectively with a business contact.
Using ONLY the weighted evidence provided (interaction sentiment/engagement trends, category weighting, recency decay, and the user's own manually-entered tags/relationship status/free-text notes about this professional contact), produce a DISC-style behavioral/communication coaching read.
This is explicitly NOT a clinical, psychological, psychiatric, or medical assessment and must NEVER claim to diagnose anything.
${PROTECTED_ATTRIBUTE_GUARDRAIL}
For every trait, motivator, or risk factor you assert, ground it in the supplied evidence — do not invent facts not present in the evidence.
If signalScores.confidence is below 40, explicitly caveat in recommendedApproach that the read is preliminary due to limited interaction history.
Also compare the user's own profile (personality/communicationStyle) against the inferred read on this contact and produce concrete "how you should adapt" guidance in selfCompatibility.
Always return this exact disclaimer text verbatim in the "disclaimer" field: "${BEHAVIORAL_DISCLAIMER}"`;

    const contents = `
=== CONTACT ===
Name: ${contact.name}
Role: ${contact.position} at ${contact.company}
Relationship Status: ${contact.relationStatus}
Status Rating: ${contact.status || 'Neutral'}
Tags: ${contact.tags?.join(', ') || 'None'}
User's Private Notes on this Contact: ${contact.notes || 'None'}

=== USER'S OWN PROFILE (FOR SELF-COMPATIBILITY COMPARISON) ===
Name: ${userProfile?.name || 'Unknown'}
Personality Style: ${userProfile?.personality || 'Unknown'}
Communication Preference: ${userProfile?.communicationStyle || 'Unknown'}

=== DETERMINISTIC SIGNAL SCORES (0-100, computed from weighted interaction history) ===
Rapport: ${signalScores.rapport}
Engagement: ${signalScores.engagement}
Friction Risk: ${signalScores.frictionRisk}
Recency: ${signalScores.recency}
Confidence: ${signalScores.confidence}

=== WEIGHTED EVIDENCE BREAKDOWN ===
${
  weightingBreakdown && weightingBreakdown.length > 0
    ? weightingBreakdown.map((w: any) => `- [${w.sourceType}] ${w.source} (effective weight: ${w.effectiveWeight?.toFixed ? w.effectiveWeight.toFixed(2) : w.effectiveWeight})`).join('\n')
    : 'No weighted evidence available yet.'
}

Deliver your response strictly adhering to the JSON structure provided.
`;

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            traits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'DISC-style behavioral/communication traits grounded in the evidence.',
            },
            motivators: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedApproach: {
              type: Type.STRING,
              description: 'Paragraph of concrete tactical guidance for working with this contact.',
            },
            selfCompatibility: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                adaptationTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['summary', 'adaptationTips'],
            },
            disclaimer: {
              type: Type.STRING,
            },
          },
          required: ['traits', 'motivators', 'riskFactors', 'recommendedApproach', 'selfCompatibility', 'disclaimer'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'No content was generated by Gemini.' });
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ status: 'success', data });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '').toLowerCase();

    const isServiceOrQuota =
      errMsg.includes('503') ||
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('limit') ||
      errMsg.includes('demand') ||
      errMsg.includes('exhausted') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('overloaded');

    if (isServiceOrQuota) {
      console.warn('[API Behavioral Profile] Gemini API limit/quota exhaustion handled gracefully. Falling back to local heuristic synthesis.');
      return res.status(200).json({
        status: 'error',
        errorType: 'apiServiceUnavailable',
        message: 'The Gemini model is temporarily unavailable or your free tier quota has been exceeded. Local simulation activated.',
      });
    }

    // Genuinely unclassified error (unexpected crash, JSON parse failure, etc.).
    // Return 500 while keeping the same {status:'error', ...} body shape so the
    // frontend's existing fallback path handles it gracefully.
    console.error('Gemini Behavioral Profile Integration Error:', error);
    return res.status(500).json({
      status: 'error',
      errorType: 'internalError',
      message: 'An error occurred during behavioral analysis. Please try again later.',
    });
  }
});

// AI Meeting Note Insights Endpoint — analyzes a single logged note's narrative and
// produces key points, a coaching-oriented read, and suggested sentiment/engagement scores.
app.post('/api/note-insights', requireAuth, async (req, res) => {
  try {
    const { title, category, content, attendeeNames } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required.' });
    }
    if (content.length > MAX_FLEXIBLE_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Note content exceeds maximum allowed length of ${MAX_FLEXIBLE_PROMPT_LENGTH} characters.` });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (err: any) {
      if (err.message === 'GEMINI_API_KEY_MISSING') {
        return res.status(200).json({
          status: 'error',
          errorType: 'apiKeyMissing',
          message: 'The Gemini API Key is not configured. Please add GEMINI_API_KEY in the Secrets panel in AI Studio.',
        });
      }
      throw err;
    }

    const systemInstruction = `You are a professional communication coach analyzing the raw narrative of a single logged meeting/conversation note.
${PROTECTED_ATTRIBUTE_GUARDRAIL}
Ground every key point, insight, and coaching suggestion strictly in the text provided — do not invent facts, quotes, or context not present in the note.
Produce 3-6 concise, factual "keyPoints" — concrete outcomes, decisions, or statements from the conversation, not analysis.
Produce a short "insights" paragraph: a professional read on the conversation's dynamics and what it signals about the relationship.
Produce "coachingOpportunities": concrete, actionable communication-coaching tips for the NOTE AUTHOR's own future interactions in situations like this one. If the note genuinely gives no clear coaching opportunity, return an empty array — do not invent generic filler advice.
Produce "sentimentScore" (integer 1-10, 10 = extremely positive/cooperative tone, 1 = hostile) and "engagementLevel" (integer 1-10, 10 = highly engaged/attentive, 1 = completely indifferent), both inferred strictly from what the note describes.`;

    const contents = `
=== NOTE TITLE ===
${title || 'Untitled'}

=== MEETING CATEGORY ===
${category || 'Unspecified'}

=== ATTENDEES ===
${attendeeNames && attendeeNames.length > 0 ? attendeeNames.join(', ') : 'Not specified'}

=== NOTE CONTENT ===
"${content}"

Deliver your response strictly adhering to the JSON structure provided.
`;

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            insights: {
              type: Type.STRING,
            },
            coachingOpportunities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sentimentScore: {
              type: Type.INTEGER,
            },
            engagementLevel: {
              type: Type.INTEGER,
            },
          },
          required: ['keyPoints', 'insights', 'coachingOpportunities', 'sentimentScore', 'engagementLevel'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'No content was generated by Gemini.' });
    }

    const data = JSON.parse(responseText.trim());
    // Clamp in case the model drifts outside the requested 1-10 range.
    data.sentimentScore = Math.max(1, Math.min(10, Math.round(data.sentimentScore)));
    data.engagementLevel = Math.max(1, Math.min(10, Math.round(data.engagementLevel)));
    return res.json({ status: 'success', data });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '').toLowerCase();

    const isServiceOrQuota =
      errMsg.includes('503') ||
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('limit') ||
      errMsg.includes('demand') ||
      errMsg.includes('exhausted') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('overloaded');

    if (isServiceOrQuota) {
      console.warn('[API Note Insights] Gemini API limit/quota exhaustion handled gracefully. Falling back to local heuristic synthesis.');
      return res.status(200).json({
        status: 'error',
        errorType: 'apiServiceUnavailable',
        message: 'The Gemini model is temporarily unavailable or your free tier quota has been exceeded. Local simulation activated.',
      });
    }

    console.error('Gemini Note Insights Integration Error:', error);
    return res.status(500).json({
      status: 'error',
      errorType: 'internalError',
      message: 'An error occurred during note analysis. Please try again later.',
    });
  }
});

// AI Document Summary Endpoint
app.post('/api/summarize-sop', requireAuth, async (req, res) => {
  try {
    const { title, content, userNotes } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and Content are required.' });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (err: any) {
      return res.json({
        status: 'success',
        summary: `Reference summary for "${title}": Outlines compliance checks, core operational rules, and project specs.`
      });
    }

    const systemInstruction = `You are Lumina, a sharp corporate analyst. Analyze the following document details and user thoughts, and generate a brief, 2-sentence generalized summary of what the document is, highlighting its core purpose so other parts of the application can cross-reference it. Keep it concise.`;

    const contents = `
Document Title: ${title}
Extracted Text Content:
${content}

User's Thoughts on this Document:
${userNotes || 'None'}
`;

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'text/plain'
      }
    });

    const responseText = response.text || '';
    return res.json({ status: 'success', summary: responseText.trim() });

  } catch (error: any) {
    console.error('SOP Summarize Error:', error);
    return res.json({
      status: 'success',
      summary: `Reference framework for "${req.body?.title}" outlining workflow structures, tasks execution, and corporate guidelines.`
    });
  }
});

// AI Overview Development Advice Endpoint
app.post('/api/overview-advice', requireAuth, async (req, res) => {
  try {
    const { profile, notes, contacts, tasks, dayOfWeek } = req.body;

    if (!profile) {
      return res.status(400).json({ error: 'Profile is required.' });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (err: any) {
      const day = dayOfWeek || 'Monday';
      const fallback = {
        weeklyStructure: `It is ${day}. With ${tasks?.length || 0} pending items, prioritize mission-critical project specs early in the day. Keep meeting slots block-grouped.`,
        frictionAlert: notes?.some((n: any) => n.sentimentScore < 6 || n.engagementLevel < 6)
          ? `Low engagement detected in recent sessions. Recommend hosting a 15-minute alignment sync to address roadblocks.`
          : `All relationships currently warm. Maintain standard check-ins.`,
        trendsAndPriorities: `Immediate trends suggest aligning draft scopes. Review follow-up lists for any client blockers.`
      };
      return res.json({ status: 'success', insights: fallback });
    }

    const systemInstruction = `You are Lumina, an elite executive business psychologist and leadership advisor.
${PROTECTED_ATTRIBUTE_GUARDRAIL}
Your task is to analyze the user profile (${profile.personality}), day of week (${dayOfWeek}), workload (pending tasks: ${JSON.stringify(tasks)}), and recent notes (including private notes: ${JSON.stringify(notes)}).
Generate a strategic summary containing exactly these three fields:
- weeklyStructure: 2-3 sentences max. Give specific tips on how the user should structure their week or day given the day of the week (${dayOfWeek}) and pending task workload. Be extremely concrete.
- frictionAlert: 2-3 sentences max. Scan notes for previous meetings that have straining sentiment (sentimentScore < 6) or distracted engagement (engagementLevel < 6). Detail the warning and direct tactical steps to rebuild trust. If none, write "All stakeholder relations are warm. Maintain baseline touchpoints."
- trendsAndPriorities: 2-3 sentences max. Synthesize pressing items across tasks and analyze trends from private notes (marked isPrivate: true) to advise on immediate focal points.

Output clean JSON only.`;

    const contents = `
=== USER PROFILE ===
Role: ${profile.position} at ${profile.company}
Personality: ${profile.personality}
Core Strengths: ${profile.coreStrengths}
Communication: ${profile.communicationStyle}
Goals: ${profile.careerGoals}

=== DAY OF WEEK & WORKLOAD ===
Current Day: ${dayOfWeek || 'Today'}
Pending Tasks:
${tasks && tasks.length > 0 ? tasks.map((t: any) => `- [${t.priority}] ${t.title} (Due: ${t.dueDate})`).join('\n') : 'No pending tasks.'}

=== RECENT MEETINGS & NOTES (INCLUDING PRIVATE NOTES) ===
${notes && notes.length > 0 
  ? notes.map((n: any) => `- Note [Private: ${n.isPrivate ? 'YES' : 'NO'}] on ${n.date}: [Sentiment: ${n.sentimentScore}/10] [Engagement: ${n.engagementLevel}/10] "${n.title}"
    Details: ${n.content}
    Takeaways: ${n.keyPoints?.join(', ') || 'None'}`).join('\n')
  : 'None recorded recently.'}
`;

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            weeklyStructure: {
              type: Type.STRING,
              description: 'Advice for the workload structure based on the day of the week.'
            },
            frictionAlert: {
              type: Type.STRING,
              description: 'Warning and next steps for strained/low-engagement stakeholders.'
            },
            trendsAndPriorities: {
              type: Type.STRING,
              description: 'Synthesized priorities from tasks and private notes.'
            }
          },
          required: ['weeklyStructure', 'frictionAlert', 'trendsAndPriorities']
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Fallback to local heuristics.');
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ status: 'success', insights: data });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '').toLowerCase();
    console.warn('[API Advisor] Gemini Overview API limit/quota exhaustion handled gracefully. Falling back to local heuristic response.');
    
    const day = req.body?.dayOfWeek || 'Monday';
    const tasks = req.body?.tasks || [];
    const notes = req.body?.notes || [];
    
    const fallback = {
      weeklyStructure: `It is ${day}. With ${tasks?.length || 0} pending items, prioritize mission-critical project specs early in the day. Keep meeting slots block-grouped.`,
      frictionAlert: notes?.some((n: any) => n.sentimentScore < 6 || n.engagementLevel < 6)
        ? `Low engagement detected in recent sessions. Recommend hosting a 15-minute alignment sync to address roadblocks.`
        : `All relationships currently warm. Maintain standard check-ins.`,
      trendsAndPriorities: `Immediate trends suggest aligning draft scopes. Review follow-up lists for any client blockers.`
    };
    return res.json({ status: 'success', insights: fallback });
  }
});

// Vite / static file handlers
async function setupViteAndServe() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully booted on port ${PORT}`);
  });
}

setupViteAndServe().catch((err) => {
  console.error('Failed to start server:', err);
});
