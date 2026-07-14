import React, { useState, useEffect } from 'react';
import { TaskReminder, Contact, MeetingNote, TaskPriority } from '../types';
import { 
  CheckCircle2, Circle, Calendar, Trash2, Plus, AlertCircle, 
  User, Link2, Check, Clock, ShieldAlert, X 
} from 'lucide-react';

interface FollowUpRemindersProps {
  tasks: TaskReminder[];
  contacts: Contact[];
  notes: MeetingNote[];
  onAddTask: (task: TaskReminder) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  triggerAdd?: number;
}

export default function FollowUpReminders({
  tasks,
  contacts,
  notes,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  triggerAdd
}: FollowUpRemindersProps) {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('Pending');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [meetingNoteId, setMeetingNoteId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [taskNotes, setTaskNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Listen for header trigger
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      setIsAdding(true);
    }
  }, [triggerAdd]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Completed') return task.completed;
    if (filter === 'Pending') return !task.completed;
    if (filter === 'Overdue') {
      return !task.completed && task.dueDate < todayStr;
    }
    return true; // 'All'
  }).sort((a, b) => {
    // Sort completed tasks to the bottom, then sort by date ascending
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
      default:
        return 'bg-stone-50 text-stone-600 border-stone-150';
    }
  };

  const getDueDateLabel = (dueDateStr: string, completed: boolean) => {
    if (completed) return { text: `Completed`, style: 'text-stone-400 font-medium' };

    const today = new Date(todayStr).getTime();
    const target = new Date(dueDateStr).getTime();
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: `Overdue by ${Math.abs(diffDays)}d (${dueDateStr})`, 
        style: 'text-rose-600 font-bold flex items-center gap-1 animate-pulse' 
      };
    }
    if (diffDays === 0) {
      return { 
        text: `Due Today! (${dueDateStr})`, 
        style: 'text-amber-650 font-bold flex items-center gap-1' 
      };
    }
    if (diffDays === 1) {
      return { text: `Due Tomorrow (${dueDateStr})`, style: 'text-stone-600 font-medium' };
    }
    return { text: `In ${diffDays} days (${dueDateStr})`, style: 'text-stone-500 font-medium' };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      return;
    }

    const newTask: TaskReminder = {
      id: 't_' + Date.now(),
      title: title.trim(),
      dueDate,
      contactId: contactId || undefined,
      meetingNoteId: meetingNoteId || undefined,
      priority,
      completed: false,
      notes: taskNotes.trim() || undefined
    };

    onAddTask(newTask);
    setIsAdding(false);

    // Reset standard states
    setTitle('');
    setDueDate('');
    setContactId('');
    setMeetingNoteId('');
    setPriority('Medium');
    setTaskNotes('');
  };

  const activeCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate < todayStr).length;

  return (
    <div id="tasks-reminders-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full pb-6">
      {/* Sidebar List filtering options */}
      <div className="lg:col-span-3 bg-white rounded-xl shadow-xs border border-stone-200 p-4 space-y-4">
        <h2 className="text-lg font-medium text-stone-950 tracking-tight">Focus Tasks</h2>
 
        <div className="flex flex-col gap-1 text-sm font-medium text-stone-600">
          <button
            onClick={() => setFilter('Pending')}
            className={`flex items-center justify-between p-2.5 rounded-lg text-left transition ${
              filter === 'Pending' ? 'bg-stone-900 text-white font-semibold' : 'hover:bg-stone-50 text-stone-750'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock size={16} /> Pending Tasks
            </span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filter === 'Pending' ? 'bg-stone-750 text-white' : 'bg-stone-100 text-stone-700'}`}>
              {activeCount}
            </span>
          </button>
 
          <button
            onClick={() => setFilter('Overdue')}
            className={`flex items-center justify-between p-2.5 rounded-lg text-left transition ${
              filter === 'Overdue' ? 'bg-rose-50 border border-rose-200 text-rose-800 font-bold' : 'hover:bg-stone-50 text-stone-750'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert size={16} className={overdueCount > 0 ? 'text-rose-600 animate-bounce' : 'text-stone-400'} /> Overdue Tasks
            </span>
            {overdueCount > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 bg-rose-600 text-white rounded-full font-bold">
                {overdueCount}
              </span>
            )}
          </button>
 
          <button
            onClick={() => setFilter('Completed')}
            className={`flex items-center justify-between p-2.5 rounded-lg text-left transition ${
              filter === 'Completed' ? 'bg-stone-900 text-white font-semibold' : 'hover:bg-stone-50 text-stone-750'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> Completed Tasks
            </span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filter === 'Completed' ? 'bg-stone-750 text-white' : 'bg-stone-100 text-stone-700'}`}>
              {tasks.filter(t => t.completed).length}
            </span>
          </button>
 
          <button
            onClick={() => setFilter('All')}
            className={`flex items-center justify-between p-2.5 rounded-lg text-left transition ${
              filter === 'All' ? 'bg-stone-900 text-white font-semibold' : 'hover:bg-stone-50 text-stone-750'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar size={16} /> All Tracked
            </span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filter === 'All' ? 'bg-stone-750 text-white' : 'bg-stone-100 text-stone-700'}`}>
              {tasks.length}
            </span>
          </button>
        </div>
 
        <button
          id="toggle-task-form-btn"
          onClick={() => setIsAdding(!isAdding)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-850 transition"
        >
          {isAdding ? <X size={15} /> : <Plus size={15} />}
          {isAdding ? 'Close Task Form' : 'Create Task'}
        </button>
      </div>

      {/* Main pane containing the content */}
      <div className="lg:col-span-9 space-y-4">
        {isAdding && (
          /* Add Task Form overlay block */
          <div id="add-task-form" className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 animate-fade-in">
            <h3 className="text-lg font-medium text-stone-900 mb-4">Create New Task</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Send updated pricing Redline deck"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    min={todayStr}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Link to Contact</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="">-- No contact linking --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>
 
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Link to specific log / meeting</label>
                  <select
                    value={meetingNoteId}
                    onChange={(e) => setMeetingNoteId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="">-- No meeting linking --</option>
                    {notes.map(n => (
                      <option key={n.id} value={n.id}>{n.title} ({n.date})</option>
                    ))}
                  </select>
                </div>
 
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Task Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500"
                  >
                    <option value="High">High stakes (Requires urgent action)</option>
                    <option value="Medium">Medium (Regular schedule follow-up)</option>
                    <option value="Low">Low priority (Nice-to-have networking)</option>
                  </select>
                </div>
              </div>
 
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Task Description / Tactical Reminders</label>
                <textarea
                  placeholder="Record step-by-step instructions, references mentioned..."
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-stone-500 resize-none"
                />
              </div>
 
              <div className="flex justify-end gap-2 text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-850 transition"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        )}
 
        {/* Task listings block */}
        <div id="tasks-list-panel" className="bg-white rounded-xl shadow-xs border border-stone-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold tracking-wider text-stone-400 uppercase flex items-center gap-1.5">
              Current Filters: <span className="text-stone-800 font-bold">{filter.toUpperCase()} ({filteredTasks.length})</span>
            </h3>
          </div>
 
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-sm">
                No items matching the selected task state. You are completely current!
              </div>
            ) : (
              filteredTasks.map(t => {
                const contact = contacts.find(c => c.id === t.contactId);
                const note = notes.find(n => n.id === t.meetingNoteId);
                const statusDate = getDueDateLabel(t.dueDate, t.completed);

                return (
                  <div
                    key={t.id}
                    id={`task-item-${t.id}`}
                    className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between items-start gap-4 ${
                      t.completed 
                        ? 'bg-stone-50/50 border-stone-200 opacity-70' 
                        : t.dueDate < todayStr 
                        ? 'bg-rose-50/10 border-rose-150 shadow-xs' 
                        : 'bg-white border-stone-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Interactive toggle custom buttons */}
                      <button
                        id={`toggle-complete-${t.id}`}
                        onClick={() => onToggleTask(t.id)}
                        className="mt-0.5 text-stone-400 hover:text-stone-800 transition focus:outline-none flex-shrink-0"
                        aria-label={t.completed ? 'Mark task incomplete' : 'Mark task complete'}
                      >
                        {t.completed ? (
                          <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-10" />
                        ) : (
                          <Circle size={20} className="text-stone-400 hover:scale-105 transition" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold tracking-tight text-stone-900 ${t.completed ? 'line-through text-stone-400' : ''}`}>
                          {t.title}
                        </h4>

                        {/* Reminders details */}
                        {t.notes && !t.completed && (
                          <p className="text-xs text-stone-605 mt-1 leading-relaxed max-w-2xl bg-stone-50/50 p-2 rounded-md border border-stone-100">
                            {t.notes}
                          </p>
                        )}

                        {/* Associated badges */}
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-2.5 text-[11px] text-stone-500 font-medium">
                          <span className={statusDate.style}>
                            <Calendar size={12} />
                            {statusDate.text}
                          </span>

                          {contact && (
                            <span className="flex items-center gap-1 text-stone-800">
                              <User size={12} className="text-stone-400" />
                              Contact: <span className="font-semibold">{contact.name}</span>
                            </span>
                          )}

                          {note && (
                            <span className="flex items-center gap-1.5 text-stone-505" title={note.title}>
                              <Link2 size={11} className="text-stone-400" />
                              Origin: <span className="italic truncate max-w-[150px]">{note.title}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-x-4 gap-y-2 w-full md:w-auto border-t md:border-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-between">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border tracking-wider uppercase ${getPriorityBadge(t.priority)}`}>
                        {t.priority} Priority
                      </span>
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        className="text-stone-400 hover:text-rose-650 p-1 rounded-lg hover:bg-stone-50 hover:border hover:border-stone-200 transition"
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
