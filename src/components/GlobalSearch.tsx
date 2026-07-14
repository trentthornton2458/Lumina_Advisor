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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
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
    setHighlightedIndex(-1);
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

  // Flat list of results (in display order) so keyboard navigation can move through
  // contacts, notes, and tasks as one continuous list, reusing each result's click handler.
  const selectContact = () => {
    setActiveTab('contacts');
    setIsOpen(false);
  };
  const selectNote = () => {
    setActiveTab('notes');
    setIsOpen(false);
  };
  const selectTask = () => {
    setActiveTab('tasks');
    setIsOpen(false);
  };

  const flatResults = [
    ...filteredContacts.map(c => ({ key: `contact-${c.id}`, onSelect: selectContact })),
    ...filteredNotes.map(n => ({ key: `note-${n.id}`, onSelect: selectNote })),
    ...filteredTasks.map(t => ({ key: `task-${t.id}`, onSelect: selectTask })),
  ];
  const contactsStartIndex = 0;
  const notesStartIndex = filteredContacts.length;
  const tasksStartIndex = filteredContacts.length + filteredNotes.length;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      if (!isOpen) setIsOpen(true);
      setHighlightedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      if (!isOpen) setIsOpen(true);
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
        e.preventDefault();
        flatResults[highlightedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      if (isOpen || query) {
        e.preventDefault();
        handleClear();
      }
    }
  };

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
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-expanded={isOpen && query.trim() !== ''}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-full pl-10 pr-10 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-[400px] overflow-y-auto"
        >
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
                  {filteredContacts.map((c, i) => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={highlightedIndex === contactsStartIndex + i}
                      onClick={selectContact}
                      onMouseEnter={() => setHighlightedIndex(contactsStartIndex + i)}
                      className={`w-full text-left px-4 py-2 border-b border-slate-50/50 last:border-0 ${
                        highlightedIndex === contactsStartIndex + i ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
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
                  {filteredNotes.map((n, i) => (
                    <button
                      key={n.id}
                      role="option"
                      aria-selected={highlightedIndex === notesStartIndex + i}
                      onClick={selectNote}
                      onMouseEnter={() => setHighlightedIndex(notesStartIndex + i)}
                      className={`w-full text-left px-4 py-2 border-b border-slate-50/50 last:border-0 ${
                        highlightedIndex === notesStartIndex + i ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
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
                  {filteredTasks.map((t, i) => (
                    <button
                      key={t.id}
                      role="option"
                      aria-selected={highlightedIndex === tasksStartIndex + i}
                      onClick={selectTask}
                      onMouseEnter={() => setHighlightedIndex(tasksStartIndex + i)}
                      className={`w-full text-left px-4 py-2 border-b border-slate-50/50 last:border-0 ${
                        highlightedIndex === tasksStartIndex + i ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
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
