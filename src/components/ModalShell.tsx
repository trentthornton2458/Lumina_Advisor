import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalShellProps {
  /** Bold header title. */
  title: string;
  /** Optional subtitle rendered under the title (string or JSX). */
  subtitle?: React.ReactNode;
  /** The icon element rendered inside the gradient badge (e.g. <Mic size={20} className="text-white" />). */
  icon: React.ReactNode;
  /** Tailwind classes for the gradient icon badge wrapper. */
  iconWrapperClassName?: string;
  /** Tailwind classes for the header bar background. */
  headerClassName?: string;
  /** Called when the user closes the dialog (X button, Escape, or backdrop). */
  onClose: () => void;
  /**
   * Handler for clicking the backdrop. Defaults to `onClose`. Pass `undefined`
   * explicitly to disable backdrop-dismiss (e.g. while a task is in progress).
   */
  onBackdropClick?: (() => void) | undefined;
  /** Optional footer rendered below the scrollable body. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared modal chrome for the AI tool modals. Provides:
 * - role="dialog" / aria-modal="true" semantics
 * - Escape-to-close
 * - focus moved into the dialog on mount, restored to the trigger on unmount
 * - the standard backdrop + card + gradient-icon header shell
 */
export default function ModalShell({
  title,
  subtitle,
  icon,
  iconWrapperClassName = 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-600/20',
  headerClassName = 'from-slate-50 to-blue-50/30',
  onClose,
  onBackdropClick = onClose,
  footer,
  children,
}: ModalShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Remember the element that had focus so we can restore it on close.
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus into the dialog.
    containerRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onBackdropClick}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Card */}
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r ${headerClassName}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${iconWrapperClassName}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>

        {/* Footer */}
        {footer}
      </motion.div>
    </div>
  );
}
