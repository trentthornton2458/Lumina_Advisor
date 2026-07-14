import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, 
  Clock, MapPin, AlertCircle, CalendarPlus, Info, 
  CheckSquare, Check, X, ShieldAlert, Sparkles, LogOut, Loader2
} from 'lucide-react';
import { TaskReminder, Contact } from '../types';
import { 
  connectGoogleCalendar, 
  fetchCalendarEvents, 
  createCalendarEvent, 
  CalendarEvent, 
  getGoogleAccessToken, 
  setGoogleAccessToken 
} from '../lib/googleCalendar';
import { useAuth } from '../context/AuthContext';

interface CalendarTabProps {
  tasks: TaskReminder[];
  contacts: Contact[];
  onAddTask: (task: TaskReminder) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Outlook Calendar integration is not wired up to a real Microsoft Graph API yet;
// this fixture data is shared by the mount-effect restore and handleConnectOutlook mock below.
const MOCK_OUTLOOK_EVENTS: CalendarEvent[] = [
  {
    id: 'out_1',
    summary: '💼 Outlook: Q3 Board Review Meeting',
    location: 'Microsoft Teams',
    start: { dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString() }
  },
  {
    id: 'out_2',
    summary: '📈 Outlook: Business Scaling Pitch with Investors',
    location: 'Conference Room C',
    start: { dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 3.1 * 24 * 60 * 60 * 1000).toISOString() }
  }
];

interface PendingEventPayload {
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  addToGoogle: boolean;
  addToLocal: boolean;
}

export default function CalendarTab({ tasks, contacts, onAddTask }: CalendarTabProps) {
  const { user } = useAuth();
  
  // Google & Outlook OAuth state caching
  const [googleToken, setGoogleToken] = useState<string | null>(getGoogleAccessToken());
  const [outlookToken, setOutlookToken] = useState<string | null>(() => sessionStorage.getItem('lumina_outlook_cal_token'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [outlookEvents, setOutlookEvents] = useState<CalendarEvent[]>([]);
  
  // Local calendar visual monthly navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Scheduling Dialog states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [addToGoogle, setAddToGoogle] = useState<boolean>(true);
  const [addToOutlook, setAddToOutlook] = useState<boolean>(true);
  const [addToLocal, setAddToLocal] = useState<boolean>(true);
  
  // Custom dialog confirmation popup
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingEventPayload, setPendingEventPayload] = useState<PendingEventPayload | null>(null);

  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth();

  // Load standard events from Google and Outlook if token exists on component mount
  useEffect(() => {
    const activeToken = getGoogleAccessToken();
    if (activeToken && googleEvents.length === 0) {
      setGoogleToken(activeToken);
      loadGoogleEvents(activeToken);
    }

    const activeOutlookToken = sessionStorage.getItem('lumina_outlook_cal_token');
    if (activeOutlookToken) {
      setOutlookToken(activeOutlookToken);
      setOutlookEvents(MOCK_OUTLOOK_EVENTS);
    }
  }, []);

  const loadGoogleEvents = async (token: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const items = await fetchCalendarEvents(token);
      setGoogleEvents(items);
    } catch (err: any) {
      console.error('Failed to load Google Calendar events:', err);
      setSyncError('Failed to fetch events from your Google Calendar. Please check connection or permissions.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const token = await connectGoogleCalendar();
      if (token) {
        setGoogleToken(token);
        setGoogleAccessToken(token);
        await loadGoogleEvents(token);
      } else {
        setSyncError('Could not retrieve access token from sign-in.');
      }
    } catch (err: any) {
      console.error('Connection process failed:', err);
      setSyncError(err.message || 'Verification flow was interrupted.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    setGoogleToken(null);
    setGoogleAccessToken(null);
    setGoogleEvents([]);
    setSyncError(null);
  };

  // MOCK IMPLEMENTATION: there is no real Microsoft Graph / Outlook OAuth flow wired up here.
  // This simulates a network round-trip and fabricates a token + fixture events so the rest of
  // the UI has something to render. The "Connected" badge for Outlook is labeled as a demo in
  // the UI below to avoid presenting this as a genuine integration.
  const handleConnectOutlook = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockToken = 'mock-outlook-token-123';
      setOutlookToken(mockToken);
      sessionStorage.setItem('lumina_outlook_cal_token', mockToken);
      setOutlookEvents(MOCK_OUTLOOK_EVENTS);
    } catch (err: any) {
      setSyncError('Microsoft connection failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectOutlook = () => {
    setOutlookToken(null);
    sessionStorage.removeItem('lumina_outlook_cal_token');
    setOutlookEvents([]);
  };

  const handleRefresh = () => {
    if (googleToken) {
      loadGoogleEvents(googleToken);
    }
  };

  // Helper calculation for month grids
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  const prevMonthDays = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Merge events and tasks by formatted date strings (YYYY-MM-DD)
  const agendaMap = useMemo(() => {
    const map: Record<string, { google: CalendarEvent[]; local: TaskReminder[] }> = {};

    // Group google events
    googleEvents.forEach(evt => {
      let dateKey = '';
      if (evt.start.dateTime) {
        dateKey = evt.start.dateTime.split('T')[0];
      } else if (evt.start.date) {
        dateKey = evt.start.date;
      }
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = { google: [], local: [] };
        map[dateKey].google.push(evt);
      }
    });

    // Group outlook events
    outlookEvents.forEach(evt => {
      let dateKey = '';
      if (evt.start.dateTime) {
        dateKey = evt.start.dateTime.split('T')[0];
      } else if (evt.start.date) {
        dateKey = evt.start.date;
      }
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = { google: [], local: [] };
        map[dateKey].google.push(evt);
      }
    });

    // Group local tasks
    tasks.forEach(task => {
      const dateKey = task.dueDate;
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = { google: [], local: [] };
        map[dateKey].local.push(task);
      }
    });

    return map;
  }, [googleEvents, outlookEvents, tasks]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Parse Google Event date/time ranges nicely
  const formatEventTime = (evt: CalendarEvent) => {
    if (evt.start.date) {
      return 'All Day';
    }
    if (evt.start.dateTime) {
      const start = new Date(evt.start.dateTime);
      const end = evt.end.dateTime ? new Date(evt.end.dateTime) : null;
      
      const formatTimeStr = (d: Date) => {
        let hrs = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12; // hour '0' should be '12'
        return `${hrs}:${mins} ${ampm}`;
      };

      if (end) {
        return `${formatTimeStr(start)} – ${formatTimeStr(end)}`;
      }
      return formatTimeStr(start);
    }
    return 'TBD';
  };

  // Handle Event Creation (Pre-submission stage)
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    // Build event payloads
    const startDateTimeStr = `${eventDate}T${startTime}:00`;
    const endDateTimeStr = `${eventDate}T${endTime}:00`;
    
    // Simple timezone detection
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const payload = {
      summary: eventTitle.trim(),
      description: eventDescription.trim(),
      location: eventLocation.trim(),
      start: { dateTime: startDateTimeStr, timeZone },
      end: { dateTime: endDateTimeStr, timeZone },
      addToGoogle: addToGoogle && !!googleToken,
      addToLocal: addToLocal
    };

    setPendingEventPayload(payload);
    setShowConfirmDialog(true);
  };

  // Final Action execution after verification modal
  const executeEventPublish = async () => {
    if (!pendingEventPayload) return;
    setIsSyncing(true);
    setShowConfirmDialog(false);

    const { summary, description, location, start, end, addToGoogle, addToLocal } = pendingEventPayload;

    try {
      // 1. Post to Google Calendar if requested + authorized
      if (addToGoogle && googleToken) {
        await createCalendarEvent(googleToken, {
          summary,
          description,
          location,
          start,
          end
        });
      }
    } catch (err: any) {
      console.error('Error creating Google Calendar event:', err);
      setSyncError('Failed to publish the schedule entry to Google Calendar. Please try again.');
      setIsSyncing(false);
      setPendingEventPayload(null);
      return;
    }

    // 2. Post to Local CRM tasks if requested (kept separate from the Google Calendar call above
    // so a local save failure isn't misreported as a Google Calendar failure, and vice versa)
    if (addToLocal) {
      try {
        const localTask: TaskReminder = {
          id: 'task_' + Date.now(),
          title: `[Event] ${summary}${location ? ' at ' + location : ''}`,
          dueDate: eventDate,
          completed: false,
          priority: 'Medium',
          notes: description || undefined
        };
        onAddTask(localTask);
      } catch (err: any) {
        console.error('Error saving local CRM task:', err);
        setSyncError('The event may have published to Google Calendar, but saving the local CRM task failed. Please try again.');
        setIsSyncing(false);
        setPendingEventPayload(null);
        return;
      }
    }

    // Clean up form and reload
    setEventTitle('');
    setEventLocation('');
    setEventDescription('');
    setIsFormOpen(false);

    if (googleToken) {
      await loadGoogleEvents(googleToken);
    }

    setIsSyncing(false);
    setPendingEventPayload(null);
  };

  // Get active day items
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const activeDayItems = useMemo(() => {
    return agendaMap[selectedDateStr] || { google: [], local: [] };
  }, [agendaMap, selectedDateStr]);

  // Calendar cells generation logic
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Fill previous month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dateVal = new Date(selectedYear, selectedMonth - 1, prevMonthDays - i);
      cells.push({
        date: dateVal,
        isCurrentMonth: false,
        dateString: dateVal.toISOString().split('T')[0]
      });
    }

    // Fill current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      const dateVal = new Date(selectedYear, selectedMonth, i);
      cells.push({
        date: dateVal,
        isCurrentMonth: true,
        dateString: dateVal.toISOString().split('T')[0]
      });
    }

    // Fill next month padding cells to complete standard calendar visual block
    const remainingCells = 42 - cells.length; // 6-row standard output layout
    for (let i = 1; i <= remainingCells; i++) {
      const dateVal = new Date(selectedYear, selectedMonth + 1, i);
      cells.push({
        date: dateVal,
        isCurrentMonth: false,
        dateString: dateVal.toISOString().split('T')[0]
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, daysInMonth, firstDayIndex, prevMonthDays]);

  const isTodayDate = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelectedDate = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <div className="space-y-6">
      
      {/* Synchronization Top Banner Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Card */}
        <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.06)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${googleToken ? 'bg-blue-50 text-blue-600' : 'bg-slate-105 text-slate-500'}`}>
              <CalendarIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800">Google Calendar</h3>
                {googleToken ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-550">
                    Not Synced
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-1">
                {googleToken ? 'Synced with your Google Workspace' : 'Sync your Google events'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {googleToken ? (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[10px] transition border border-red-200/40"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition shadow-xs flex items-center gap-1 disabled:opacity-50"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Outlook Card */}
        <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.06)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${outlookToken ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-105 text-slate-500'}`}>
              <CalendarIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800">Outlook Calendar</h3>
                {outlookToken ? (
                  <>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Connected
                    </span>
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200"
                      title="This Outlook integration is simulated and does not connect to a real Microsoft account."
                    >
                      Demo
                    </span>
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-550">
                    Not Synced
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-1">
                {outlookToken ? 'Simulated demo data (not a real Outlook connection)' : 'Sync your Microsoft events'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {outlookToken ? (
              <button
                onClick={handleDisconnectOutlook}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[10px] transition border border-red-200/40"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectOutlook}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition shadow-xs flex items-center gap-1 disabled:opacity-50"
              >
                Connect
              </button>
            )}
          </div>
        </div>

      </div>

      {syncError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 font-medium">{syncError}</div>
        </div>
      )}

      {/* Main Grid: Calendar Interface + Detailed Day View panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Visual Month Grid */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] overflow-hidden">
          
          {/* Calendar Header Control Block */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 text-lg">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <button 
                onClick={handleToday}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-2xs font-bold uppercase tracking-wider transition-colors"
              >
                Today
              </button>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 p-1 rounded-xl">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-all"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-all"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="p-5 pt-4">
            {/* Days of Week Row Header */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1.5 font-mono">
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                const isSelected = isSelectedDate(cell.date);
                const isToday = isTodayDate(cell.date);
                const hasEvents = agendaMap[cell.dateString] && (
                  agendaMap[cell.dateString].google.length > 0 || agendaMap[cell.dateString].local.length > 0
                );
                
                // Details of active indicators on cells
                const googleCount = agendaMap[cell.dateString]?.google.length || 0;
                const localCount = agendaMap[cell.dateString]?.local.length || 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`aspect-square rounded-2xl flex flex-col justify-between p-2 relative group transition-all duration-200 border ${
                      !cell.isCurrentMonth 
                        ? 'text-slate-300 border-transparent bg-transparent hover:bg-slate-50/50' 
                        : isSelected 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : isToday
                            ? 'bg-indigo-50/40 border-indigo-200 text-indigo-700 hover:bg-indigo-50/80 font-bold'
                            : 'bg-stone-50/50 hover:bg-slate-100/50 border-slate-100 hover:border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[12px] font-semibold">{cell.date.getDate()}</span>
                    
                    {/* Dot Indicator details with smart layouts */}
                    {hasEvents && (
                      <div className="flex gap-1 items-center justify-center mt-auto w-full">
                        {googleCount > 0 && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-indigo-500'}`} title={`${googleCount} Google Calendar item(s)`} />
                        )}
                        {localCount > 0 && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-amber-500'}`} title={`${localCount} Local CRM reminder(s)`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Day detailed schedule list & Scheduling actions panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active selected Day agenda list cards */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-mono">
                  Agenda for
                </h3>
                <h2 className="text-base font-bold text-slate-800 mt-1">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              
              <button
                onClick={() => {
                  setEventDate(selectedDate.toISOString().split('T')[0]);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus size={14} />
                Add Event
              </button>
            </div>

            {/* List items block */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activeDayItems.google.length === 0 && activeDayItems.local.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-slate-50 border border-slate-100/50 flex flex-col items-center justify-center px-4">
                  <CalendarIcon size={24} className="text-slate-300 mb-2.5" />
                  <p className="text-xs text-slate-400 font-semibold font-sans">No events on this day</p>
                  <p className="text-4xs text-slate-400 tracking-wider font-mono mt-1 uppercase">Ready to synchronize executive logs</p>
                </div>
              ) : (
                <>
                  {/* Google Calendar Events Section */}
                  {activeDayItems.google.map((evt) => (
                    <div key={evt.id} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40 transition-all flex gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl max-h-10 flex items-center justify-center select-none">
                        <CalendarIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider font-mono">Google Event</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mt-1 truncate">{evt.summary || 'Untitled Event'}</h4>
                        
                        <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-indigo-400" />
                            <span>{formatEventTime(evt)}</span>
                          </div>
                          {evt.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400" />
                              <span className="truncate">{evt.location}</span>
                            </div>
                          )}
                        </div>
                        {evt.description && (
                          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-indigo-100/30 pt-2 mt-2 font-serif line-clamp-2">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Local CRM Pending Reminder Items Section */}
                  {activeDayItems.local.map((task) => (
                    <div key={task.id} className="p-4 rounded-2xl border border-amber-100 bg-amber-50/10 hover:bg-amber-50/25 transition-all flex gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl max-h-10 flex items-center justify-center select-none">
                        <CheckSquare size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider font-mono">Local CRM Tasks</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            task.priority === 'High' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : task.priority === 'Medium' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                            {task.priority} Priority
                          </span>
                        </div>
                        <h4 className={`text-xs font-bold text-slate-800 mt-1 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </h4>
                        
                        {task.notes && (
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5 bg-white/60 p-2 rounded-lg border border-slate-100">
                            {task.notes}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-2.5 text-xs">
                          {task.completed ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check size={12} strokeWidth={3} /> COMPLETED
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 uppercase">
                              PENDING RESOLUTION
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Quick sync instruction notes explaining Google scopes context */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] p-6">
            <div className="flex gap-3">
              <Sparkles size={18} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Intelligent CRM Sync</h4>
                <p className="text-6xs text-slate-500 leading-relaxed mt-1">
                  Connecting Google Calendar authorizes Lumina to pull critical events and meetings directly to this dashboard, matching invite slots with corresponding Partner profiles in your executive feed automatically.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scheduler Form Drawer (Slide Over / Modal) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900 pointer-events-auto"
            />

            {/* Slide over drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white h-full shadow-[0_0_40px_rgba(15,23,42,0.15)] flex flex-col z-10"
            >
              {/* Header drawer controls */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="text-indigo-600" size={20} />
                  <h3 className="text-base font-bold text-slate-800">Schedule Strategic Event</h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer scroll body */}
              <form onSubmit={handleScheduleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Q3 Strategy Alignment Session"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Boardroom Alpha, Google Meet"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                    Description & Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide meeting agendas, discussion guidelines, briefing context..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition resize-none"
                  />
                </div>

                {/* Destinations checklist */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <span className="block text-3xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Publish Channels</span>
                  
                  {googleToken ? (
                    <label className="flex items-center gap-3 p-3.5 bg-indigo-50/25 border border-indigo-100 rounded-2xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={addToGoogle}
                        onChange={(e) => setAddToGoogle(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-indigo-950">Add to Google Calendar Address</span>
                        <span className="block text-[10px] text-indigo-500 mt-0.5">Push directly as a live calendar event on your synchronized Google Account feed.</span>
                      </div>
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl opacity-60">
                      <input type="checkbox" disabled checked={false} className="w-4 h-4 rounded border-slate-300" />
                      <div>
                        <span className="block text-xs font-bold text-slate-500">Google Calendar (Unavailable)</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Please connect your Secure Google account above first.</span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3.5 bg-amber-50/15 border border-amber-100 rounded-2xl cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addToLocal}
                      onChange={(e) => setAddToLocal(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-amber-950">Record in Local CRM Tracker</span>
                      <span className="block text-[10px] text-amber-600 mt-0.5">Generates a corresponding follow-up action listed inside the CRM Tasks log.</span>
                    </div>
                  </label>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition border border-slate-200/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                  >
                    Publish Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Explicit User Confirmation Dialog (MANDATORY for Workspace API mutations) */}
      <AnimatePresence>
        {showConfirmDialog && pendingEventPayload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDialog(false)}
              className="absolute inset-0 bg-slate-900 pointer-events-auto"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] border border-slate-200 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)] max-w-md w-full relative z-10 p-6 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-slate-900">Authorize Workspace Integration</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are going to write <strong>"{pendingEventPayload.summary}"</strong> on your Google Calendar feed with explicit permissions.
                  </p>
                </div>
              </div>

              {/* Selected fields review */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold font-mono">EVENT:</span>
                  <span className="text-slate-800 font-semibold">{pendingEventPayload.summary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold font-mono">TIMING:</span>
                  <span className="text-slate-800 font-semibold">
                    {pendingEventPayload.start.dateTime.split('T')[0]} @ {startTime}
                  </span>
                </div>
                {pendingEventPayload.location && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold font-mono">LOCATION:</span>
                    <span className="text-slate-800 font-semibold truncate max-w-[200px]">{pendingEventPayload.location}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200/60 pt-2 mt-1">
                  <span className="text-slate-400 font-bold font-mono">PUBLISH CHANNELS:</span>
                  <span className="font-bold text-indigo-600 uppercase text-[10px]">
                    {pendingEventPayload.addToGoogle ? 'Google Calendar' : ''}
                    {pendingEventPayload.addToGoogle && pendingEventPayload.addToLocal ? ' & ' : ''}
                    {pendingEventPayload.addToLocal ? 'Local CRM' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition border border-slate-200/60"
                >
                  Cancel
                </button>
                <button
                  onClick={executeEventPublish}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Confirm Event Creation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
