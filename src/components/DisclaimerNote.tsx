import React from 'react';
import { Info } from 'lucide-react';

interface DisclaimerNoteProps {
  text: string;
  /** Set for use on dark surfaces (e.g. the slate-900 AdvisorReportView card). */
  variant?: 'light' | 'dark';
  className?: string;
}

export default function DisclaimerNote({ text, variant = 'light', className = '' }: DisclaimerNoteProps) {
  const styles =
    variant === 'dark'
      ? 'text-slate-400 bg-slate-850/60 border-slate-800'
      : 'text-stone-400 bg-stone-50 border-stone-150';

  return (
    <div className={`flex items-start gap-2 text-[10px] border rounded-lg p-3 ${styles} ${className}`}>
      <Info size={13} className="shrink-0 mt-0.5" />
      <p>{text}</p>
    </div>
  );
}
