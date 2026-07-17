import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic, Square, Play, Pause, Sparkles, Loader2, Copy, Check,
  AlertCircle, FileText, Wand2, Volume2, ChevronDown,
  Users, Target
} from 'lucide-react';
import { Contact, MeetingNote, NoteCategory } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/apiClient';
import ModalShell from './ModalShell';

interface MeetingTranscriberProps {
  contacts: Contact[];
  onAddNote: (note: MeetingNote) => void;
  onClose: () => void;
}

// Extend the Window interface for SpeechRecognition
interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'results';

export default function MeetingTranscriber({ contacts, onAddNote, onClose }: MeetingTranscriberProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // Recording state
  const [state, setState] = useState<RecordingState>('idle');
  const stateRef = useRef<RecordingState>('idle');

  // Sync state ref
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = useCallback((newState: RecordingState) => {
    setState(newState);
    stateRef.current = newState;
  }, []);

  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // AI extraction results
  const [aiResults, setAiResults] = useState<{
    title: string;
    keyPoints: string[];
    sentiment: number;
    engagement: number;
    category: NoteCategory;
    insights: string;
    suggestedContactId: string;
    summary: string;
  } | null>(null);
  
  // Form overrides
  const [selectedContactId, setSelectedContactId] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef('');

  // Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isVisualizerActiveRef = useRef(false);

  // Check for browser support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  // Stop Visualizer Helper
  const stopVisualizer = useCallback(() => {
    isVisualizerActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start Visualizer Helper
  const startVisualizer = useCallback(async () => {
    try {
      stopVisualizer(); // Stop any legacy context
      isVisualizerActiveRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check if we were stopped while waiting for the stream
      if (!isVisualizerActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let smoothedVolume = 0;
      const phases = [0, 0, 0];

      const waveParams = [
        { frequency: 0.05, amplitudeMult: 1.0, phaseSpeed: 0.12, color: '#3b82f6', lineWidth: 1.5 },   // Brand Blue
        { frequency: 0.08, amplitudeMult: 0.6, phaseSpeed: -0.18, color: '#818cf8', lineWidth: 1.0 },  // Light Indigo
        { frequency: 0.03, amplitudeMult: 0.4, phaseSpeed: 0.07, color: '#60a5fa', lineWidth: 0.8 }    // Sky Blue
      ];

      const draw = () => {
        if (!isVisualizerActiveRef.current) return;
        if (!canvasRef.current) {
          animationFrameRef.current = requestAnimationFrame(draw);
          return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate audio volume (average deviation from 128)
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += Math.abs(dataArray[i] - 128);
        }
        const average = total / bufferLength;
        const targetVolume = Math.min(1.0, average / 40.0); // Normalize based on average speaking levels

        // Lerp for smooth transitions
        smoothedVolume = smoothedVolume * 0.8 + targetVolume * 0.2;

        // Render each wave
        waveParams.forEach((param, index) => {
          // Increment phase over time
          phases[index] += param.phaseSpeed;
          
          ctx.beginPath();
          // Draw wave line across the canvas width
          for (let x = 0; x <= width; x++) {
            // Envelope to taper/pinch the wave at the left/right boundaries (x=0, x=width)
            const envelope = Math.sin((x / width) * Math.PI);

            // Calculate y using a combination of sine, amplitude (base + audio-reactive), and the envelope
            const baseAmplitude = 2.0; // Soft continuous background breathing
            const maxReactiveAmplitude = (height / 2) - 3;
            const currentAmplitude = baseAmplitude + smoothedVolume * maxReactiveAmplitude;

            const y = (height / 2) + Math.sin(x * param.frequency + phases[index]) * (currentAmplitude * param.amplitudeMult) * envelope;

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.strokeStyle = param.color;
          ctx.lineWidth = param.lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
        
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      
      animationFrameRef.current = requestAnimationFrame(draw);
    } catch (err) {
      console.warn('Audio Visualizer failed to start:', err);
    }
  }, [stopVisualizer]);

  // Clean up visualizer on unmount
  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, [stopVisualizer]);

  // Timer management
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        setTranscript(transcriptRef.current);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        return;
      }
      setError(`Recognition error: ${event.error}. Try again.`);
      updateState('idle');
      stopVisualizer();
    };

    recognition.onend = () => {
      if (recognitionRef.current && stateRef.current === 'recording') {
        try {
          startSpeechRecognition();
        } catch (e) {
          console.error('Failed to auto-restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition instance:', e);
    }
  }, [SpeechRecognition, stopVisualizer, updateState]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    setElapsedTime(0);

    updateState('recording');
    startSpeechRecognition();
    startVisualizer();
    showToast('Recording started — speak clearly into your microphone', 'info');
  }, [isSupported, startSpeechRecognition, startVisualizer, showToast, updateState]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    updateState('paused');
    stopVisualizer();
  }, [stopVisualizer, updateState]);

  const resumeRecording = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    updateState('recording');
    startSpeechRecognition();
    startVisualizer();
  }, [isSupported, startSpeechRecognition, startVisualizer, updateState]);

  const stopAndProcess = useCallback(async () => {
    // Stop recording
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopVisualizer();

    if (elapsedTime < 3) {
      setError('Recording is too short. Please record for at least 3 seconds.');
      updateState('paused');
      return;
    }

    const fullTranscript = transcriptRef.current.trim();
    if (!fullTranscript || fullTranscript.length < 10) {
      setError('Transcript is too short to analyze. Please record a longer conversation.');
      updateState('idle');
      return;
    }

    updateState('processing');

    try {
      const response = await authedFetch('/api/ai-advice', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting-transcription',
          prompt: `You are an expert meeting analyst. Analyze the following meeting transcript and extract structured insights.

TRANSCRIPT:
${fullTranscript}

AVAILABLE CONTACTS (match the transcript to the most relevant contact if possible):
${contacts.map(c => `- ${c.name} (${c.position} at ${c.company})`).join('\n')}

Respond with a JSON object containing exactly these fields:
{
  "title": "A concise, descriptive meeting title (max 8 words)",
  "keyPoints": ["Array of 3-5 key discussion points extracted from the transcript"],
  "sentiment": <number 1-10 where 1=very negative, 10=very positive>,
  "engagement": <number 1-10 where 1=low energy/disengaged, 10=highly engaged/collaborative>,
  "category": "<one of: Discovery, Strategy Sync, Client Pitch, Negotiation, Check-in, Catch-up, Review>",
  "insights": "A 1-2 sentence strategic insight or recommended next action based on the conversation",
  "suggestedContactId": "<the id of the most relevant contact from the list, or empty string>",
  "summary": "A 2-3 sentence executive summary of the meeting"
}

CRITICAL: Return ONLY the JSON object, no markdown formatting, no code blocks.`
        })
      });

      if (!response.ok) throw new Error('AI analysis failed');
      
      const data = await response.json();
      let parsed;
      
      if (data.advice) {
        // Try to parse the AI response as JSON
        try {
          // Clean potential markdown code blocks
          const cleaned = data.advice.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          // Fallback: generate basic analysis from transcript
          parsed = generateLocalAnalysis(fullTranscript);
        }
      } else {
        parsed = generateLocalAnalysis(fullTranscript);
      }

      setAiResults({
        title: parsed.title || 'Meeting Notes',
        keyPoints: parsed.keyPoints || ['Discussion captured via transcription'],
        sentiment: Math.min(10, Math.max(1, parsed.sentiment || 6)),
        engagement: Math.min(10, Math.max(1, parsed.engagement || 6)),
        category: parsed.category || 'Check-in',
        insights: parsed.insights || 'Review the transcript for detailed context.',
        suggestedContactId: parsed.suggestedContactId || '',
        summary: parsed.summary || fullTranscript.slice(0, 200) + '...'
      });

      setEditedTitle(parsed.title || 'Meeting Notes');
      setSelectedContactId(parsed.suggestedContactId || '');
      setState('results');
      showToast('AI analysis complete — review your extracted notes', 'success');
    } catch (err) {
      console.error('AI transcription analysis failed:', err);
      // Use local fallback
      const local = generateLocalAnalysis(fullTranscript);
      setAiResults({
        title: local.title,
        keyPoints: local.keyPoints,
        sentiment: local.sentiment,
        engagement: local.engagement,
        category: local.category as NoteCategory,
        insights: local.insights,
        suggestedContactId: '',
        summary: local.summary
      });
      setEditedTitle(local.title);
      setState('results');
      showToast('Used local analysis (AI unavailable)', 'warning');
    }
  }, [contacts, showToast, elapsedTime, user]);

  // Local fallback analysis
  const generateLocalAnalysis = (text: string) => {
    const words = text.split(/\s+/);
    const wordCount = words.length;
    
    // Simple keyword-based sentiment
    const positiveWords = ['great', 'excellent', 'good', 'agree', 'love', 'fantastic', 'happy', 'progress', 'success', 'win'];
    const negativeWords = ['problem', 'issue', 'concern', 'disagree', 'frustrated', 'delay', 'risk', 'fail', 'worry', 'blocker'];
    
    const posCount = words.filter(w => positiveWords.includes(w.toLowerCase())).length;
    const negCount = words.filter(w => negativeWords.includes(w.toLowerCase())).length;
    const sentiment = Math.min(10, Math.max(1, 5 + posCount - negCount));
    
    // Extract first meaningful sentences as key points
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15).slice(0, 4);
    
    // Generate title from first few words
    const titleWords = sentences[0]?.trim().split(/\s+/).slice(0, 6).join(' ') || 'Transcribed Meeting';
    
    return {
      title: titleWords.length > 40 ? titleWords.slice(0, 40) + '...' : titleWords,
      keyPoints: sentences.map(s => s.trim()).filter(Boolean).slice(0, 4),
      sentiment,
      engagement: Math.min(10, Math.max(3, Math.round(wordCount / 50))),
      category: 'Check-in',
      insights: `Meeting covered ${wordCount} words across ${sentences.length} main topics. Review transcript for detailed follow-ups.`,
      summary: text.slice(0, 300) + (text.length > 300 ? '...' : '')
    };
  };

  const handleSaveNote = () => {
    if (!aiResults) return;

    const note: MeetingNote = {
      id: 'n_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      title: editedTitle || aiResults.title,
      contactId: selectedContactId || undefined,
      category: aiResults.category,
      content: `## AI-Transcribed Meeting\n\n### Executive Summary\n${aiResults.summary}\n\n### Full Transcript\n${transcript}`,
      sentimentScore: aiResults.sentiment,
      engagementLevel: aiResults.engagement,
      keyPoints: aiResults.keyPoints,
      insights: aiResults.insights
    };

    onAddNote(note);
    showToast('Transcribed meeting saved as note!', 'success');
    onClose();
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Transcript copied to clipboard', 'info');
  };

  return (
    <ModalShell
      title="AI Meeting Transcription"
      subtitle={
        <>
          {state === 'idle' && 'Record your meeting and let AI extract notes, key points & sentiment'}
          {state === 'recording' && 'Listening — speak naturally into your microphone'}
          {state === 'paused' && 'Recording paused — resume or stop to analyze'}
          {state === 'processing' && 'AI is analyzing your transcript...'}
          {state === 'results' && 'Review AI-extracted meeting insights'}
        </>
      }
      icon={<Mic size={20} className="text-white" />}
      iconWrapperClassName="bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-600/20"
      headerClassName="from-slate-50 to-blue-50/30"
      onClose={onClose}
      onBackdropClick={state === 'idle' || state === 'results' ? onClose : undefined}
      footer={
        state === 'results' ? (
          <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              onClick={() => {
                setState('idle');
                setTranscript('');
                setAiResults(null);
                setElapsedTime(0);
              }}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              Record Again
            </button>
            <button
              onClick={handleSaveNote}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              <Wand2 size={16} />
              Save as Meeting Note
            </button>
          </div>
        ) : undefined
      }
    >
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 font-medium">{error}</p>
            </div>
          )}

          {/* IDLE STATE */}
          {state === 'idle' && !error && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 flex items-center justify-center mb-4">
                <Mic size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to Record</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Click start to begin recording. Your speech will be transcribed in real-time, then analyzed by AI to extract meeting notes, key points, and sentiment.
              </p>
              {!isSupported && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                  ⚠️ Speech recognition requires Chrome or Edge browser
                </div>
              )}

              <label className="flex items-start gap-2.5 max-w-sm mx-auto mb-5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(e) => setConsentAcknowledged(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-[11px] text-amber-900 leading-snug">
                  Everyone else on this call will be recorded and transcribed by AI. I confirm I have their consent, where required by law in my jurisdiction.
                </span>
              </label>

              <button
                onClick={startRecording}
                disabled={!isSupported || !consentAcknowledged}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                <Mic size={18} />
                Start Recording
              </button>
            </div>
          )}

          {/* RECORDING / PAUSED STATE */}
          {(state === 'recording' || state === 'paused') && (
            <>
              {/* Timer + waveform */}
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    state === 'recording' 
                      ? 'bg-rose-100 text-rose-600 animate-pulse' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {state === 'recording' ? <Volume2 size={24} /> : <Pause size={24} />}
                  </div>
                  <div>
                    <span className="text-2xl font-bold font-mono text-slate-800">{formatTime(elapsedTime)}</span>
                    <span className={`block text-xs font-bold uppercase tracking-wider ${
                      state === 'recording' ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {state === 'recording' ? '● Recording' : '⏸ Paused'}
                    </span>
                  </div>
                </div>
                
                {state === 'recording' && (
                  <div className="flex-1 max-w-[140px] h-8 mx-4 hidden sm:block bg-slate-100/50 rounded-lg p-1 border border-slate-200/40">
                    <canvas 
                      ref={canvasRef} 
                      width={140} 
                      height={24} 
                      className="w-full h-full"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {state === 'recording' ? (
                    <button
                      onClick={pauseRecording}
                      className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition"
                      title="Pause"
                    >
                      <Pause size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      className="p-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition"
                      title="Resume"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  <button
                    onClick={stopAndProcess}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Square size={14} />
                    Stop & Analyze
                  </button>
                </div>
              </div>

              {/* Live transcript */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 min-h-[200px] max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Transcript</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {transcript}
                  {interimText && (
                    <span className="text-blue-500 italic">{interimText}</span>
                  )}
                  {!transcript && !interimText && (
                    <span className="text-slate-400 italic">Listening for speech...</span>
                  )}
                </p>
              </div>
            </>
          )}

          {/* PROCESSING STATE */}
          {state === 'processing' && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <Loader2 size={32} className="text-indigo-600 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Analyzing with AI</h3>
              <p className="text-sm text-slate-500">Extracting key points, sentiment, and insights from your transcript...</p>
            </div>
          )}

          {/* RESULTS STATE */}
          {state === 'results' && aiResults && (
            <>
              {/* Editable title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Title</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition"
                />
              </div>

              {/* Contact selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Users size={12} className="inline mr-1" />
                  Link to Contact
                  {aiResults.suggestedContactId && (
                    <span className="ml-2 text-blue-600 normal-case font-medium">(AI suggested)</span>
                  )}
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 transition"
                >
                  <option value="">— No contact —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Sentiment</span>
                  <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">{aiResults.sentiment}/10</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">Engagement</span>
                  <span className="text-2xl font-bold font-mono text-blue-800 mt-1 block">{aiResults.engagement}/10</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">Category</span>
                  <span className="text-sm font-bold text-indigo-800 mt-1 block">{aiResults.category}</span>
                </div>
              </div>

              {/* Key Points */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Key Points Extracted</span>
                </div>
                <ul className="space-y-2">
                  {aiResults.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Insight */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Strategic Insight</span>
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed">{aiResults.insights}</p>
              </div>

              {/* Transcript collapsible */}
              <details className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <summary className="px-5 py-3 cursor-pointer text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 hover:bg-slate-50 transition">
                  <FileText size={14} />
                  View Full Transcript
                  <ChevronDown size={14} className="ml-auto" />
                </summary>
                <div className="px-5 pb-4 pt-2 border-t border-slate-100">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleCopyTranscript}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto bg-slate-50 p-3 rounded-xl">
                    {transcript}
                  </p>
                </div>
              </details>
            </>
          )}
    </ModalShell>
  );
}
