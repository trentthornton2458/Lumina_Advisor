import React from 'react';
import { MeetingNote, Contact } from '../types';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Star, Users, CheckSquare, Sparkles, 
  Heart, AlertCircle, Smile 
} from 'lucide-react';

interface SentimentDashboardProps {
  notes: MeetingNote[];
  contacts: Contact[];
}

export default function SentimentDashboard({ notes, contacts }: SentimentDashboardProps) {
  // 1. Calculate General metrics
  const totalMeetings = notes.length;
  
  const avgSentiment = totalMeetings > 0 
    ? (notes.reduce((sum, n) => sum + n.sentimentScore, 0) / totalMeetings).toFixed(1) 
    : '0.0';

  const avgEngagement = totalMeetings > 0 
    ? (notes.reduce((sum, n) => sum + n.engagementLevel, 0) / totalMeetings).toFixed(1) 
    : '0.0';

  // 2. Prepare Trend Chart Data (Chronological order)
  const sortedNotesForTrend = [...notes]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = sortedNotesForTrend.map(n => {
    const contact = contacts.find(c => c.id === n.contactId);
    return {
      dateString: n.date, // Format date slightly
      sentiment: n.sentimentScore,
      engagement: n.engagementLevel,
      title: n.title,
      contact: contact ? contact.name : 'Unknown'
    };
  });

  // 3. Count contact metrics
  const warmAndActiveCount = contacts.filter(c => c.relationStatus === 'Warm' || c.relationStatus === 'Active').length;
  const healthIndexPercent = contacts.length > 0
    ? Math.round((warmAndActiveCount / contacts.length) * 100)
    : 0;

  // 4. Distribution of sentiment
  const positiveCount = notes.filter(n => n.sentimentScore >= 8).length;
  const neutralCount = notes.filter(n => n.sentimentScore >= 5 && n.sentimentScore < 8).length;
  const negativeCount = notes.filter(n => n.sentimentScore < 5).length;

  const negativePct = totalMeetings > 0 ? Math.round((negativeCount / totalMeetings) * 100) : 0;
  const neutralPct = totalMeetings > 0 ? Math.round((neutralCount / totalMeetings) * 100) : 0;
  const positivePct = totalMeetings > 0 ? Math.round((positiveCount / totalMeetings) * 100) : 0;

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 text-xs shadow-lg max-w-[220px]">
          <p className="font-semibold text-slate-300 font-mono">{data.dateString}</p>
          <p className="font-bold text-sm truncate mt-0.5">{data.title}</p>
          <p className="text-slate-400 mt-1">Contact: {data.contact}</p>
          <div className="flex gap-4 border-t border-slate-800 pt-2 mt-2 font-semibold">
            <span className="text-emerald-400">Sentiment: {data.sentiment}/10</span>
            <span className="text-blue-400">Engagement: {data.engagement}/10</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="sentiment-analysis-dashboard" className="space-y-6 pb-12">
      {/* Intro Metrics Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Avg Sentiment */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Average Sentiment</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 inline-block">{avgSentiment} <span className="text-slate-400 text-sm">/ 10</span></span>
            <span className="text-[10px] text-slate-500 block mt-1 cursor-none">General conversation tone</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-150">
            <Smile size={20} className="text-blue-500" />
          </div>
        </div>

        {/* Card 2: Avg Engagement */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Stakeholder Focus</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 inline-block">{avgEngagement} <span className="text-slate-400 text-sm">/ 10</span></span>
            <span className="text-[10px] text-slate-500 block mt-1">Audience attention & interaction</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-150">
            <TrendingUp size={20} className="text-blue-500" />
          </div>
        </div>

        {/* Card 3: Relational Health Index */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Network Health index</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1.5 inline-block">{healthIndexPercent}%</span>
            <span className="text-[10px] text-slate-500 block mt-1">Warm/Active contact ratio</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-150">
            <Heart size={20} className="text-emerald-500" />
          </div>
        </div>

        {/* Card 4: Total Logged interactions */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">System Database</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 inline-block">{totalMeetings} <span className="text-slate-400 text-sm">logs</span></span>
            <span className="text-[10px] text-slate-500 block mt-1">{contacts.length} professional profiles</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-150">
            <Users size={20} className="text-slate-500" />
          </div>
        </div>
      </div>

      {/* Main Graphs Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chronological engagement Trend AreaChart */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 flex flex-col h-[420px]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">Interactions Engagement Trends Over Time</h3>
            <p className="text-xs text-slate-400 mt-0.5">Dual timeline tracking relationship sentiment alignment versus audience attention indexes.</p>
          </div>

          <div className="flex-1 w-full text-xs font-mono">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Insufficient timelines recorded to render metric analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
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
                    formatter={(value) => <span className="text-xs capitalize font-sans text-slate-600 font-medium">{value} Grade</span>}
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

        {/* Sentiment Distribution Pie / Progress Bar Breakdown */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between h-[420px]">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">Sentiment Alignment Mix</h3>
            <p className="text-xs text-slate-400 mt-1">Breakdown distribution profile of registered conversations based on outcome grades.</p>
          </div>

          {/* Graphical custom bar lists */}
          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {totalMeetings === 0 ? (
              <p className="text-center text-slate-400 text-xs italic">No meeting logs logged.</p>
            ) : (
              <div className="space-y-4">
                {/* Positive (>= 8) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Positive Alignment (8-10)</span>
                    <span className="font-mono text-slate-900">{positiveCount} meetings ({positivePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positivePct}%` }} />
                  </div>
                </div>

                {/* Neutral (5-7) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Constructive Neutral (5-7)</span>
                    <span className="font-mono text-slate-900">{neutralCount} meetings ({neutralPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full" style={{ width: `${neutralPct}%` }} />
                  </div>
                </div>

                {/* Conflict/At Risk (< 5) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Impasse / At Risk (1-4)</span>
                    <span className="font-mono text-slate-900 text-rose-600 font-bold">{negativeCount} meetings ({negativePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${negativePct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-605">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-1">
              <Sparkles size={13} className="text-blue-600" /> Analytical Advice
            </h4>
            {negativeCount > 0 ? (
              <p className="leading-relaxed">
                You have <span className="text-rose-650 font-semibold">{negativeCount} at-risk interactions</span>. Use the <strong>AI Advisor</strong> to draft proactive win-win compromise proposals and mend these connections.
              </p>
            ) : totalMeetings > 0 ? (
              <p className="leading-relaxed">
                Relational sentiment is steady. Leverage your warm connections to requests recommendations or deepen strategic trust.
              </p>
            ) : (
              <p className="italic text-slate-400">Add meeting notes to unlock advisory analytics.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
