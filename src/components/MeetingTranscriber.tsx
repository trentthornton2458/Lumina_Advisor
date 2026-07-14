import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Square, Play, Pause, Sparkles, Loader2, Copy, Check,
  Clock, AlertCircle, FileText, Wand2, Volume2, X, ChevronDown,
  Users, Target, MessageSquare
} from 'lucide-react';
import { Contact, MeetingNote, NoteCategory } from '../types';
import { useToast } from './Toast';

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
  
  // Recording state
  const [state, setState] = useState<RecordingState>('idle');
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

  // Check for browser support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  // Stop Visualizer Helper
  const stopVisualizer = useCallback(() => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small size for simple bars
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        analyser.getByteFrequencyData(dataArray);
        
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const barHeight = Math.max(4, percent * height * 0.95);
          
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#3b82f6'); // Brand Blue
          gradient.addColorStop(1, '#818cf8'); // Indigo
          
          ctx.fillStyle = gradient;
          const yPos = height - barHeight;
          const radius = 3;
          ctx.beginPath();
          ctx.roundRect(x, yPos, barWidth - 2, barHeight, radius);
          ctx.fill();
          
          x += barWidth;
        }
        
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
      setState('idle');
      stopVisualizer();
    };

    recognition.onend = () => {
      if (recognitionRef.current && state === 'recording') {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
    startVisualizer();
    showToast('Recording started — speak clearly into your microphone', 'info');
  }, [isSupported, SpeechRecognition, showToast, state, startVisualizer, stopVisualizer]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('paused');
    stopVisualizer();
  }, [stopVisualizer]);

  const resumeRecording = useCallback(() => {
    if (!SpeechRecognition) return;
    
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
      if (event.error !== 'no-speech') {
        setError(`Recognition error: ${event.error}`);
        setState('idle');
        stopVisualizer();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
    startVisualizer();
  }, [SpeechRecognition, startVisualizer, stopVisualizer]);

  const stopAndProcess = useCallback(async () => {
    // Stop recording
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopVisualizer();

    if (elapsedTime < 30) {
      setError('Recording is too short. Please record for at least 30 seconds.');
      setState('paused');
      return;
    }

    const fullTranscript = transcriptRef.current.trim();
    if (!fullTranscript || fullTranscript.length < 20) {
      setError('Transcript is too short to analyze. Please record a longer conversation.');
      setState('idle');
      return;
    }

    setState('processing');

    try {
      const response = await fetch('/api/ai-advice', {
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
  }, [contacts, showToast, elapsedTime]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={state === 'idle' || state === 'results' ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Mic size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">AI Meeting Transcription</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {state === 'idle' && 'Record your meeting and let AI extract notes, key points & sentiment'}
                {state === 'recording' && 'Listening — speak naturally into your microphone'}
                {state === 'paused' && 'Recording paused — resume or stop to analyze'}
                {state === 'processing' && 'AI is analyzing your transcript...'}
                {state === 'results' && 'Review AI-extracted meeting insights'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
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
              <button
                onClick={startRecording}
                disabled={!isSupported}
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
        </div>

        {/* Footer actions */}
        {state === 'results' && (
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
        )}
      </motion.div>
    </div>
  );
}
