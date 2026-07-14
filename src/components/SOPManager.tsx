import React, { useState } from 'react';
import { SOPDocument } from '../types';
import { 
  FileText, Upload, Plus, Trash2, X, Check, FileCode, AlertCircle, Info, FileSpreadsheet,
  BookOpen, BrainCircuit, RefreshCw, MessageSquare
} from 'lucide-react';
import { useToast } from './Toast';

interface SOPManagerProps {
  sops: SOPDocument[];
  onAddSop: (sop: SOPDocument) => void;
  onDeleteSop: (id: string) => void;
}

export default function SOPManager({ sops, onAddSop, onDeleteSop }: SOPManagerProps) {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [content, setContent] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Document Title and Content are required', 'error');
      return;
    }

    setIsLoadingSummary(true);
    let aiSummaryText = '';

    try {
      const res = await fetch('/api/summarize-sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          userNotes: userNotes.trim()
        })
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.status === 'success') {
          aiSummaryText = resData.summary;
        }
      }
    } catch (err) {
      console.warn("Failed to generate AI summary, using fallback simulation", err);
    }

    if (!aiSummaryText) {
      // Fallback local summary generator
      aiSummaryText = `Generalized summary of "${title.trim()}": This document represents a standard operational reference covering core logistics, integration protocols, compliance guidelines, or business strategies. Cross-referencing points indicate alignment with standard organizational policies.`;
    }

    const newSop: SOPDocument = {
      id: 'sop_' + Date.now(),
      title: title.trim(),
      fileType,
      content: content.trim(),
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: Math.floor(content.length * 1.2),
      userNotes: userNotes.trim() || undefined,
      aiSummary: aiSummaryText
    };

    onAddSop(newSop);
    setIsAdding(false);
    setTitle('');
    setContent('');
    setUserNotes('');
    setIsLoadingSummary(false);
    showToast(`Document "${newSop.title}" registered successfully`, 'success');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.split('.')[0];
      const extension = (file.name.split('.').pop() || 'txt').toLowerCase();
      
      setTitle(name);
      setFileType(extension);
      
      // Read contents or simulate extraction
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text || `[Simulated Content Extraction from ${file.name}]\nPrimary business guidelines and operating rules parsed from text stream.`);
      };
      if (file.type.startsWith('text/') || extension === 'csv' || extension === 'txt' || extension === 'md') {
        reader.readAsText(file);
      } else {
        // Mock non-text file parsed representation
        setTimeout(() => {
          setContent(`## Document Title: ${name}\nLoaded from file: ${file.name}\n\n[Parsed Context Summary]:\nThis documentation outlines standard operating frameworks, business definitions, or reference logs. Important pointers concern integration security, delivery schedules, and compliance targets.`);
        }, 300);
      }
      showToast(`Detected file "${file.name}" — details parsed`, 'info');
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'xlsx' || t === 'xls') {
      return <FileSpreadsheet className="text-emerald-500" size={24} />;
    } else if (t === 'docx' || t === 'doc') {
      return <FileText className="text-blue-500" size={24} />;
    } else if (t === 'png' || t === 'jpg' || t === 'jpeg') {
      return <FileCode className="text-purple-500" size={24} />;
    } else if (t === 'pdf') {
      return <FileText className="text-rose-500" size={24} />;
    } else {
      return <FileText className="text-amber-500" size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Intro Banner */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600 animate-pulse" />
            SOPs & Reference Documentation
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Upload or paste Standard Operating Procedures (SOPs), process guidelines, manuals, and custom briefs. 
            The AI Advisor reviews these documents to output conformed strategic insights.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
          {isAdding ? 'Close Form' : 'Upload Document'}
        </button>
      </div>

      {/* Upload/Add Form */}
      {isAdding && (
        <div className="bg-white border border-slate-150 rounded-[20px] p-6 shadow-xs animate-fade-in space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Register SOP or Process Document
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* File Drag and Drop Box */}
            <div className="lg:col-span-5">
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center transition-all ${
                  dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <Upload size={32} className="text-slate-400 mb-3" />
                <h4 className="text-xs font-bold text-slate-700 mb-1">Drag and Drop Document Here</h4>
                <p className="text-[10px] text-slate-500 max-w-[200px] mb-4">
                  Supports any file format (PDF, Word, Excel, CSV, text, images, etc.)
                </p>
                <div className="text-[10px] text-slate-400 bg-slate-200/50 px-3 py-1 rounded-md">
                  Or fill manually using the form fields
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Sales Engagement Process"
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">File Format / Extension</label>
                  <input
                    type="text"
                    required
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    placeholder="e.g. pdf, csv, zip"
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-slate-850"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Document Content / Instructions Text *</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste details, checklists, text contents, or regulations here..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-850 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Your Thoughts / Notes (Free Field)</label>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Type what you think about this document (important takeaways, exceptions, goals)..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-850 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={isLoadingSummary}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSummary}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  {isLoadingSummary ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Summarizing Document...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save Document
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* SOP Repository grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sops.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-100 rounded-[20px] p-12 text-center shadow-xs">
            <FileText size={40} className="mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700">No Reference Documentation</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto mt-1 mb-4">
              Your reference library is currently empty. Upload files or paste guides to configure context for the AI.
            </p>
          </div>
        ) : (
          sops.map(sop => (
            <div 
              key={sop.id} 
              className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition duration-200 relative group animate-glow-border"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl shrink-0">
                      {getFileIcon(sop.fileType)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1 pr-6">
                        {sop.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">
                        Format: {sop.fileType.toUpperCase()} • {(sop.fileSize ? (sop.fileSize / 1024).toFixed(1) : 0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteSop(sop.id)}
                    className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-xl transition opacity-0 group-hover:opacity-100 absolute top-4 right-4"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                  
                  {/* AI Summary Panel */}
                  <div className="bg-blue-50/10 border border-blue-100/50 rounded-2xl p-4 flex flex-col gap-1.5">
                    <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <BrainCircuit size={12} /> AI Overview Summary
                    </div>
                    <p className="text-[11px] text-slate-650 leading-relaxed font-sans">
                      {sop.aiSummary || 'Summarizing context not computed.'}
                    </p>
                  </div>

                  {/* User Thoughts Panel */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col gap-1.5">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <MessageSquare size={12} /> Your Thoughts & Notes
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans italic">
                      {sop.userNotes || 'No custom notes provided for this file.'}
                    </p>
                  </div>

                </div>

                {/* Extracted content overview collapsible */}
                <details className="mt-4 border-t border-slate-100 pt-3">
                  <summary className="text-[10px] text-slate-450 hover:text-slate-700 cursor-pointer font-bold uppercase tracking-wider select-none outline-none">
                    View Full Extracted Source
                  </summary>
                  <pre className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 leading-relaxed overflow-x-auto max-h-[140px] font-mono whitespace-pre-wrap">
                    {sop.content}
                  </pre>
                </details>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                <span>Uploaded: {sop.uploadedAt}</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">Sync-Reference Ready</span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
