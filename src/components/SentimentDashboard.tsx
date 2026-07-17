import React, { useState, useMemo } from 'react';
import { MeetingNote, Contact, Company, NoteCategory } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, Cell
} from 'recharts';
import {
  TrendingUp, Users, Sparkles,
  Heart, Smile, Filter, X, ArrowUpRight, ArrowDownRight,
  GraduationCap, Star, AlertCircle, Building2
} from 'lucide-react';
import { noteInvolvesContact, getNoteAttendeeIds } from '../lib/noteUtils';

interface SentimentDashboardProps {
  notes: MeetingNote[];
  contacts: Contact[];
  companies: Company[];
}

const DATE_RANGES = [
  { key: 'all', label: 'All Time', days: null },
  { key: '30', label: 'Last 30 Days', days: 30 },
  { key: '90', label: 'Last 90 Days', days: 90 },
  { key: '365', label: 'Last 12 Months', days: 365 },
] as const;

const SENTIMENT_COLOR = (score: number) => (score >= 8 ? '#10b981' : score >= 5 ? '#94a3b8' : '#f43f5e');

export default function SentimentDashboard({ notes, contacts, companies }: SentimentDashboardProps) {
  const [contactFilter, setContactFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | ''>('');
  const [dateRange, setDateRange] = useState<typeof DATE_RANGES[number]['key']>('all');

  const availableCategories = useMemo(
    () => Array.from(new Set(notes.map(n => n.category))).sort(),
    [notes]
  );

  const hasActiveFilters = !!(contactFilter || companyFilter || categoryFilter || dateRange !== 'all');

  const clearFilters = () => {
    setContactFilter('');
    setCompanyFilter('');
    setCategoryFilter('');
    setDateRange('all');
  };

  // 1. Apply filters
  const filteredNotes = useMemo(() => {
    const rangeDays = DATE_RANGES.find(r => r.key === dateRange)?.days ?? null;
    const cutoff = rangeDays ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : null;

    const companyContactIds = companyFilter
      ? contacts
          .filter(c => c.companyId === companyFilter || c.company.toLowerCase() === companies.find(cp => cp.id === companyFilter)?.name.toLowerCase())
          .map(c => c.id)
      : null;

    return notes.filter(n => {
      if (contactFilter && !noteInvolvesContact(n, contactFilter)) return false;
      if (companyContactIds && !getNoteAttendeeIds(n).some(id => companyContactIds.includes(id))) return false;
      if (categoryFilter && n.category !== categoryFilter) return false;
      if (cutoff && new Date(n.date).getTime() < cutoff) return false;
      return true;
    });
  }, [notes, contacts, companies, contactFilter, companyFilter, categoryFilter, dateRange]);

  // 2. Calculate general metrics
  const totalMeetings = filteredNotes.length;

  const avgSentiment = totalMeetings > 0
    ? (filteredNotes.reduce((sum, n) => sum + n.sentimentScore, 0) / totalMeetings).toFixed(1)
    : '0.0';

  const avgEngagement = totalMeetings > 0
    ? (filteredNotes.reduce((sum, n) => sum + n.engagementLevel, 0) / totalMeetings).toFixed(1)
    : '0.0';

  const coachingOpportunityCount = filteredNotes.reduce((sum, n) => sum + (n.coachingOpportunities?.length || 0), 0);

  // 3. Trend chart data (chronological)
  const sortedNotesForTrend = [...filteredNotes]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = sortedNotesForTrend.map(n => {
    const attendeeNames = getNoteAttendeeIds(n).map(id => contacts.find(c => c.id === id)?.name).filter(Boolean);
    return {
      dateString: n.date,
      sentiment: n.sentimentScore,
      engagement: n.engagementLevel,
      title: n.title,
      contact: attendeeNames.length > 0 ? attendeeNames.join(', ') : 'Unknown'
    };
  });

  // 4. Relational health index (scoped to contacts appearing in the current filter, if any)
  const relevantContacts = contactFilter
    ? contacts.filter(c => c.id === contactFilter)
    : companyFilter
    ? contacts.filter(c => c.companyId === companyFilter || c.company.toLowerCase() === companies.find(cp => cp.id === companyFilter)?.name.toLowerCase())
    : contacts;
  const warmAndActiveCount = relevantContacts.filter(c => c.relationStatus === 'Warm' || c.relationStatus === 'Active').length;
  const healthIndexPercent = relevantContacts.length > 0
    ? Math.round((warmAndActiveCount / relevantContacts.length) * 100)
    : 0;

  // 5. Sentiment distribution
  const positiveCount = filteredNotes.filter(n => n.sentimentScore >= 8).length;
  const neutralCount = filteredNotes.filter(n => n.sentimentScore >= 5 && n.sentimentScore < 8).length;
  const negativeCount = filteredNotes.filter(n => n.sentimentScore < 5).length;

  const negativePct = totalMeetings > 0 ? Math.round((negativeCount / totalMeetings) * 100) : 0;
  const neutralPct = totalMeetings > 0 ? Math.round((neutralCount / totalMeetings) * 100) : 0;
  const positivePct = totalMeetings > 0 ? Math.round((positiveCount / totalMeetings) * 100) : 0;

  // 6. Category breakdown — avg sentiment + count per category present in the filtered set
  const categoryBreakdown = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    filteredNotes.forEach(n => {
      const g = groups.get(n.category) || { total: 0, count: 0 };
      g.total += n.sentimentScore;
      g.count += 1;
      groups.set(n.category, g);
    });
    return Array.from(groups.entries())
      .map(([category, g]) => ({ category, avgSentiment: Number((g.total / g.count).toFixed(1)), count: g.count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredNotes]);

  // 7. Relationship movers — compare each contact's most recent notes against their earlier ones
  const movers = useMemo(() => {
    const byContact = new Map<string, MeetingNote[]>();
    contacts.forEach(c => {
      const cNotes = filteredNotes
        .filter(n => noteInvolvesContact(n, c.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (cNotes.length >= 3) byContact.set(c.id, cNotes);
    });

    const deltas = Array.from(byContact.entries()).map(([contactId, cNotes]) => {
      const recentCount = Math.min(2, Math.floor(cNotes.length / 2));
      const recent = cNotes.slice(0, recentCount);
      const prior = cNotes.slice(recentCount);
      const recentAvg = recent.reduce((s, n) => s + n.sentimentScore, 0) / recent.length;
      const priorAvg = prior.reduce((s, n) => s + n.sentimentScore, 0) / prior.length;
      return {
        contact: contacts.find(c => c.id === contactId)!,
        delta: Number((recentAvg - priorAvg).toFixed(1)),
        recentAvg: Number(recentAvg.toFixed(1)),
      };
    }).filter(d => Math.abs(d.delta) >= 0.5);

    const improved = [...deltas].sort((a, b) => b.delta - a.delta).slice(0, 3).filter(d => d.delta > 0);
    const declined = [...deltas].sort((a, b) => a.delta - b.delta).slice(0, 3).filter(d => d.delta < 0);

    return { improved, declined };
  }, [filteredNotes, contacts]);

  // 8. Spotlight notes — best and worst logged interaction in the current filter
  const spotlightNotes = useMemo(() => {
    if (filteredNotes.length === 0) return { best: null, worst: null };
    const sorted = [...filteredNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const best = [...sorted].sort((a, b) => b.sentimentScore - a.sentimentScore)[0];
    const worst = [...sorted].sort((a, b) => a.sentimentScore - b.sentimentScore)[0];
    return { best, worst: worst.id === best.id ? null : worst };
  }, [filteredNotes]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 text-xs shadow-lg max-w-[220px]">
          <p className="font-semibold text-slate-300 font-mono">{data.dateString}</p>
          <p className="font-bold text-sm truncate mt-0.5">{data.title}</p>
          <p className="text-slate-400 mt-1">With: {data.contact}</p>
          <div className="flex gap-4 border-t border-slate-800 pt-2 mt-2 font-semibold">
            <span className="text-emerald-400">Sentiment: {data.sentiment}/10</span>
            <span className="text-blue-400">Engagement: {data.engagement}/10</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 text-xs shadow-lg">
          <p className="font-bold text-sm">{data.category}</p>
          <p className="text-slate-400 mt-1">{data.count} meeting{data.count === 1 ? '' : 's'} logged</p>
          <p className="font-semibold mt-1" style={{ color: SENTIMENT_COLOR(data.avgSentiment) }}>Avg Sentiment: {data.avgSentiment}/10</p>
        </div>
      );
    }
    return null;
  };

  const noteExcerpt = (n: MeetingNote) => (n.content.length > 140 ? `${n.content.slice(0, 140).trim()}...` : n.content);
  const noteAttendeeLabel = (n: MeetingNote) => {
    const names = getNoteAttendeeIds(n).map(id => contacts.find(c => c.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'No linked contact';
  };

  return (
    <div id="sentiment-analysis-dashboard" className="space-y-6 pb-12">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Filter size={13} /> Filter
        </span>
        <select
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setContactFilter(''); }}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Contacts</option>
          {contacts
            .filter(c => !companyFilter || c.companyId === companyFilter || c.company.toLowerCase() === companies.find(cp => cp.id === companyFilter)?.name.toLowerCase())
            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as NoteCategory | '')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Categories</option>
          {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
          {DATE_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setDateRange(r.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                dateRange === r.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Intro Metrics Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-6 flex items-center justify-between hover:shadow-md transition duration-305">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Sentiment</span>
            <span className="text-3xl font-extrabold text-slate-950 mt-2 inline-block tracking-tight">
              {avgSentiment} <span className="text-slate-400 text-base font-normal">/ 10</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1 font-medium">General conversation tone</span>
          </div>
          <div className="p-3 bg-blue-50/50 text-blue-600 rounded-2xl border border-blue-100/40">
            <Smile size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-6 flex items-center justify-between hover:shadow-md transition duration-305">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stakeholder Focus</span>
            <span className="text-3xl font-extrabold text-slate-950 mt-2 inline-block tracking-tight">
              {avgEngagement} <span className="text-slate-400 text-base font-normal">/ 10</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1 font-medium">Audience attention & interaction</span>
          </div>
          <div className="p-3 bg-indigo-50/50 text-indigo-600 rounded-2xl border border-indigo-100/40">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-6 flex items-center justify-between hover:shadow-md transition duration-305">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Network Health Index</span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-2 inline-block tracking-tight">{healthIndexPercent}%</span>
            <span className="text-[11px] text-slate-500 block mt-1 font-medium">Warm/Active contact ratio</span>
          </div>
          <div className="p-3 bg-emerald-50/50 text-emerald-600 rounded-2xl border border-emerald-100/40">
            <Heart size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-6 flex items-center justify-between hover:shadow-md transition duration-305">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Database</span>
            <span className="text-3xl font-extrabold text-slate-950 mt-2 inline-block tracking-tight">
              {totalMeetings} <span className="text-slate-400 text-base font-normal">logs</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1 font-medium">{relevantContacts.length} professional profiles</span>
          </div>
          <div className="p-3 bg-slate-50/50 text-slate-600 rounded-2xl border border-slate-100">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-6 flex items-center justify-between hover:shadow-md transition duration-305">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coaching Tips</span>
            <span className="text-3xl font-extrabold text-indigo-600 mt-2 inline-block tracking-tight">{coachingOpportunityCount}</span>
            <span className="text-[11px] text-slate-500 block mt-1 font-medium">AI-flagged opportunities</span>
          </div>
          <div className="p-3 bg-purple-50/50 text-purple-600 rounded-2xl border border-purple-100/40">
            <GraduationCap size={22} />
          </div>
        </div>
      </div>

      {/* Main Graphs Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chronological engagement Trend AreaChart */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-7 flex flex-col h-[420px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Interactions Engagement Trends Over Time</h3>
            <p className="text-xs text-slate-400 mt-1">Dual timeline tracking relationship sentiment alignment versus audience attention indexes.</p>
          </div>

          <div className="flex-1 w-full text-xs font-mono">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-center px-6">
                {hasActiveFilters ? 'No logged meetings match the current filters.' : 'Insufficient timelines recorded to render metric analytics.'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="dateString"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    domain={[0, 10]}
                    tickCount={6}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconSize={10}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs capitalize font-sans text-slate-650 font-medium">{value} Grade</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSentiment)"
                    name="sentiment"
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEngagement)"
                    name="engagement"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sentiment Distribution Breakdown */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-7 flex flex-col justify-between h-[420px]">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Sentiment Alignment Mix</h3>
            <p className="text-xs text-slate-400 mt-1">Breakdown distribution profile of registered conversations based on outcome grades.</p>
          </div>

          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {totalMeetings === 0 ? (
              <p className="text-center text-slate-400 text-xs italic">No meeting logs match the current filters.</p>
            ) : (
              <div className="space-y-4.5">
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Positive Alignment (8-10)</span>
                    <span className="font-mono text-slate-900 font-bold">{positiveCount} ({positivePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positivePct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Constructive Neutral (5-7)</span>
                    <span className="font-mono text-slate-900 font-bold">{neutralCount} ({neutralPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full" style={{ width: `${neutralPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Impasse / At Risk (1-4)</span>
                    <span className="font-mono text-rose-600 font-bold">{negativeCount} ({negativePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${negativePct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/40 text-xs text-slate-650 mt-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-1.5">
              <Sparkles size={13} className="text-blue-600 animate-pulse" /> Analytical Advice
            </h4>
            {negativeCount > 0 ? (
              <p className="leading-relaxed">
                You have <span className="text-rose-650 font-bold">{negativeCount} at-risk interactions</span>. Use the <strong>AI Advisor</strong> to draft proactive win-win compromise proposals and mend these connections.
              </p>
            ) : totalMeetings > 0 ? (
              <p className="leading-relaxed">
                Relational sentiment is steady. Leverage your warm connections to request recommendations or deepen strategic trust.
              </p>
            ) : (
              <p className="italic text-slate-400">Add meeting notes to unlock advisory analytics.</p>
            )}
          </div>
        </div>
      </div>

      {/* Category breakdown + Relationship Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-7 flex flex-col h-[360px]">
          <div className="mb-3">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Sentiment by Meeting Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">Where conversations tend to run warm versus where friction concentrates.</p>
          </div>
          <div className="flex-1 w-full">
            {categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">No data to break down yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="avgSentiment" radius={[4, 4, 0, 0]}>
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={SENTIMENT_COLOR(entry.avgSentiment)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-7 flex flex-col h-[360px] overflow-y-auto">
          <div className="mb-3">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Relationship Movers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Recent-vs-prior sentiment shift per contact (needs 3+ logged notes).</p>
          </div>
          {movers.improved.length === 0 && movers.declined.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs text-center px-4">Not enough interaction history yet to detect trend shifts.</div>
          ) : (
            <div className="space-y-4">
              {movers.improved.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><ArrowUpRight size={14} /> Most Improved</h4>
                  <div className="space-y-2">
                    {movers.improved.map(m => (
                      <div key={m.contact.id} className="flex justify-between items-center text-xs bg-emerald-50/60 border border-emerald-100 rounded-xl px-3.5 py-2">
                        <span className="font-bold text-slate-800 truncate">{m.contact.name}</span>
                        <span className="font-mono font-bold text-emerald-700 shrink-0 ml-2">+{m.delta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {movers.declined.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><ArrowDownRight size={14} /> Most Declined</h4>
                  <div className="space-y-2">
                    {movers.declined.map(m => (
                      <div key={m.contact.id} className="flex justify-between items-center text-xs bg-rose-50/60 border border-rose-100 rounded-xl px-3.5 py-2">
                        <span className="font-bold text-slate-800 truncate">{m.contact.name}</span>
                        <span className="font-mono font-bold text-rose-700 shrink-0 ml-2">{m.delta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spotlight notes */}
      {(spotlightNotes.best || spotlightNotes.worst) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {spotlightNotes.best && (
            <div className="bg-white rounded-3xl border-l-4 border-l-emerald-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5"><Star size={13} className="fill-emerald-100" /> Best Logged Interaction</span>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1">{spotlightNotes.best.sentimentScore}/10</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{spotlightNotes.best.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1"><Building2 size={12} /> {noteAttendeeLabel(spotlightNotes.best)} &middot; {spotlightNotes.best.date}</p>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">{noteExcerpt(spotlightNotes.best)}</p>
              </div>
            </div>
          )}
          {spotlightNotes.worst && (
            <div className="bg-white rounded-3xl border-l-4 border-l-rose-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={13} className="fill-rose-100" /> Highest-Risk Interaction</span>
                  <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1">{spotlightNotes.worst.sentimentScore}/10</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{spotlightNotes.worst.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1"><Building2 size={12} /> {noteAttendeeLabel(spotlightNotes.worst)} &middot; {spotlightNotes.worst.date}</p>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">{noteExcerpt(spotlightNotes.worst)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
