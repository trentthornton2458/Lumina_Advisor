import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AISuggestionResponse, AIHighlight, AIHighlightType, TaskPriority } from '../types';
import { Sparkles, BrainCircuit, CheckSquare, Plus, Check, AlertTriangle, ShieldAlert, Lightbulb, Quote } from 'lucide-react';

interface AdvisorReportViewProps {
  response: AISuggestionResponse;
  isSimulated?: boolean;
  onAddTask?: (title: string, priority: TaskPriority, note?: string) => void;
  addedTaskTitles?: string[];
}

const HIGHLIGHT_CONFIG: Record<AIHighlightType, { icon: React.ElementType; wrapClass: string; label: string }> = {
  risk: { icon: AlertTriangle, wrapClass: 'bg-rose-500/10 border-rose-500/20 text-rose-300', label: 'Risk' },
  objection: { icon: ShieldAlert, wrapClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300', label: 'Objection' },
  opportunity: { icon: Lightbulb, wrapClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', label: 'Opportunity' },
  quote: { icon: Quote, wrapClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300', label: 'Quote' },
};

function HighlightChip({ highlight }: { highlight: AIHighlight }) {
  const config = HIGHLIGHT_CONFIG[highlight.type] || HIGHLIGHT_CONFIG.risk;
  const Icon = config.icon;
  return (
    <div className={`flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs max-w-sm ${config.wrapClass}`}>
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[9px]">
        <Icon size={12} /> {config.label}
      </div>
      <p className="font-medium leading-snug">
        {highlight.type === 'quote' ? `"${highlight.text}"` : highlight.text}
      </p>
      {highlight.response && (
        <p className="text-[10px] text-slate-300 border-t border-white/10 pt-1 mt-0.5">
          <span className="font-bold uppercase tracking-wide">Suggested response:</span> {highlight.response}
        </p>
      )}
    </div>
  );
}

const markdownComponents = {
  p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
  strong: (props: any) => <strong className="text-slate-50 font-semibold" {...props} />,
  em: (props: any) => <em className="text-slate-300 italic" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
  li: (props: any) => <li className="text-slate-200" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-2 border-blue-500/40 pl-3 italic text-slate-300 my-2" {...props} />,
};

export default function AdvisorReportView({ response, isSimulated, onAddTask, addedTaskTitles = [] }: AdvisorReportViewProps) {
  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-6 flex flex-col gap-6 shadow-xl relative">
      {isSimulated && (
        <span className="absolute top-4 right-4 font-mono text-[9px] text-amber-400 uppercase tracking-widest font-bold bg-amber-500/10 py-0.5 px-2.5 rounded border border-amber-500/20 z-10">
          Simulation Mode
        </span>
      )}

      {/* KPI Headline summary */}
      <div className="bg-slate-800/80 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0">
          <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-widest font-mono">Executive Situation Assessment</h4>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed mt-1 italic">
            "{response.assessment}"
          </p>
        </div>
      </div>

      {/* Structured sections */}
      <div className="space-y-4">
        {response.sections.map((section, idx) => (
          <div key={idx} className="bg-slate-850/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-xs">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-3">
              <BrainCircuit size={14} className="text-blue-400" /> {section.heading}
            </h4>

            {!!section.highlights?.length && (
              <div className="flex flex-wrap gap-2 mb-4">
                {section.highlights.map((h, hi) => (
                  <HighlightChip key={hi} highlight={h} />
                ))}
              </div>
            )}

            <div className="text-slate-200 text-sm leading-relaxed">
              <ReactMarkdown components={markdownComponents}>{section.body}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      {/* Actionable items */}
      {response.suggestedTasks.length > 0 && (
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <CheckSquare size={14} className="text-indigo-400" /> Recommended Follow-Up Actions
          </h4>
          <div className="space-y-3">
            {response.suggestedTasks.map((tsk, idx) => {
              const isAdded = addedTaskTitles.includes(tsk.title);
              return (
                <div key={idx} className="p-4 bg-slate-850 hover:bg-slate-800/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 transition duration-200 group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        tsk.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {tsk.priority} Priority
                      </span>
                      {tsk.note && <span className="text-[10px] text-slate-400 italic truncate max-w-[200px] md:max-w-xs">{tsk.note}</span>}
                    </div>
                    <p className="text-xs font-bold text-slate-100 mt-1">{tsk.title}</p>
                  </div>

                  {onAddTask && (
                    <button
                      onClick={() => onAddTask(tsk.title, tsk.priority, tsk.note)}
                      disabled={isAdded}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                        isAdded
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold'
                          : 'bg-slate-850 border border-slate-700 text-slate-350 hover:bg-slate-800'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={12} strokeWidth={3} className="text-emerald-450" /> Scheduled
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Add Task
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
