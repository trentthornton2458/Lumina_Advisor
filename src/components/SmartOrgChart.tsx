import React, { useMemo, useState } from 'react';
import { Contact, MyselfProfile } from '../types';
import {
  GitCommit, User, ChevronDown, ChevronRight, RefreshCw,
  Search, ShieldAlert, Award, Star, TrendingUp, HelpCircle, UserPlus, X
} from 'lucide-react';
import { SELF_NODE_ID, buildCompanyOrgChartContacts } from '../lib/orgChartUtils';

interface SmartOrgChartProps {
  companyId: string;
  companyName: string;
  contacts: Contact[];
  onUpdateContact: (contact: Contact) => void;
  selfProfile: MyselfProfile;
  selfPlacement?: { supervisorId?: string };
  onIncludeSelf: () => void;
  onRemoveSelf: () => void;
  onUpdateSelfSupervisor: (supervisorId: string | undefined) => void;
}

export default function SmartOrgChart({
  companyId,
  companyName,
  contacts,
  onUpdateContact,
  selfProfile,
  selfPlacement,
  onIncludeSelf,
  onRemoveSelf,
  onUpdateSelfSupervisor
}: SmartOrgChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Get contacts belonging to this company, plus a synthetic "Me" node if the
  // user has chosen to include themselves in this company's chart.
  const companyContacts = useMemo(() => {
    return buildCompanyOrgChartContacts(contacts, companyId, companyName, selfProfile, selfPlacement);
  }, [contacts, companyId, companyName, selfProfile, selfPlacement]);

  // Check if contact B is a descendant of contact A
  // This is used to prevent circular relationships when setting supervisorId
  const isDescendant = (parentCandidateId: string, childCandidateId: string): boolean => {
    if (parentCandidateId === childCandidateId) return true;
    let current = companyContacts.find(c => c.id === parentCandidateId);
    while (current && current.supervisorId) {
      if (current.supervisorId === childCandidateId) return true;
      current = companyContacts.find(c => c.id === current.supervisorId);
    }
    return false;
  };

  // Get valid supervisor options for a contact (all company contacts except self and descendants)
  const getSupervisorOptions = (contactId: string) => {
    return companyContacts.filter(c => c.id !== contactId && !isDescendant(c.id, contactId));
  };

  // Build mapping of supervisorId -> child contacts
  const { roots, childrenMap } = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    const contactIds = new Set(companyContacts.map(c => c.id));
    const rootsList: Contact[] = [];

    companyContacts.forEach(c => {
      if (c.supervisorId && contactIds.has(c.supervisorId)) {
        if (!map[c.supervisorId]) {
          map[c.supervisorId] = [];
        }
        map[c.supervisorId].push(c);
      } else {
        rootsList.push(c);
      }
    });

    return { roots: rootsList, childrenMap: map };
  }, [companyContacts]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSupervisorChange = (contactId: string, supervisorId: string) => {
    if (contactId === SELF_NODE_ID) {
      onUpdateSelfSupervisor(supervisorId || undefined);
      return;
    }
    const contact = companyContacts.find(c => c.id === contactId);
    if (contact) {
      const updatedContact: Contact = {
        ...contact,
        supervisorId: supervisorId || undefined
      };
      onUpdateContact(updatedContact);
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case 'Exceptional':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Good':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Neutral':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Bad':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBorderColor = (status?: string) => {
    switch (status) {
      case 'Exceptional': return 'border-blue-500';
      case 'Good': return 'border-emerald-500';
      case 'Neutral': return 'border-amber-400';
      case 'Bad': return 'border-rose-500 animate-pulse';
      default: return 'border-slate-300';
    }
  };

  // Filter company contacts matches for highlighting
  const highlightedContactIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();
    const query = searchTerm.toLowerCase();
    return new Set(
      companyContacts
        .filter(c => c.name.toLowerCase().includes(query) || c.position.toLowerCase().includes(query))
        .map(c => c.id)
    );
  }, [companyContacts, searchTerm]);

  // Recursively render node children
  const renderNode = (contact: Contact, level: number = 0) => {
    const children = childrenMap[contact.id] || [];
    const isExpanded = expandedNodes[contact.id] !== false; // default expanded
    const hasChildren = children.length > 0;
    const isHighlighted = highlightedContactIds.has(contact.id);
    const supervisorOptions = getSupervisorOptions(contact.id);
    const isSelf = contact.id === SELF_NODE_ID;

    return (
      <div key={contact.id} className="relative select-none">
        {/* Node Card */}
        <div className="flex items-start gap-4">
          {/* Connector horizontal line for nested levels */}
          {level > 0 && (
            <div className="absolute -left-6 top-6 w-6 h-[1px] bg-slate-200" />
          )}

          {/* Node body */}
          <div
            className={`w-full max-w-sm bg-white rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg ${
              isSelf
                ? 'border-amber-400 ring-4 ring-amber-400/15'
                : isHighlighted
                ? 'ring-4 ring-blue-500/20 border-blue-600 scale-[1.01]'
                : 'border-slate-100 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${isSelf ? 'bg-amber-50 text-amber-700 border-amber-200' : `${getStatusBgColor(contact.status)} ${getStatusBorderColor(contact.status)}`}`}>
                  {isSelf ? <Star size={16} /> : <User size={16} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{contact.name}</h4>
                  <p className="text-xs text-slate-550 truncate font-medium mt-0.5">{contact.position}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isSelf && (
                  <button
                    onClick={onRemoveSelf}
                    className="p-1 hover:bg-amber-50 text-amber-500 hover:text-amber-700 rounded-lg transition"
                    title="Remove yourself from this chart"
                    aria-label="Remove yourself from this chart"
                  >
                    <X size={14} />
                  </button>
                )}
                {/* Expand/Collapse Toggle if there are children */}
                {hasChildren && (
                  <button
                    onClick={() => toggleExpand(contact.id)}
                    className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>
            </div>

            {/* Tags and Relations info */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {isSelf ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                  You
                </span>
              ) : (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    contact.affiliation === 'Internal'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-150'
                      : 'bg-slate-50 text-slate-600 border-slate-150'
                  }`}>
                    {contact.affiliation || 'External'}
                  </span>
                  <span className="bg-slate-50 text-slate-550 border border-slate-150 px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {contact.relationStatus} Connection
                  </span>
                  {contact.status && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBgColor(contact.status)}`}>
                      Status: {contact.status}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Supervisor assignment dropdown selector */}
            <div className="mt-3.5 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
              <label htmlFor={`supervisor-select-${contact.id}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Supervisor
              </label>
              <select
                id={`supervisor-select-${contact.id}`}
                value={contact.supervisorId || ''}
                onChange={(e) => handleSupervisorChange(contact.id, e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-500 max-w-[180px]"
              >
                <option value="">None (Top Level)</option>
                {supervisorOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.position})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Children Rendered (Indented recursion) */}
        {hasChildren && isExpanded && (
          <div className="relative pl-10 mt-4 space-y-4">
            {/* vertical connector line linking children */}
            <div className="absolute left-4 top-0 bottom-6 w-[1px] bg-slate-200" />
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header controls inside tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <GitCommit size={16} className="text-blue-600 rotate-90" />
            Interactive Flow Chart & Organizational Hierarchy
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Map report lines and team hierarchy. Setting a supervisor automatically wires direct reports in a smart visual tree.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Self-placement toggle */}
          {selfPlacement === undefined ? (
            <button
              onClick={onIncludeSelf}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition"
            >
              <UserPlus size={14} />
              Add Myself
            </button>
          ) : (
            <span className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-xl">
              <Star size={14} />
              You're on this chart
            </span>
          )}

          {/* Search tool in Org Chart */}
          {companyContacts.length > 0 && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Highlight contact by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 transition"
              />
            </div>
          )}
        </div>
      </div>

      {companyContacts.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 p-12 text-center rounded-2xl italic text-xs text-slate-400">
          No contacts are linked to this company yet. Go to the Contact Manager tab to create contacts and associate them here.
        </div>
      ) : (
        <div className="flex flex-col gap-6 overflow-x-auto p-2">
          {roots.length === 0 && companyContacts.length > 0 ? (
            /* Cycle fallback or no roots */
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
              <ShieldAlert size={16} />
              <span>
                Circular reporting structures detected or no clear top-level executives. Try assigning at least one contact to "None (Top Level)" to break the loop and boot the org chart.
              </span>
            </div>
          ) : (
            roots.map(root => (
              <div key={root.id} className="border-b border-slate-50/50 pb-6 last:border-b-0">
                {renderNode(root)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
