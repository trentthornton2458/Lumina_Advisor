import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PersonalNote } from '../types';
import {
  NotebookPen, Search, Plus, Trash2, Edit2, X, Check, Tag, Calendar
} from 'lucide-react';
import { useToast } from './Toast';

interface PersonalNotesManagerProps {
  notes: PersonalNote[];
  onAddNote: (note: PersonalNote) => void;
  onUpdateNote: (note: PersonalNote) => void;
  onDeleteNote: (id: string) => void;
}

export default function PersonalNotesManager({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote
}: PersonalNotesManagerProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const filteredNotes = notes
    .filter(n => {
      const haystack = `${n.title} ${n.content} ${(n.tags || []).join(' ')}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => (b.date + (b.updatedAt || '')).localeCompare(a.date + (a.updatedAt || '')));

  const resetForm = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setContent('');
    setTagsInput('');
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
    setEditingId(null);
  };

  const startEdit = (note: PersonalNote) => {
    setTitle(note.title);
    setDate(note.date);
    setContent(note.content);
    setTagsInput((note.tags || []).join(', '));
    setEditingId(note.id);
    setIsAdding(false);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    if (isAdding) {
      const newNote: PersonalNote = {
        id: 'pn_' + Date.now(),
        date,
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
        createdAt: new Date().toISOString(),
      };
      onAddNote(newNote);
    } else if (editingId) {
      const existing = notes.find(n => n.id === editingId);
      if (!existing) return;
      const updatedNote: PersonalNote = {
        ...existing,
        date,
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateNote(updatedNote);
    }
    cancelForm();
  };

  const executeDelete = (id: string) => {
    onDeleteNote(id);
    setDeleteConfirmId(null);
    if (editingId === id) cancelForm();
  };

  const isFormOpen = isAdding || !!editingId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <NotebookPen size={16} className="text-blue-600" />
            Personal Notes
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Freeform notes just for you — ideas, reminders, goals. Not tied to any meeting, contact, or company.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 transition"
            />
          </div>
          <button
            onClick={startAdd}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
          >
            <Plus size={14} />
            New Note
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">{isAdding ? 'New Personal Note' : 'Edit Note'}</h4>
              <button type="button" onClick={cancelForm} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition" aria-label="Cancel">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Career growth ideas"
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Content *</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write anything..."
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. goals, ideas, reminders"
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={cancelForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5">
                <Check size={14} />
                Save Note
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {filteredNotes.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 p-10 text-center rounded-2xl italic text-xs text-slate-400">
          {notes.length === 0 ? 'No personal notes yet. Click "New Note" to jot something down.' : 'No notes match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNotes.map(note => (
            <div key={note.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{note.title}</h4>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={10} />
                    {note.date}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    aria-label="Edit note"
                  >
                    <Edit2 size={13} />
                  </button>
                  {deleteConfirmId === note.id ? (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5">
                      <button onClick={() => executeDelete(note.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-[9px] transition">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md" aria-label="Cancel delete">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(note.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      aria-label="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2.5 whitespace-pre-wrap line-clamp-4">{note.content}</p>
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {note.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-150 px-2 py-0.5 rounded-full text-[9px] font-bold">
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
