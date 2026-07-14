import React, { useState, useRef, useEffect } from 'react';
import { Search, Users, NotebookPen, CalendarCheck, X } from 'lucide-react';
import { Contact, MeetingNote, TaskReminder } from '../types';

interface GlobalSearchProps {
  contacts: Contact[];
  notes: MeetingNote[];
  tasks: TaskReminder[];
  setActiveTab: (tabId: string) => void;
}

export default function GlobalSearch({ contacts, notes, tasks, setActiveTab }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  const q = query.toLowerCase();

  const filteredContacts = query.trim() ? contacts.filter(
    (c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)
  ) : [];

  const filteredNotes = query.trim() ? notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  ) : [];

  const filteredTasks = query.trim() ? tasks.filter(
    (t) => t.title.toLowerCase().includes(q) && !t.completed
  ) : [];

  const hasResults = filteredContacts.length > 0 || filteredNotes.length > 0 || filteredTasks.length > 0;

  return (
    <div className="relative z-50 flex-1 max-w-md ml-4 mr-4 hidden md:block" ref={containerRef}>
      <div className="relative group">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Search contacts, notes, and tasks..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-full pl-10 pr-10 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {!hasResults ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {filteredContacts.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                    <Users size={12} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contacts</span>
                  </div>
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveTab('contacts');
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50/50 last:border-0"
                    >
                      <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.position} @ {c.company}</div>
                    </button>
                  ))}
                </div>
              )}

              {filteredNotes.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                    <NotebookPen size={12} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</span>
                  </div>
                  {filteredNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setActiveTab('notes');
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50/50 last:border-0"
                    >
                      <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                      <div className="text-xs text-slate-500 truncate">{n.category} • {n.date}</div>
                    </button>
                  ))}
                </div>
              )}

              {filteredTasks.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                    <CalendarCheck size={12} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasks</span>
                  </div>
                  {filteredTasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTab('tasks');
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50/50 last:border-0"
                    >
                      <div className="text-sm font-semibold text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500 truncate">Due: {t.dueDate} • {t.priority} Priority</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
